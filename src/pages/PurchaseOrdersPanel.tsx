import { useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { Plus, Trash2 } from "lucide-react";
import {
  useBranches,
  useCancelErpPurchaseOrder,
  useCreateErpPurchaseOrder,
  useErpProducts,
  useErpPurchaseOrder,
  useErpPurchaseOrders,
  useErpSuppliers,
  useReceiveErpPurchaseOrder,
} from "../api/hooks";
import type { ErpPurchaseOrder, PurchaseOrderStatus } from "../api/types";
import { PageError, PageLoading } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { Money } from "../components/ui";

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "gray" },
  ordered: { label: "Ordenada", color: "blue" },
  partial: { label: "Recibida parcial", color: "yellow" },
  received: { label: "Recibida", color: "teal" },
  cancelled: { label: "Anulada", color: "red" },
};

/** Las que aún esperan mercadería: se pueden recibir o anular. */
const ABIERTAS: PurchaseOrderStatus[] = ["draft", "ordered", "partial"];

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : undefined);

/** Línea del formulario de alta (aún sin id: la orden no existe). */
interface LineaNueva {
  product_id: string | null;
  qty: number | string;
  unit_cost: string;
}

const LINEA_VACIA: LineaNueva = { product_id: null, qty: 1, unit_cost: "" };

/**
 * Órdenes de compra a proveedor. Recibir una orden es lo que CARGA el stock: el
 * movimiento de inventario se genera en el backend con el costo real de la
 * compra, así que aquí nunca se toca `stock_qty` a mano.
 */
