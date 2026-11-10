import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import {
  useApproveOrderReturn,
  useGymProductOrders,
  useGymShippingConfig,
  useRefundProductOrder,
  useRejectOrderReturn,
  useUpdateGymShippingConfig,
  useUpdateProductOrder,
} from "../api/hooks";
import type { ProductOrder, ProductOrderStatus } from "../api/types";
import { PageError } from "../components/PageStatus";
import { Money } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado, nombreCorto, Tarjeta } from "../components/Tarjeta";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pago pendiente", color: "gray" },
  reserved: { label: "Apartado", color: "grape" },
  paid: { label: "Pagado", color: "yellow" },
  preparing: { label: "Preparando", color: "cyan" },
  shipped: { label: "En camino", color: "blue" },
  delivered: { label: "Entregado", color: "teal" },
  cancelled: { label: "Cancelado", color: "gray" },
  returned: { label: "Devuelto", color: "orange" },
};

/** Transiciones que el backend acepta desde cada estado (`TRANSICIONES_ENTREGA`). */
const SIGUIENTES: Record<string, ProductOrderStatus[]> = {
  pending_payment: ["cancelled"],
  reserved: ["preparing", "shipped", "delivered", "cancelled"],
  paid: ["preparing", "shipped", "delivered", "cancelled"],
  preparing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
};

/** Estados en los que el pedido ya se cobró y por tanto se puede devolver. */
const PAGADOS = ["paid", "preparing", "shipped", "delivered"];

/** Lo que falta por entregar. «Pagado» es lo nuevo: nadie lo ha tocado todavía. */
const EN_CURSO = ["paid", "reserved", "preparing", "shipped"];

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const resumen = (o: ProductOrder) =>
  `${o.product_name}${o.items_count > 1 ? ` +${o.items_count - 1} más` : ` × ${o.qty}`}`;

/**
 * Pedidos de la tienda del app: lo que falta entregar va al frente, las
 * devoluciones que pidió un atleta arriba en amarillo, y tocar un pedido abre su
 * detalle con los pasos que le tocan. El reembolso devuelve la BASE del gym; el
 * recargo de Nucleo nunca se reembolsa.
 */
