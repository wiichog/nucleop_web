import { useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
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
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
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
import { DetailSheet } from "../components/DetailSheet";
import { PageError, PageLoading } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { Money, SectionLabel } from "../components/ui";
import { sortRecords } from "../lib/sortRecords";

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "gray" },
  ordered: { label: "Ordenada", color: "blue" },
  partial: { label: "Recibida parcial", color: "yellow" },
  received: { label: "Recibida", color: "teal" },
  cancelled: { label: "Anulada", color: "red" },
};

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
export function PurchaseOrdersPanel({ gymId }: { gymId: string }) {
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

  // Ficha + recepción.
  const [abierta, setAbierta] = useState<string>("");
  const detalle = useErpPurchaseOrder(gymId, abierta);
  const [recibido, setRecibido] = useState<Record<string, number | string>>({});
  const [actualizarCosto, setActualizarCosto] = useState(true);
  const [notaRecepcion, setNotaRecepcion] = useState("");

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ErpPurchaseOrder>>({
    columnAccessor: "created_at",
    direction: "desc",
  });

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
    const reason = window.prompt("Motivo de la anulación de la orden:", "");
    if (reason === null) return;
    try {
      await anular.mutateAsync({ id: orden.id, reason });
      notifications.show({
        color: "teal",
        message: "Orden anulada. Lo ya recibido se queda en el inventario.",
      });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo anular la orden.") });
    }
  };

  const orden = detalle.data;
  const puedeRecibir = !!orden && ["draft", "ordered", "partial"].includes(orden.status);

  return (
    <div>
      {orders.isError && <PageError onRetry={() => orders.refetch()} />}

      <GlassCard padding={20} delay={0.6} style={{ marginBottom: "calc(16 * var(--u))" }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <div>
            <SectionLabel as="h2" mb={6}>Órdenes de compra</SectionLabel>
            <Text c="dimmed" size="sm">
              Lo que le pediste a cada proveedor. Al marcar la recepción, el stock entra solo con
              el costo real de la compra.
            </Text>
          </div>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => setCreando(true)}
            disabled={!supplierData.length}
          >
            Nueva orden
          </Button>
        </Group>
        {!supplierData.length && !suppliers.isLoading && (
          <Alert color="yellow" variant="light" mt="md">
            Primero da de alta un proveedor en la pestaña «Proveedores».
          </Alert>
        )}
      </GlassCard>

      <GlassCard padding={16} delay={0.72} style={{ marginBottom: "calc(16 * var(--u))" }}>
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Estado"
            placeholder="Todos"
            value={estado}
            onChange={setEstado}
            clearable
            w={{ base: "100%", sm: 220 }}
            data={Object.entries(PO_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />
          <Select
            label="Proveedor"
            placeholder="Todos"
            value={proveedorFiltro}
            onChange={setProveedorFiltro}
            clearable
            searchable
            w={{ base: "100%", sm: 260 }}
            data={supplierData}
          />
        </Group>
      </GlassCard>

      <SectionLabel as="h2" mb="xs">Historial de órdenes</SectionLabel>
      <GlassCard padding={14} delay={0.84}>
        <DataTable<ErpPurchaseOrder>
          minHeight={160}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(orders.data ?? [], sortStatus)}
          fetching={orders.isLoading}
          noRecordsText="Sin órdenes de compra todavía."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "supplier_name", title: "Proveedor", sortable: true },
            {
              accessor: "reference",
              title: "Referencia",
              sortable: true,
              render: (o) => o.reference || "—",
            },
            {
              accessor: "status",
              title: "Estado",
              sortable: true,
              render: (o) => {
                const s = PO_STATUS[o.status] ?? { label: o.status, color: "gray" };
                return (
                  <Badge color={s.color} variant="light">
                    {s.label}
                  </Badge>
                );
              },
            },
            {
              accessor: "total",
              title: "Total",
              sortable: true,
              textAlign: "right",
              render: (o) => <Money value={o.total} decimals={2} block />,
            },
            {
              accessor: "received_total",
              title: "Recibido",
              textAlign: "right",
              render: (o) => <Money value={o.received_total} decimals={2} block />,
            },
            {
              accessor: "expected_on",
              title: "Llega",
              sortable: true,
              render: (o) => o.expected_on || "—",
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (o) => (
                <RowActions
                  actions={[
                    {
                      label: ["draft", "ordered", "partial"].includes(o.status)
                        ? "Recibir"
                        : "Ver",
                      onClick: () => abrirFicha(o),
                    },
                    ["draft", "ordered", "partial"].includes(o.status) && {
                      label: "Anular",
                      color: "red",
                      variant: "subtle" as const,
                      onClick: () => onAnular(o),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </GlassCard>

      {/* Ficha de la orden + recepción de mercadería. */}
      <DetailSheet
        opened={!!abierta}
        onClose={() => setAbierta("")}
        title={orden ? `Orden · ${orden.supplier_name}` : "Orden de compra"}
        size={560}
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

            <SectionLabel as="h2" mt="xs">Productos</SectionLabel>
            <Table>
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
                          w={92}
                          min={0}
                          max={l.pending_qty}
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

            {puedeRecibir && (
              <>
                <Switch
                  label="Actualizar el costo del producto con esta compra"
                  description="Deja el costo del catálogo al día para que el margen no mienta."
                  checked={actualizarCosto}
                  onChange={(e) => setActualizarCosto(e.currentTarget.checked)}
                  mt="xs"
                />
                <TextInput
                  label="Nota de la recepción"
                  placeholder="Ej. llegaron 2 cajas golpeadas"
                  value={notaRecepcion}
                  onChange={(e) => setNotaRecepcion(e.currentTarget.value)}
                />
                <Group justify="flex-end" gap="sm">
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
              </>
            )}
          </Stack>
        )}
      </DetailSheet>

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
            description="Sin marcar queda como borrador (todavía la puedes editar creándola de nuevo)."
            checked={yaOrdenada}
            onChange={(e) => setYaOrdenada(e.currentTarget.checked)}
          />

          <SectionLabel as="h2" mt="xs">Productos</SectionLabel>
          <Stack gap="xs">
            {lineas.map((l, i) => (
              <Group key={i} gap="xs" align="flex-end" wrap="nowrap">
                <Select
                  label={i === 0 ? "Producto" : undefined}
                  placeholder="Elige…"
                  value={l.product_id}
                  onChange={(v) =>
                    setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, product_id: v } : x)))
                  }
                  data={productData}
                  searchable
                  style={{ flex: 1, minWidth: 0 }}
                />
                <NumberInput
                  label={i === 0 ? "Cant." : undefined}
                  w={90}
                  min={1}
                  value={l.qty}
                  onChange={(v) =>
                    setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, qty: v } : x)))
                  }
                />
                <TextInput
                  label={i === 0 ? "Costo (Q)" : undefined}
                  w={110}
                  placeholder="Del catálogo"
                  value={l.unit_cost}
                  onChange={(e) =>
                    setLineas((ls) =>
                      ls.map((x, j) => (j === i ? { ...x, unit_cost: e.currentTarget.value } : x)),
                    )
                  }
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
    </div>
  );
}
