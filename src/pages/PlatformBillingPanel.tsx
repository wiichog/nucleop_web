import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import {
  useGeneratePlatformPayout,
  usePayPlatformPayout,
  usePlatformPayouts,
  usePlatformStatements,
} from "../api/hooks";
import type { GymStatement, Payout } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { Money, SectionLabel } from "../components/ui";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";

/** "YYYY-MM" a partir de una fecha local (el backend valida ese formato exacto). */
function periodoDe(d: Date | null): string | undefined {
  if (!d) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text
        fw={700}
        fz={{ base: 20, sm: 24 }}
        c={accent ? "flame" : undefined}
        ff='"Space Grotesk", sans-serif'
        style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
      >
        {value}
      </Text>
      {sub && (
        <Text c="dimmed" size="xs" mt={4}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

/**
 * Estado de cuenta de la red (solo superadmin): cuánto entró por la pasarela, qué
 * le toca a cada gym y CUÁNTO GANÓ NUCLEO por recargo. Solo cuenta el dinero que
 * pasó por Pagalo: los pagos manuales ya los cobró el gym y no generan recargo.
 */
export function PlatformBillingPanel() {
  const [mes, setMes] = useState<Date | null>(new Date());
  const period = periodoDe(mes);
  const statements = usePlatformStatements(period, true);
  const payouts = usePlatformPayouts({ period }, true);
  const generar = useGeneratePlatformPayout();
  const marcarPagado = usePayPlatformPayout();

  const [pagando, setPagando] = useState<Payout | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const data = statements.data;

  const onGenerar = async (gymId: string) => {
    if (!period) return;
    try {
      await generar.mutateAsync({ gym_id: gymId, period });
      notifications.show({
        color: "teal",
        message: "Depósito generado. El desglose queda congelado con este corte.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo generar el depósito."),
      });
    }
  };

  const onPagar = async () => {
    if (!pagando) return;
    try {
      await marcarPagado.mutateAsync({ payoutId: pagando.id, reference: reference.trim(), notes });
      notifications.show({ color: "teal", message: "Depósito marcado como ejecutado." });
      setPagando(null);
      setReference("");
      setNotes("");
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo marcar el depósito."),
      });
    }
  };

  return (
    <div>
      <Card mb="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <Title order={3} mb={4}>
              Estado de cuenta de la red
            </Title>
            <Text c="dimmed" size="sm">
              Solo el dinero cobrado por la pasarela. El recargo de Nucleo va SUMADO encima del
              precio del gym: el gym recibe su base y la plataforma se queda el recargo.
            </Text>
          </div>
          <MonthPickerInput
            label="Periodo"
            value={mes}
            onChange={setMes}
            valueFormat="YYYY-MM"
            w={{ base: "100%", sm: 200 }}
          />
        </Group>
      </Card>

      {statements.isError ? (
        <PageError onRetry={() => statements.refetch()} />
      ) : statements.isLoading ? (
        <PageLoading label="Calculando la liquidación…" />
      ) : !data ? (
        <EmptyState title="Sin datos" description="No hay liquidación para este periodo." />
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md" mb="lg">
            <Metric
              label="Ganancia de Nucleo"
              value={fmtQ(data.totals.platform_earned)}
              sub="Recargo neto de reembolsos"
              accent
            />
            <Metric label="Cobrado por pasarela" value={fmtQ(data.totals.gross_charged)} />
            <Metric label="Ingreso de los gyms" value={fmtQ(data.totals.gym_revenue)} />
            <Metric label="Reembolsos" value={fmtQ(data.totals.refunds_total)} />
            <Metric
              label="Por depositar"
              value={fmtQ(data.totals.net_to_deposit)}
              sub="Custodia puente"
            />
            <Metric
              label="Gyms con movimiento"
              value={String(data.totals.gyms_count)}
              sub={`${data.period_start} → ${data.period_end}`}
            />
          </SimpleGrid>

          <Card mb="lg">
            <SectionLabel>Por gimnasio</SectionLabel>
            <DataTable<GymStatement>
              minHeight={160}
              highlightOnHover
              striped
              idAccessor="gym_id"
              records={data.gyms}
              noRecordsText="Ningún gimnasio movió dinero por la pasarela en este periodo."
              columns={[
                { accessor: "gym_name", title: "Gimnasio" },
                {
                  accessor: "payments_count",
                  title: "Cobros",
                  textAlign: "right",
                  render: (g) => (
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {g.payments_count}
                      {g.refunds_count ? ` · ${g.refunds_count} dev.` : ""}
                    </Text>
                  ),
                },
                {
                  accessor: "gross_charged",
                  title: "Cobrado",
                  textAlign: "right",
                  render: (g) => <Money value={g.gross_charged} decimals={2} block />,
                },
                {
                  accessor: "gym_revenue",
                  title: "Del gym",
                  textAlign: "right",
                  render: (g) => <Money value={g.gym_revenue} decimals={2} block />,
                },
                {
                  accessor: "platform_earned",
                  title: "Ganó Nucleo",
                  textAlign: "right",
                  render: (g) => <Money value={g.platform_earned} decimals={2} c="flame" block />,
                },
                {
                  accessor: "net_to_deposit",
                  title: "A depositar",
                  textAlign: "right",
                  render: (g) => <Money value={g.net_to_deposit} decimals={2} block />,
                },
                {
                  accessor: "payout",
                  title: "Depósito",
                  render: (g) =>
                    !g.payout ? (
                      <Text c="dimmed" size="sm">
                        Sin generar
                      </Text>
                    ) : (
                      <Badge color={g.payout.status === "executed" ? "teal" : "yellow"} variant="light">
                        {g.payout.status === "executed" ? "Depositado" : "Pendiente"}
                      </Badge>
                    ),
                },
                {
                  accessor: "actions",
                  title: "",
                  render: (g) => (
                    <RowActions
                      actions={[
                        {
                          label: g.payout ? "Recalcular" : "Generar depósito",
                          variant: "default" as const,
                          loading: generar.isPending && generar.variables?.gym_id === g.gym_id,
                          disabled: g.payout?.status === "executed",
                          onClick: () => onGenerar(g.gym_id),
                        },
                        !!g.payout &&
                          g.payout.status === "pending" && {
                            label: "Marcar depositado",
                            variant: "light" as const,
                            onClick: () => {
                              setPagando(g.payout as Payout);
                              setReference("");
                              setNotes("");
                            },
                          },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>

          <Card>
            <SectionLabel>Depósitos del periodo</SectionLabel>
            {payouts.isError ? (
              <PageError onRetry={() => payouts.refetch()} />
            ) : (
              <DataTable<Payout>
                minHeight={140}
                highlightOnHover
                striped
                idAccessor="id"
                records={payouts.data ?? []}
                fetching={payouts.isLoading}
                noRecordsText="Aún no se genera ningún depósito para este periodo."
                columns={[
                  { accessor: "gym_name", title: "Gimnasio" },
                  {
                    accessor: "amount",
                    title: "Neto depositado",
                    textAlign: "right",
                    render: (p) => <Money value={p.amount} decimals={2} block />,
                  },
                  {
                    accessor: "platform_surcharge",
                    title: "Recargo Nucleo",
                    textAlign: "right",
                    render: (p) => <Money value={p.platform_surcharge} decimals={2} block />,
                  },
                  {
                    accessor: "status",
                    title: "Estado",
                    render: (p) => (
                      <Badge color={p.status === "executed" ? "teal" : "yellow"} variant="light">
                        {p.status === "executed" ? "Depositado" : "Pendiente"}
                      </Badge>
                    ),
                  },
                  {
                    accessor: "reference",
                    title: "Referencia",
                    render: (p) => p.reference || "—",
                  },
                  {
                    accessor: "executed_at",
                    title: "Ejecutado",
                    render: (p) =>
                      p.executed_at ? new Date(p.executed_at).toLocaleString("es-GT") : "—",
                  },
                  {
                    accessor: "actions",
                    title: "",
                    render: (p) =>
                      p.status === "pending" ? (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => {
                            setPagando(p);
                            setReference("");
                            setNotes("");
                          }}
                        >
                          Marcar depositado
                        </Button>
                      ) : null,
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        opened={!!pagando}
        onClose={() => setPagando(null)}
        title="Marcar depósito como ejecutado"
        centered
      >
        <Stack gap="md">
          {pagando && (
            <Alert color="gray" variant="light">
              <Text size="sm">
                {pagando.gym_name} · {pagando.period} ·{" "}
                <strong>{fmtQ(pagando.amount, { decimals: 2 })}</strong>
              </Text>
            </Alert>
          )}
          <Text size="sm" c="dimmed">
            La referencia bancaria es obligatoria: sin ella no queda rastro de que el dinero salió.
          </Text>
          <TextInput
            label="Referencia bancaria"
            placeholder="No. de transferencia o boleta"
            value={reference}
            onChange={(e) => setReference(e.currentTarget.value)}
          />
          <Textarea
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPagando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={onPagar}
              disabled={!reference.trim()}
              loading={marcarPagado.isPending}
            >
              Confirmar depósito
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