export function PurchaseOrdersPanel({
  gymId,
  onIrAProveedores,
}: {
  gymId: string;
  /** Sin proveedores no hay orden posible: el aviso lleva a darlos de alta. */
  onIrAProveedores?: () => void;
}) {
  const [estado, setEstado] = useState<string | null>("");
  const [proveedorFiltro, setProveedorFiltro] = useState<string | null>("");
  const orders = useErpPurchaseOrders(gymId, {
    status: (estado || undefined) as PurchaseOrderStatus | undefined,
    supplier: proveedorFiltro || undefined,
  });
  const suppliers = useErpSuppliers(gymId, { is_active: true });
  const products = useErpProducts(gymId);
  const branches = useBranches(gymId);
  const crear = useCreateErpPurchaseOrder(gymId);
  const recibir = useReceiveErpPurchaseOrder(gymId);
  const anular = useCancelErpPurchaseOrder(gymId);

  const [creando, setCreando] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>("");
  const [reference, setReference] = useState("");
  const [expectedOn, setExpectedOn] = useState<Date | null>(null);
  const [orderedOn, setOrderedOn] = useState<Date | null>(new Date());
  const [note, setNote] = useState("");
  const [yaOrdenada, setYaOrdenada] = useState(true);
  const [lineas, setLineas] = useState<LineaNueva[]>([{ ...LINEA_VACIA }]);

  // Ficha + recepción + anulación.
  const [abierta, setAbierta] = useState<string>("");
  const detalle = useErpPurchaseOrder(gymId, abierta);
  const [recibido, setRecibido] = useState<Record<string, number | string>>({});
  const [actualizarCosto, setActualizarCosto] = useState(true);
  const [notaRecepcion, setNotaRecepcion] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  const supplierData = useMemo(
    () => (suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [suppliers.data],
  );
  const productData = useMemo(
    () =>
      (products.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.name} (stock ${p.stock_qty})`,
      })),
    [products.data],
  );
  const branchData = useMemo(
    () => (branches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches.data],
  );

  const totalEstimado = lineas.reduce(
    (acc, l) => acc + (Number(l.qty) || 0) * (Number(l.unit_cost) || 0),
    0,
  );

  const resetAlta = () => {
    setSupplierId(null);
    setBranchId("");
    setReference("");
    setExpectedOn(null);
    setOrderedOn(new Date());
    setNote("");
    setYaOrdenada(true);
    setLineas([{ ...LINEA_VACIA }]);
  };

  const onCrear = async () => {
    const lineasValidas = lineas
      .filter((l) => l.product_id && Number(l.qty) > 0)
      .map((l) => ({
        product_id: l.product_id as string,
        qty: Number(l.qty),
        unit_cost: l.unit_cost || undefined,
      }));
    if (!supplierId || !lineasValidas.length) return;
    try {
      await crear.mutateAsync({
        supplier_id: supplierId,
        branch_id: branchId || null,
        status: yaOrdenada ? "ordered" : "draft",
        reference,
        expected_on: iso(expectedOn),
        ordered_on: yaOrdenada ? iso(orderedOn) : undefined,
        note,
        lines: lineasValidas,
      });
      notifications.show({ color: "teal", message: "Orden de compra creada." });
      setCreando(false);
      resetAlta();
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear la orden.") });
    }
  };

  const abrirFicha = (o: ErpPurchaseOrder) => {
    setAbierta(o.id);
    setRecibido({});
    setActualizarCosto(true);
    setNotaRecepcion("");
    setAnulando(false);
    setMotivoAnulacion("");
  };

  const onRecibir = async (orden: ErpPurchaseOrder, todo: boolean) => {
    const items = todo
      ? []
      : orden.lines
          .map((l) => ({ line_id: l.id, qty: Number(recibido[l.id]) || 0 }))
          .filter((i) => i.qty > 0);
    if (!todo && !items.length) {
      notifications.show({ color: "red", message: "Indica cuántas unidades llegaron." });
      return;
    }
    try {
      await recibir.mutateAsync({
        id: orden.id,
        items,
        update_cost: actualizarCosto,
        note: notaRecepcion,
      });
      setRecibido({});
      setNotaRecepcion("");
      notifications.show({
        color: "teal",
        message: "Mercadería recibida: el stock ya entró con su costo real.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo recibir la mercadería."),
      });
    }
  };

  const onAnular = async (orden: ErpPurchaseOrder) => {
    try {
      await anular.mutateAsync({ id: orden.id, reason: motivoAnulacion.trim() });
      setAnulando(false);
      setMotivoAnulacion("");
      notifications.show({
        color: "teal",
        message: "Orden anulada. Lo ya recibido se queda en el inventario.",
      });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo anular la orden.") });
    }
  };

  const orden = detalle.data;
  const puedeRecibir = !!orden && ABIERTAS.includes(orden.status);

  // Lo que falta por llegar va primero; dentro de cada grupo, lo más reciente.
  const filas = (orders.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(ABIERTAS.includes(b.status)) - Number(ABIERTAS.includes(a.status)) ||
        b.created_at.localeCompare(a.created_at),
    );
  const porRecibir = (orders.data ?? []).filter((o) => ABIERTAS.includes(o.status)).length;
  const sinProveedores = !supplierData.length && !suppliers.isLoading;

  if (orders.isError) return <PageError onRetry={() => orders.refetch()} />;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Compras"
        avisos={
          porRecibir > 0 && (
            <Badge color="yellow" variant="light">
              {porRecibir} por recibir
            </Badge>
          )
        }
      >
        <Select
          aria-label="Estado"
          placeholder="Todos los estados"
          value={estado}
          onChange={setEstado}
          clearable
          w={{ base: "100%", sm: 180 }}
          data={Object.entries(PO_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
        {supplierData.length > 1 && (
          <Select
            aria-label="Proveedor"
            placeholder="Todos los proveedores"
            value={proveedorFiltro}
            onChange={setProveedorFiltro}
            clearable
            searchable
            w={{ base: "100%", sm: 200 }}
            data={supplierData}
          />
        )}
        <Button onClick={() => setCreando(true)} disabled={!supplierData.length}>
          Nueva orden
        </Button>
      </Encabezado>
      {sinProveedores && (
        <Text
          size="sm"
          mb="sm"
          c="var(--mantine-color-yellow-light-color)"
          component={onIrAProveedores ? "button" : "p"}
          onClick={onIrAProveedores}
          style={onIrAProveedores ? { cursor: "pointer", textDecoration: "underline", background: "none", border: 0, padding: 0 } : undefined}
        >
          Primero agrega un proveedor →
        </Text>
      )}

      {orders.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : filas.length === 0 ? (
        <Text c="dimmed" size="sm" py="md">
          {estado || proveedorFiltro ? "Ninguna orden con ese filtro." : "Sin órdenes de compra todavía."}
        </Text>
      ) : (
        <Stack gap={6}>
          {filas.map((o) => {
            const s = PO_STATUS[o.status] ?? { label: o.status, color: "gray" };
            const abiertaO = ABIERTAS.includes(o.status);
            return (
              <Tarjeta
                key={o.id}
                etiqueta={`Orden de ${o.supplier_name}${o.reference ? `, ${o.reference}` : ""}`}
                onClick={() => abrirFicha(o)}
                aviso={abiertaO}
                apagada={o.status === "cancelled"}
              >
                <Group gap="sm" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {o.supplier_name}
                      {o.reference && (
                        <Text span c="dimmed" fw={400}>
                          {" · "}
                          {o.reference}
                        </Text>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {abiertaO
                        ? o.expected_on
                          ? `Llega el ${o.expected_on}`
                          : "Sin fecha de llegada"
                        : o.ordered_on
                          ? `Ordenada el ${o.ordered_on}`
                          : `Creada el ${o.created_at.slice(0, 10)}`}
                      {o.status === "partial" ? ` · recibido ${fmtQ(o.received_total, { decimals: 2 })}` : ""}
                    </Text>
                  </div>
                  <Badge size="sm" color={s.color} variant="light">
                    {s.label}
                  </Badge>
                  <Text size="sm" fw={600} w={96} ta="right" className="a-tabular">
                    <Money value={o.total} decimals={2} />
                  </Text>
                </Group>
              </Tarjeta>
            );
          })}
        </Stack>
      )}

      {/* Ficha de la orden: recepción de mercadería y anulación. */}
      <Modal
        opened={!!abierta}
        onClose={() => setAbierta("")}
        title={orden ? `Orden · ${orden.supplier_name}` : "Orden de compra"}
        size="lg"
        centered
      >
        {detalle.isError ? (
          <PageError onRetry={() => detalle.refetch()} />
        ) : !orden ? (
          <PageLoading label="Trayendo la orden…" />
        ) : (
          <Stack gap="md">
            <Group justify="space-between">
              <Badge
                color={(PO_STATUS[orden.status] ?? { color: "gray" }).color}
                variant="light"
              >
                {(PO_STATUS[orden.status] ?? { label: orden.status }).label}
              </Badge>
              <Money value={orden.total} decimals={2} />
            </Group>
            <Text c="dimmed" size="sm">
              {orden.reference ? `Ref. ${orden.reference} · ` : ""}
              {orden.ordered_on ? `Ordenada el ${orden.ordered_on}` : "Sin fecha de orden"}
              {orden.expected_on ? ` · llega el ${orden.expected_on}` : ""}
            </Text>
            {orden.note && <Text size="sm">{orden.note}</Text>}
            {orden.cancel_reason && (
              <Alert color="gray" variant="light" title="Orden anulada">
                <Text size="sm">{orden.cancel_reason}</Text>
              </Alert>
            )}

            <Table.ScrollContainer minWidth={puedeRecibir ? 420 : 320}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Producto</Table.Th>
                    <Table.Th ta="right">Pedido</Table.Th>
                    <Table.Th ta="right">Recibido</Table.Th>
                    {puedeRecibir && <Table.Th ta="right">Llegó</Table.Th>}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {orden.lines.map((l) => (
                    <Table.Tr key={l.id}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {l.product_name}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {fmtQ(l.unit_cost, { decimals: 2 })} c/u
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right" className="a-tabular">
                        {l.qty}
                      </Table.Td>
                      <Table.Td ta="right" className="a-tabular">
                        {l.received_qty}
                      </Table.Td>
                      {puedeRecibir && (
                        <Table.Td ta="right">
                          <NumberInput
                            w={84}
                            min={0}
                            max={l.pending_qty}
                            aria-label={`Llegó de ${l.product_name}`}
                            placeholder={String(l.pending_qty)}
                            value={recibido[l.id] ?? ""}
                            onChange={(v) => setRecibido((r) => ({ ...r, [l.id]: v }))}
                            disabled={l.pending_qty <= 0}
                          />
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            {puedeRecibir && (
              <>
                <Switch
                  label="Actualizar el costo del producto con esta compra"
                  checked={actualizarCosto}
                  onChange={(e) => setActualizarCosto(e.currentTarget.checked)}
                />
                <TextInput
                  label="Nota de la recepción"
                  placeholder="Llegaron 2 cajas golpeadas"
                  value={notaRecepcion}
                  onChange={(e) => setNotaRecepcion(e.currentTarget.value)}
                />
                <Group justify="flex-end" gap="sm" wrap="wrap">
                  <Button
                    variant="default"
                    onClick={() => onRecibir(orden, false)}
                    loading={recibir.isPending}
                  >
                    Recibir lo indicado
                  </Button>
                  <Button onClick={() => onRecibir(orden, true)} loading={recibir.isPending}>
                    Recibir todo lo pendiente
                  </Button>
                </Group>

                <Divider />
                {anulando ? (
                  <Group gap="xs" align="flex-end" wrap="wrap">
                    <TextInput
                      label="Motivo de la anulación"
                      placeholder="Opcional"
                      value={motivoAnulacion}
                      onChange={(e) => setMotivoAnulacion(e.currentTarget.value)}
                      style={{ flex: 1, minWidth: 200 }}
                      data-autofocus
                    />
                    <Button variant="default" onClick={() => setAnulando(false)}>
                      No anular
                    </Button>
                    <Button color="red" loading={anular.isPending} onClick={() => onAnular(orden)}>
                      Anular orden
                    </Button>
                  </Group>
                ) : (
                  <Group justify="flex-start">
                    <Button variant="subtle" color="red" onClick={() => setAnulando(true)}>
                      Anular
                    </Button>
                  </Group>
                )}
              </>
            )}
          </Stack>
        )}
      </Modal>

      {/* Alta de la orden. */}
      <Modal
        opened={creando}
        onClose={() => setCreando(false)}
        title="Nueva orden de compra"
        size="lg"
        centered
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Proveedor"
              placeholder="Elige…"
              value={supplierId}
              onChange={setSupplierId}
              data={supplierData}
              searchable
            />
            <TextInput
              label="Referencia"
              placeholder="No. de factura o pedido"
              value={reference}
              onChange={(e) => setReference(e.currentTarget.value)}
            />
            <DateInput
              label="Fecha de la orden"
              value={orderedOn}
              onChange={setOrderedOn}
              valueFormat="YYYY-MM-DD"
              clearable
              popoverProps={{ withinPortal: true }}
            />
            <DateInput
              label="Fecha estimada de llegada"
              value={expectedOn}
              onChange={setExpectedOn}
              valueFormat="YYYY-MM-DD"
              clearable
              popoverProps={{ withinPortal: true }}
            />
            {branchData.length > 0 && (
              <Select
                label="Sede"
                placeholder="Todas"
                value={branchId}
                onChange={setBranchId}
                data={branchData}
                clearable
              />
            )}
            <TextInput
              label="Nota"
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
            />
          </SimpleGrid>

          <Switch
            label="Ya está ordenada al proveedor"
            checked={yaOrdenada}
            onChange={(e) => setYaOrdenada(e.currentTarget.checked)}
          />

          <Text fw={700} size="sm" mt="xs">
            Productos
          </Text>
          <Stack gap="xs">
            {lineas.map((l, i) => (
              // En celular el producto ocupa su renglón y cantidad + costo bajan al siguiente.
              <Group key={i} gap="xs" align="flex-end" wrap="wrap">
                <Select
                  label={i === 0 ? "Producto" : undefined}
                  aria-label={i === 0 ? undefined : "Producto"}
                  placeholder="Elige…"
                  value={l.product_id}
                  onChange={(v) =>
                    setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, product_id: v } : x)))
                  }
                  data={productData}
                  searchable
                  style={{ flex: "1 1 200px", minWidth: 0 }}
                />
                <NumberInput
                  label={i === 0 ? "Cant." : undefined}
                  aria-label={i === 0 ? undefined : "Cantidad"}
                  w={84}
                  min={1}
                  value={l.qty}
                  onChange={(v) =>
                    setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, qty: v } : x)))
                  }
                />
                <TextInput
                  label={i === 0 ? "Costo (Q)" : undefined}
                  aria-label={i === 0 ? undefined : "Costo (Q)"}
                  inputMode="decimal"
                  w={110}
                  placeholder="Del catálogo"
                  value={l.unit_cost}
                  onChange={(e) => {
                    // El valor se lee ANTES del setter, nunca dentro del updater: React
                    // anula `currentTarget` al terminar el handler y el updater puede correr
                    // después (ver el comentario en InventoryPage). Leerlo ahí tumba la
                    // página al escribir rápido en «Costo (Q)».
                    const valor = e.currentTarget.value;
                    setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, unit_cost: valor } : x)));
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Quitar línea"
                  mb={4}
                  onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                  disabled={lineas.length === 1}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
          <Group justify="space-between">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<Plus size={14} />}
              onClick={() => setLineas((ls) => [...ls, { ...LINEA_VACIA }])}
            >
              Agregar producto
            </Button>
            <Text c="dimmed" size="sm">
              Estimado: {fmtQ(totalEstimado, { decimals: 2 })}
            </Text>
          </Group>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onCrear}
              loading={crear.isPending}
              disabled={!supplierId || !lineas.some((l) => l.product_id && Number(l.qty) > 0)}
            >
              Crear orden
            </Button>
          </Group>
        </Stack>
      </Modal>
    </GlassCard>
  );
}
