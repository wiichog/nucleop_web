import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
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
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "mantine-datatable";
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
import { DetailSheet } from "../components/DetailSheet";
import { PageError } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { Money, SectionLabel } from "../components/ui";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pago pendiente", color: "yellow" },
  reserved: { label: "Apartado", color: "grape" },
  paid: { label: "Pagado", color: "teal" },
  preparing: { label: "Preparando", color: "cyan" },
  shipped: { label: "En camino", color: "blue" },
  delivered: { label: "Entregado", color: "gray" },
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

/**
 * Pedidos de la tienda de la app: seguimiento (preparando → en camino →
 * entregado), devoluciones que pide el atleta y condiciones de envío. El
 * reembolso devuelve la BASE del gym; el recargo de Nucleo nunca se reembolsa.
 */
export function StoreOrdersPanel({ gymId }: { gymId: string }) {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<string | null>("");
  const orders = useGymProductOrders(gymId, {
    status: (estado || undefined) as ProductOrderStatus | undefined,
  });
  const devoluciones = useGymProductOrders(gymId, { return_status: "requested" });
  const updateOrder = useUpdateProductOrder(gymId);
  const refundOrder = useRefundProductOrder(gymId);
  const aprobarDev = useApproveOrderReturn(gymId);
  const rechazarDev = useRejectOrderReturn(gymId);

  const [ficha, setFicha] = useState<ProductOrder | null>(null);
  const [enviando, setEnviando] = useState<ProductOrder | null>(null);
  const [tracking, setTracking] = useState("");

  const pendientes = devoluciones.data ?? [];

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
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: `Pedido marcado como «${ORDER_STATUS[status]?.label ?? status}».`,
          }),
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, "No se pudo actualizar el pedido."),
          }),
      },
    );
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
        notifications.show({
          color: "teal",
          message: "Pedido devuelto: se registró el reembolso y el stock regresó.",
        });
      },
      onError: (error) =>
        notifications.show({
          color: "red",
          message: errMsg(error, "No se pudo devolver el pedido."),
        }),
    });
  };

  const resolverDevolucion = (o: ProductOrder, aprobar: boolean) => {
    const reason = window.prompt(
      aprobar
        ? "Nota para el atleta (opcional). Al aprobar se reembolsa la base y el stock regresa:"
        : "Explícale al atleta por qué se rechaza la devolución:",
      "",
    );
    if (reason === null) return;
    const mutation = aprobar ? aprobarDev : rechazarDev;
    mutation.mutate(
      { id: o.id, reason },
      {
        onSuccess: () => {
          if (aprobar) refrescarEstadoDeCuenta();
          notifications.show({
            color: "teal",
            message: aprobar ? "Devolución aprobada." : "Devolución rechazada.",
          });
        },
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, "No se pudo resolver la devolución."),
          }),
      },
    );
  };

  const acciones = (o: ProductOrder) => {
    const siguientes = SIGUIENTES[o.status] ?? [];
    return [
      { label: "Ver", variant: "subtle" as const, onClick: () => setFicha(o) },
      siguientes.includes("preparing") && {
        label: "Preparando",
        onClick: () => avanzar(o, "preparing"),
      },
      siguientes.includes("shipped") &&
        o.delivery_method === "shipping" && {
          label: "Enviar",
          onClick: () => {
            setEnviando(o);
            setTracking(o.tracking_code ?? "");
          },
        },
      siguientes.includes("delivered") && {
        label: "Entregado",
        variant: "filled" as const,
        onClick: () => avanzar(o, "delivered"),
      },
      PAGADOS.includes(o.status) &&
        o.return_status !== "requested" && {
          label: "Devolver",
          variant: "subtle" as const,
          color: "orange",
          loading: refundOrder.isPending && refundOrder.variables === o.id,
          onClick: () => onRefund(o),
        },
      siguientes.includes("cancelled") && {
        label: "Cancelar",
        variant: "subtle" as const,
        color: "red",
        onClick: () => avanzar(o, "cancelled"),
      },
    ];
  };

  return (
    <div>
      {orders.isError && <PageError onRetry={() => orders.refetch()} />}

      {pendientes.length > 0 && (
        <Card mb="lg">
          <SectionLabel>Devoluciones por resolver ({pendientes.length})</SectionLabel>
          <Text c="dimmed" size="sm" mb="md">
            El atleta ya pidió devolver. Al aprobar se registra el reembolso de la base y las
            unidades regresan al inventario; el recargo de Nucleo no se reembolsa.
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Atleta</Table.Th>
                <Table.Th>Motivo</Table.Th>
                <Table.Th ta="right">Monto</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pendientes.map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {o.athlete_name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {o.product_name}
                      {o.items_count > 1 ? ` +${o.items_count - 1} más` : ""}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{o.return_reason || "—"}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Money value={o.total} decimals={2} />
                  </Table.Td>
                  <Table.Td>
                    <RowActions
                      actions={[
                        {
                          label: "Aprobar",
                          variant: "filled" as const,
                          loading: aprobarDev.isPending && aprobarDev.variables?.id === o.id,
                          onClick: () => resolverDevolucion(o, true),
                        },
                        {
                          label: "Rechazar",
                          variant: "subtle" as const,
                          color: "red",
                          loading: rechazarDev.isPending && rechazarDev.variables?.id === o.id,
                          onClick: () => resolverDevolucion(o, false),
                        },
                      ]}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <ShippingCard gymId={gymId} />

      <Card>
        <Group justify="space-between" align="flex-end" mb="md" wrap="wrap">
          <div>
            <Title order={3} mb={4}>
              Pedidos de la tienda
            </Title>
            <Text c="dimmed" size="sm">
              Compras y apartados que tus atletas hacen desde la app.
            </Text>
          </div>
          <Select
            label="Estado"
            placeholder="Todos"
            value={estado}
            onChange={setEstado}
            clearable
            w={{ base: "100%", sm: 220 }}
            data={Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />
        </Group>

        <DataTable<ProductOrder>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={orders.data ?? []}
          fetching={orders.isLoading}
          noRecordsText="Sin pedidos todavía. Activa productos en la tienda para que tus atletas compren desde la app."
          columns={[
            { accessor: "athlete_name", title: "Atleta" },
            {
              accessor: "product_name",
              title: "Pedido",
              render: (o) => (
                <div>
                  <Text size="sm" fw={600}>
                    {o.product_name}
                    {o.items_count > 1 ? ` +${o.items_count - 1} más` : ` × ${o.qty}`}
                  </Text>
                  {(o.size || o.color) && (
                    <Text c="dimmed" size="xs">
                      {[o.size && `Talla ${o.size}`, o.color].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </div>
              ),
            },
            {
              accessor: "total",
              title: "Total",
              textAlign: "right",
              render: (o) => <Money value={o.total} decimals={2} block />,
            },
            {
              accessor: "delivery_method",
              title: "Entrega",
              render: (o) => (
                <div>
                  <Text size="sm">{o.delivery_method === "shipping" ? "Envío" : "En el gym"}</Text>
                  {o.tracking_code && (
                    <Text c="dimmed" size="xs">
                      Guía {o.tracking_code}
                    </Text>
                  )}
                </div>
              ),
            },
            {
              accessor: "status",
              title: "Estado",
              render: (o) => {
                const s = ORDER_STATUS[o.status] ?? { label: o.status, color: "gray" };
                return (
                  <Group gap={4} wrap="nowrap">
                    <Badge color={s.color} variant="light">
                      {s.label}
                    </Badge>
                    {o.return_status === "requested" && (
                      <Badge color="orange" variant="light">
                        Devolución
                      </Badge>
                    )}
                  </Group>
                );
              },
            },
            {
              accessor: "created_at",
              title: "Fecha",
              render: (o) => new Date(o.created_at).toLocaleString("es-GT"),
            },
            {
              accessor: "actions",
              title: "",
              render: (o) => <RowActions actions={acciones(o)} />,
            },
          ]}
        />
      </Card>

      {/* Ficha del pedido: líneas, envío y bitácora tal como la ve el atleta. */}
      <DetailSheet opened={!!ficha} onClose={() => setFicha(null)} title="Pedido" size={520}>
        {ficha && (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600}>{ficha.athlete_name}</Text>
              <Badge
                color={(ORDER_STATUS[ficha.status] ?? { color: "gray" }).color}
                variant="light"
              >
                {(ORDER_STATUS[ficha.status] ?? { label: ficha.status }).label}
              </Badge>
            </Group>

            <SectionLabel mt="xs">Productos</SectionLabel>
            <Table>
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

            <Group justify="space-between">
              <Text c="dimmed" size="sm">
                Subtotal
              </Text>
              <Money value={ficha.subtotal} decimals={2} fw={500} />
            </Group>
            {Number(ficha.shipping_cost) > 0 && (
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Envío
                </Text>
                <Money value={ficha.shipping_cost} decimals={2} fw={500} />
              </Group>
            )}
            <Group justify="space-between">
              <Text size="sm">Total del gym</Text>
              <Money value={ficha.total} decimals={2} />
            </Group>
            {Number(ficha.surcharge) > 0 && (
              <Text c="dimmed" size="xs">
                El atleta pagó {fmtQ(ficha.total_charged, { decimals: 2 })} (incluye el recargo de
                Nucleo de {fmtQ(ficha.surcharge, { decimals: 2 })}, que no es ingreso del gym).
              </Text>
            )}

            {ficha.delivery_method === "shipping" && (
              <>
                <SectionLabel mt="sm">Envío</SectionLabel>
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
              </>
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

            <SectionLabel mt="sm">Bitácora</SectionLabel>
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
      </DetailSheet>

      <Modal
        opened={!!enviando}
        onClose={() => setEnviando(null)}
        title="Marcar como enviado"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            El atleta ve el número de guía en el seguimiento de su pedido.
          </Text>
          <TextInput
            label="Guía o rastreo"
            placeholder="Opcional"
            value={tracking}
            onChange={(e) => setTracking(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEnviando(null)}>
              Cancelar
            </Button>
            <Button
              loading={updateOrder.isPending}
              onClick={() => {
                if (!enviando) return;
                avanzar(enviando, "shipped", tracking.trim());
                setEnviando(null);
              }}
            >
              Marcar enviado
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

/** Condiciones de envío de la tienda (costo, envío gratis y tiempo estimado). */
function ShippingCard({ gymId }: { gymId: string }) {
  const config = useGymShippingConfig(gymId);
  const guardar = useUpdateGymShippingConfig(gymId);
  const [abierto, setAbierto] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [cost, setCost] = useState("0.00");
  const [freeOver, setFreeOver] = useState("");
  const [etaDays, setEtaDays] = useState<number | string>(3);
  const [note, setNote] = useState("");
  const [hidratado, setHidratado] = useState(false);

  if (config.data && !hidratado) {
    setHidratado(true);
    setEnabled(config.data.enabled);
    setCost(config.data.cost);
    setFreeOver(config.data.free_over ?? "");
    setEtaDays(config.data.eta_days);
    setNote(config.data.note);
  }

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
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudieron guardar las condiciones de envío."),
      });
    }
  };

  return (
    <Card mb="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <SectionLabel mb={4}>Envíos</SectionLabel>
          <Text size="sm">
            {config.data?.enabled
              ? `Activos · ${fmtQ(config.data.cost, { decimals: 2 })}${
                  config.data.free_over
                    ? `, gratis desde ${fmtQ(config.data.free_over, { decimals: 2 })}`
                    : ""
                } · ${config.data.eta_days} días`
              : "Desactivados: los atletas solo pueden recoger en el gym."}
          </Text>
        </div>
        <Button variant="default" size="xs" onClick={() => setAbierto(true)}>
          Configurar
        </Button>
      </Group>

      <Modal
        opened={abierto}
        onClose={() => setAbierto(false)}
        title="Condiciones de envío"
        centered
      >
        <Stack gap="md">
          <Switch
            label="Ofrecer envío a domicilio"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Costo del envío (Q)"
              value={cost}
              onChange={(e) => setCost(e.currentTarget.value)}
            />
            <TextInput
              label="Envío gratis desde (Q)"
              placeholder="Vacío = nunca"
              value={freeOver}
              onChange={(e) => setFreeOver(e.currentTarget.value)}
            />
            <NumberInput
              label="Días estimados"
              value={etaDays}
              onChange={setEtaDays}
              min={0}
              max={60}
            />
          </SimpleGrid>
          <TextInput
            label="Nota para el atleta"
            placeholder="Ej. solo enviamos dentro de la ciudad"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
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
    </Card>
  );
}