export function StoreOrdersPanel({ gymId }: { gymId: string }) {
  const qc = useQueryClient();
  // "curso" = lo que falta entregar (filtro local) · "" = todos · un estado = filtro del servidor.
  const [filtro, setFiltro] = useState<string>("curso");
  const estadoServidor = filtro && filtro !== "curso" ? (filtro as ProductOrderStatus) : undefined;
  const orders = useGymProductOrders(gymId, { status: estadoServidor });
  const devoluciones = useGymProductOrders(gymId, { return_status: "requested" });
  const updateOrder = useUpdateProductOrder(gymId);
  const refundOrder = useRefundProductOrder(gymId);

  const [abierto, setAbierto] = useState<ProductOrder | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [tracking, setTracking] = useState("");

  const todos = orders.data ?? [];
  const pendientes = devoluciones.data ?? [];
  const filas = (filtro === "curso" ? todos.filter((o) => EN_CURSO.includes(o.status)) : todos)
    .slice()
    .sort(
      (a, b) =>
        Number(b.status === "paid") - Number(a.status === "paid") || b.created_at.localeCompare(a.created_at),
    );
  // Con un estado elegido la lista ya no trae todo: el contador solo sale cuando es fiel.
  const nuevos = estadoServidor ? null : todos.filter((o) => o.status === "paid").length;
  // La versión fresca del pedido (tras «Preparando» cambia de estado) o la que se abrió.
  const ficha = abierto ? ([...todos, ...pendientes].find((o) => o.id === abierto.id) ?? abierto) : null;

  /**
   * Un reembolso es un Payment NEGATIVO por la pasarela: cambia el neto del
   * estado de cuenta del gym y lo que ganó Nucleo. Sin esto el gym devolvía un
   * pedido y en Membresías seguía leyendo la cifra vieja hasta recargar.
   */
  const refrescarEstadoDeCuenta = () => {
    qc.invalidateQueries({ queryKey: ["billing-statement", gymId] });
    qc.invalidateQueries({ queryKey: ["platform-statements"] });
  };

  const avanzar = (o: ProductOrder, status: ProductOrderStatus, tracking_code?: string) => {
    updateOrder.mutate(
      { id: o.id, status: status as "preparing" | "shipped" | "delivered" | "cancelled", tracking_code },
      {
        onSuccess: () => {
          setEnviando(false);
          notifications.show({
            color: "teal",
            message: `Pedido marcado como «${ORDER_STATUS[status]?.label ?? status}».`,
          });
        },
        onError: (error) =>
          notifications.show({ color: "red", message: errMsg(error, "No se pudo actualizar el pedido.") }),
      },
    );
  };

  const cancelar = (o: ProductOrder) => {
    if (!window.confirm(`¿Cancelar el pedido de ${o.athlete_name}?`)) return;
    avanzar(o, "cancelled");
  };

  const onRefund = (o: ProductOrder) => {
    if (
      !window.confirm(
        `Devolver el pedido de ${o.athlete_name}. Se reembolsa ${fmtQ(o.total, { decimals: 2 })} (precio del gym); el recargo de Nucleo NO se reembolsa. El dinero se entrega por fuera. ¿Continuar?`,
      )
    )
      return;
    refundOrder.mutate(o.id, {
      onSuccess: () => {
        refrescarEstadoDeCuenta();
        notifications.show({ color: "teal", message: "Pedido devuelto: se registró el reembolso y el stock regresó." });
      },
      onError: (error) => notifications.show({ color: "red", message: errMsg(error, "No se pudo devolver el pedido.") }),
    });
  };

  const abrir = (o: ProductOrder) => {
    setAbierto(o);
    setEnviando(false);
    setTracking(o.tracking_code ?? "");
  };

  if (orders.isError) return <PageError onRetry={() => orders.refetch()} />;

  const siguientes = ficha ? (SIGUIENTES[ficha.status] ?? []) : [];

  return (
    <Stack gap="lg">
      {pendientes.length > 0 && (
        <GlassCard delay={0.6} padding={18}>
          <Encabezado
            titulo="Devoluciones"
            avisos={
              <Badge color="yellow" variant="light">
                {pendientes.length} por resolver
              </Badge>
            }
          />
          <Stack gap={6}>
            {pendientes.map((o) => (
              <Devolucion key={o.id} o={o} gymId={gymId} onAbrir={() => abrir(o)} onAprobada={refrescarEstadoDeCuenta} />
            ))}
          </Stack>
        </GlassCard>
      )}

      <GlassCard delay={0.7} padding={18}>
        <Encabezado
          titulo="Pedidos"
          avisos={
            nuevos ? (
              <Badge color="yellow" variant="light">
                {nuevos} {nuevos === 1 ? "nuevo" : "nuevos"}
              </Badge>
            ) : null
          }
        >
          <Select
            aria-label="Estado"
            value={filtro}
            onChange={(v) => setFiltro(v ?? "curso")}
            allowDeselect={false}
            w={{ base: "100%", sm: 180 }}
            data={[
              { value: "curso", label: "Por entregar" },
              { value: "", label: "Todos" },
              ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label })),
            ]}
          />
          <EnviosBoton gymId={gymId} />
        </Encabezado>

        {orders.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : filas.length === 0 ? (
          <Text c="dimmed" size="sm" py="md">
            {filtro === "curso"
              ? "Nada por entregar."
              : filtro
                ? "Ningún pedido en ese estado."
                : "Sin pedidos todavía. Activa productos en la tienda del app para que tus atletas compren."}
          </Text>
        ) : (
          <Stack gap={6}>
            {filas.map((o) => {
              const s = ORDER_STATUS[o.status] ?? { label: o.status, color: "gray" };
              const nuevo = o.status === "paid";
              return (
                <Tarjeta
                  key={o.id}
                  etiqueta={`Pedido de ${o.athlete_name}: ${resumen(o)}`}
                  onClick={() => abrir(o)}
                  aviso={nuevo}
                  apagada={o.status === "cancelled"}
                >
                  <Group gap="sm" wrap="nowrap">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {nombreCorto(o.athlete_name)}
                        <Text span c="dimmed" fw={400}>
                          {" · "}
                          {resumen(o)}
                        </Text>
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {o.delivery_method === "shipping" ? "Envío" : "En el gym"}
                        {[o.size && `Talla ${o.size}`, o.color].filter(Boolean).map((x) => ` · ${x}`)}
                        {" · "}
                        {fecha(o.created_at)}
                      </Text>
                    </div>
                    {o.return_status === "requested" && (
                      <Badge size="sm" color="orange" variant="light" visibleFrom="xs">
                        Devolución
                      </Badge>
                    )}
                    <Badge size="sm" color={s.color} variant="light">
                      {s.label}
                    </Badge>
                    <Text size="sm" fw={600} w={88} ta="right" className="a-tabular">
                      <Money value={o.total} decimals={2} />
                    </Text>
                  </Group>
                </Tarjeta>
              );
            })}
          </Stack>
        )}
      </GlassCard>

      {/* El pedido: sus pasos arriba; productos, envío y bitácora debajo. */}
      <Modal
        opened={!!ficha}
        onClose={() => setAbierto(null)}
        title={ficha ? `Pedido · ${nombreCorto(ficha.athlete_name)}` : "Pedido"}
        centered
        size="md"
      >
        {ficha && (
          <Stack gap="sm">
            <Group justify="space-between">
              <Badge color={(ORDER_STATUS[ficha.status] ?? { color: "gray" }).color} variant="light">
                {(ORDER_STATUS[ficha.status] ?? { label: ficha.status }).label}
              </Badge>
              <Text size="xs" c="dimmed">
                {fecha(ficha.created_at)}
              </Text>
            </Group>

            {enviando ? (
              <Group gap="xs" align="flex-end" wrap="wrap">
                <TextInput
                  label="Guía o rastreo"
                  placeholder="Opcional"
                  value={tracking}
                  onChange={(e) => setTracking(e.currentTarget.value)}
                  style={{ flex: 1, minWidth: 180 }}
                  data-autofocus
                />
                <Button variant="default" onClick={() => setEnviando(false)}>
                  Volver
                </Button>
                <Button loading={updateOrder.isPending} onClick={() => avanzar(ficha, "shipped", tracking.trim())}>
                  Marcar enviado
                </Button>
              </Group>
            ) : (
              (siguientes.length > 0 || PAGADOS.includes(ficha.status)) && (
                <Group gap="xs" wrap="wrap">
                  {siguientes.includes("preparing") && (
                    <Button size="xs" variant="light" loading={updateOrder.isPending} onClick={() => avanzar(ficha, "preparing")}>
                      Preparando
                    </Button>
                  )}
                  {siguientes.includes("shipped") && ficha.delivery_method === "shipping" && (
                    <Button size="xs" variant="light" onClick={() => setEnviando(true)}>
                      Enviar
                    </Button>
                  )}
                  {siguientes.includes("delivered") && (
                    <Button size="xs" loading={updateOrder.isPending} onClick={() => avanzar(ficha, "delivered")}>
                      Entregado
                    </Button>
                  )}
                  {PAGADOS.includes(ficha.status) && ficha.return_status !== "requested" && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="orange"
                      loading={refundOrder.isPending && refundOrder.variables === ficha.id}
                      onClick={() => onRefund(ficha)}
                    >
                      Devolver
                    </Button>
                  )}
                  {siguientes.includes("cancelled") && (
                    <Button size="xs" variant="subtle" color="red" onClick={() => cancelar(ficha)}>
                      Cancelar pedido
                    </Button>
                  )}
                </Group>
              )
            )}

            <Divider />
            <Table verticalSpacing={4}>
              <Table.Tbody>
                {(ficha.lines ?? []).map((l) => (
                  <Table.Tr key={l.id}>
                    <Table.Td>
                      <Text size="sm">
                        {l.product_name} × {l.qty}
                      </Text>
                      {(l.size || l.color) && (
                        <Text c="dimmed" size="xs">
                          {[l.size && `Talla ${l.size}`, l.color].filter(Boolean).join(" · ")}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Money value={l.subtotal} decimals={2} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {Number(ficha.shipping_cost) > 0 && (
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Envío
                </Text>
                <Money value={ficha.shipping_cost} decimals={2} fw={500} />
              </Group>
            )}
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Total del gym
              </Text>
              <Money value={ficha.total} decimals={2} />
            </Group>
            {Number(ficha.surcharge) > 0 && (
              <Text c="dimmed" size="xs">
                El atleta pagó {fmtQ(ficha.total_charged, { decimals: 2 })} (recargo de Nucleo{" "}
                {fmtQ(ficha.surcharge, { decimals: 2 })}).
              </Text>
            )}

            {ficha.delivery_method === "shipping" ? (
              <div>
                <Title order={6} mt="xs">
                  Envío
                </Title>
                <Text size="sm">
                  {ficha.shipping_recipient || ficha.athlete_name}
                  {ficha.shipping_phone ? ` · ${ficha.shipping_phone}` : ""}
                </Text>
                <Text c="dimmed" size="sm">
                  {[ficha.shipping_address, ficha.shipping_city].filter(Boolean).join(", ") || "—"}
                </Text>
                {ficha.shipping_notes && (
                  <Text c="dimmed" size="xs">
                    {ficha.shipping_notes}
                  </Text>
                )}
                {ficha.tracking_code && (
                  <Text c="dimmed" size="xs">
                    Guía {ficha.tracking_code}
                  </Text>
                )}
              </div>
            ) : (
              <Text size="sm" c="dimmed">
                Lo recoge en el gym.
              </Text>
            )}

            {ficha.return_status && (
              <Alert color="orange" variant="light" title="Devolución">
                <Text size="sm">{ficha.return_reason || "Sin motivo."}</Text>
                {ficha.return_resolution_note && (
                  <Text c="dimmed" size="xs" mt={4}>
                    {ficha.return_resolution_note}
                  </Text>
                )}
              </Alert>
            )}

            <Title order={6} mt="xs">
              Bitácora
            </Title>
            {!(ficha.events ?? []).length ? (
              <Text c="dimmed" size="sm">
                Sin hitos registrados.
              </Text>
            ) : (
              <Stack gap={4}>
                {ficha.events.map((e) => (
                  <Text key={e.id} size="xs" c="dimmed">
                    {new Date(e.created_at).toLocaleString("es-GT")} · {e.status_label}
                    {e.note ? ` — ${e.note}` : ""}
                  </Text>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

/**
 * Una devolución pedida por el atleta, con sus dos decisiones. Cada una pide su
 * nota al presionarla: la de aprobar es opcional; la de rechazar, la explicación
 * que lee el atleta.
 */
function Devolucion({
  o,
  gymId,
  onAbrir,
  onAprobada,
}: {
  o: ProductOrder;
  gymId: string;
  onAbrir: () => void;
  onAprobada: () => void;
}) {
  const aprobar = useApproveOrderReturn(gymId);
  const rechazar = useRejectOrderReturn(gymId);
  const [abierto, setAbierto] = useState<"aprobar" | "rechazar" | null>(null);
  const [nota, setNota] = useState("");

  const resolver = (aprobando: boolean) => {
    const mutation = aprobando ? aprobar : rechazar;
    mutation.mutate(
      { id: o.id, reason: nota.trim() },
      {
        onSuccess: () => {
          if (aprobando) onAprobada();
          setAbierto(null);
          setNota("");
          notifications.show({ color: "teal", message: aprobando ? "Devolución aprobada." : "Devolución rechazada." });
        },
        onError: (error) =>
          notifications.show({ color: "red", message: errMsg(error, "No se pudo resolver la devolución.") }),
      },
    );
  };

  const decision = (tipo: "aprobar" | "rechazar") => {
    const aprobando = tipo === "aprobar";
    return (
      <Popover
        opened={abierto === tipo}
        onChange={(v) => setAbierto(v ? tipo : null)}
        position="bottom-end"
        withArrow
        trapFocus
      >
        <Popover.Target>
          <Button
            size="xs"
            color={aprobando ? undefined : "red"}
            variant={aprobando ? "filled" : "light"}
            disabled={aprobar.isPending || rechazar.isPending}
            onClick={() => {
              setNota("");
              setAbierto((v) => (v === tipo ? null : tipo));
            }}
          >
            {aprobando ? "Aprobar" : "Rechazar"}
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs" w={250}>
            <TextInput
              size="xs"
              placeholder={aprobando ? "Nota para el atleta (opcional)" : "Por qué se rechaza (lo lee el atleta)"}
              value={nota}
              onChange={(e) => setNota(e.currentTarget.value)}
              data-autofocus
            />
            <Button
              size="xs"
              color={aprobando ? undefined : "red"}
              loading={(aprobando ? aprobar : rechazar).isPending}
              onClick={() => resolver(aprobando)}
            >
              {aprobando ? "Aprobar devolución" : "Rechazar devolución"}
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  };

  return (
    <Tarjeta etiqueta={`Devolución de ${o.athlete_name}`} aviso>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <div style={{ minWidth: 200, flex: 1 }}>
          <Text size="sm">
            <b>{nombreCorto(o.athlete_name)}</b>{" "}
            <Text span c="dimmed">
              · {resumen(o)} · {fmtQ(o.total, { decimals: 2 })}
            </Text>
          </Text>
          <Text size="xs" fs="italic" c="dimmed" mt={2}>
            «{o.return_reason || "Sin motivo"}»
          </Text>
        </div>
        <Group gap="xs">
          <Button size="xs" variant="subtle" onClick={onAbrir}>
            Ver
          </Button>
          {decision("aprobar")}
          {decision("rechazar")}
        </Group>
      </Group>
    </Tarjeta>
  );
}

/** Botón «Envíos» del encabezado: dice si están activos y abre sus condiciones. */
function EnviosBoton({ gymId }: { gymId: string }) {
  const config = useGymShippingConfig(gymId);
  const guardar = useUpdateGymShippingConfig(gymId);
  const [abierto, setAbierto] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [cost, setCost] = useState("0.00");
  const [freeOver, setFreeOver] = useState("");
  const [etaDays, setEtaDays] = useState<number | string>(3);
  const [note, setNote] = useState("");

  const abrir = () => {
    // Se hidrata al abrir: así siempre arranca de lo guardado, no de un intento a medias.
    const c = config.data;
    if (c) {
      setEnabled(c.enabled);
      setCost(c.cost);
      setFreeOver(c.free_over ?? "");
      setEtaDays(c.eta_days);
      setNote(c.note);
    }
    setAbierto(true);
  };

  const onGuardar = async () => {
    try {
      await guardar.mutateAsync({
        enabled,
        cost: cost || "0",
        free_over: freeOver || null,
        eta_days: Number(etaDays) || 0,
        note,
      });
      notifications.show({ color: "teal", message: "Condiciones de envío guardadas." });
      setAbierto(false);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudieron guardar las condiciones de envío.") });
    }
  };

  const activos = !!config.data?.enabled;
  return (
    <>
      <Button
        variant="default"
        onClick={abrir}
        disabled={config.isLoading}
        rightSection={
          config.data ? (
            <Badge size="xs" color={activos ? "teal" : "gray"} variant="light">
              {activos ? "Activos" : "Apagados"}
            </Badge>
          ) : null
        }
      >
        Envíos
      </Button>
      <Modal opened={abierto} onClose={() => setAbierto(false)} title="Envíos a domicilio" centered>
        <Stack gap="sm">
          <Switch
            label="Ofrecer envío a domicilio"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Costo del envío (Q)"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.currentTarget.value)}
              disabled={!enabled}
            />
            <TextInput
              label="Envío gratis desde (Q)"
              placeholder="Vacío = nunca"
              inputMode="decimal"
              value={freeOver}
              onChange={(e) => setFreeOver(e.currentTarget.value)}
              disabled={!enabled}
            />
            <NumberInput
              label="Días estimados"
              value={etaDays}
              onChange={setEtaDays}
              min={0}
              max={60}
              disabled={!enabled}
            />
          </SimpleGrid>
          <TextInput
            label="Nota para el atleta"
            placeholder="Solo enviamos dentro de la ciudad"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            disabled={!enabled}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={onGuardar} loading={guardar.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
