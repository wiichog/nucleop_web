import { type ReactNode, useState } from "react";
import {
  Badge,
  Button,
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
import {
  useGeneratePlatformPayout,
  usePayPlatformPayout,
  usePlatformPayouts,
  usePlatformStatements,
} from "../api/hooks";
import type { GymStatement, Payout } from "../api/types";
import { PageError } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { Money } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { fmtQ, toNumber } from "../lib/money";

/** "YYYY-MM" a partir de una fecha local (el backend valida ese formato exacto). */
function periodoDe(d: Date | null): string | undefined {
  if (!d) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Estado del depósito de un gym en el periodo. «Sin generar» sólo es pendiente si
 * hay algo que depositarle: un gym con puro reembolso no espera depósito.
 */
export function estadoDeposito(g: Pick<GymStatement, "payout" | "net_to_deposit">): {
  texto: string;
  color: string;
  pendiente: boolean;
} {
  if (g.payout?.status === "executed") return { texto: "Depositado", color: "teal", pendiente: false };
  if (g.payout) return { texto: "Pendiente", color: "yellow", pendiente: true };
  const hayQueDepositar = toNumber(g.net_to_deposit) > 0;
  return { texto: "Sin generar", color: hayQueDepositar ? "yellow" : "gray", pendiente: hayQueDepositar };
}

/** Una cifra del resumen: rótulo chico y el monto. */
function Cifra({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Text size="xs" c="dimmed" truncate>
        {etiqueta}
      </Text>
      <Text fw={700} fz={18} c={color} className="a-tabular">
        {valor}
      </Text>
    </div>
  );
}

/** Renglón de la ficha del depósito: rótulo a la izquierda, monto a la derecha. */
function Linea({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Text size="sm" c="dimmed">
        {etiqueta}
      </Text>
      <div style={{ textAlign: "right" }}>{children}</div>
    </Group>
  );
}

/**
 * Estado de cuenta de la red (solo superadmin): cuánto entró por la pasarela, qué
 * le toca a cada gym y CUÁNTO GANÓ NUCLEO por recargo. Solo cuenta el dinero que
 * pasó por Pagalo: los pagos manuales ya los cobró el gym y no generan recargo.
 *
 * El margen que se pinta es el REAL: `platform_earned` ya viene neto de los
 * reembolsos y de la comisión que se queda el proveedor de la pasarela.
 *
 * Lo que se viene a hacer aquí es cerrar el mes: generar el depósito de cada gym
 * y marcarlo hecho. Por eso los gyms van en filas que se tocan para abrir su
 * ficha (desglose + acciones) y los pendientes salen en amarillo.
 */
export function PlatformBillingPanel() {
  const [mes, setMes] = useState<Date | null>(new Date());
  const period = periodoDe(mes);
  const statements = usePlatformStatements(period, true);
  const payouts = usePlatformPayouts({ period }, true);
  const generar = useGeneratePlatformPayout();
  const marcarPagado = usePayPlatformPayout();

  const [fichaId, setFichaId] = useState<string | null>(null);
  const [pagando, setPagando] = useState<Payout | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const data = statements.data;
  const gyms = data?.gyms ?? [];
  const ficha = gyms.find((g) => g.gym_id === fichaId) ?? null;
  const depositos = payouts.data ?? [];
  const sinGenerar = gyms.filter((g) => !g.payout && estadoDeposito(g).pendiente).length;
  const porDepositar = depositos.filter((p) => p.status === "pending").length;

  const onGenerar = async (gymId: string) => {
    if (!period) return;
    try {
      await generar.mutateAsync({ gym_id: gymId, period });
      notifications.show({
        color: "teal",
        message: "Depósito generado. El desglose queda congelado con este corte.",
      });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo generar el depósito.") });
    }
  };

  const abrirPago = (p: Payout) => {
    setFichaId(null);
    setPagando(p);
    setReference("");
    setNotes("");
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
      notifications.show({ color: "red", message: errMsg(error, "No se pudo marcar el depósito.") });
    }
  };

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Estado de cuenta"
        avisos={
          <>
            {sinGenerar > 0 && (
              <Badge color="yellow" variant="light">
                {sinGenerar} sin generar
              </Badge>
            )}
            {porDepositar > 0 && (
              <Badge color="yellow" variant="light">
                {porDepositar} por depositar
              </Badge>
            )}
          </>
        }
      >
        <MonthPickerInput
          aria-label="Periodo"
          placeholder="Periodo"
          value={mes}
          onChange={setMes}
          valueFormat="YYYY-MM"
          w={{ base: "100%", sm: 160 }}
        />
      </Encabezado>

      {statements.isError ? (
        <PageError onRetry={() => statements.refetch()} />
      ) : statements.isLoading ? (
        <Text c="dimmed" size="sm">
          Calculando la liquidación…
        </Text>
      ) : !data ? (
        <Text c="dimmed" size="sm">
          No hay liquidación para este periodo.
        </Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md" mb="xs">
            <Cifra etiqueta="Ganancia de Nucleo" valor={fmtQ(data.totals.platform_earned, { decimals: 2 })} color="flame" />
            {/* El desglose del margen sólo llega si el backend manda las dos cifras
                (ver `PlatformBillingTotals`); si no, se omite en vez de pintar NaN. */}
            {data.totals.platform_surcharge != null && (
              <Cifra
                etiqueta="Recargo que pagaron los atletas"
                valor={fmtQ(data.totals.platform_surcharge, { decimals: 2 })}
              />
            )}
            {data.totals.provider_fee_net != null && (
              <Cifra
                etiqueta="Se quedó la pasarela"
                valor={`−${fmtQ(data.totals.provider_fee_net, { decimals: 2 })}`}
                color="var(--nucleo-danger)"
              />
            )}
            <Cifra etiqueta="Cobrado por pasarela" valor={fmtQ(data.totals.gross_charged, { decimals: 2 })} />
            <Cifra etiqueta="Ingreso de los gyms" valor={fmtQ(data.totals.gym_revenue, { decimals: 2 })} />
            <Cifra
              etiqueta="Reembolsos"
              valor={fmtQ(data.totals.refunds_total, { decimals: 2 })}
              color="var(--nucleo-danger)"
            />
            <Cifra etiqueta="Por depositar" valor={fmtQ(data.totals.net_to_deposit, { decimals: 2 })} />
          </SimpleGrid>
          <Text size="xs" c="dimmed" mb="lg" className="a-tabular">
            {data.period_start} → {data.period_end} · {data.totals.gyms_count}{" "}
            {data.totals.gyms_count === 1 ? "gimnasio" : "gimnasios"} con movimiento
          </Text>

          <Title order={4} mb="sm">
            Por gimnasio
          </Title>
          {gyms.length === 0 ? (
            <Text c="dimmed" size="sm">
              Ningún gimnasio movió dinero por la pasarela en este periodo.
            </Text>
          ) : (
            <Stack gap={6}>
              {gyms.map((g) => {
                const estado = estadoDeposito(g);
                return (
                  <Tarjeta
                    key={g.gym_id}
                    etiqueta={`Abrir el depósito de ${g.gym_name}`}
                    onClick={() => setFichaId(g.gym_id)}
                    aviso={estado.pendiente}
                  >
                    <Group justify="space-between" wrap="wrap" gap="sm">
                      <div style={{ minWidth: 160, flex: 1 }}>
                        <Text fw={600} truncate>
                          {g.gym_name}
                        </Text>
                        <Text size="xs" c="dimmed" className="a-tabular">
                          {g.payments_count} {g.payments_count === 1 ? "cobro" : "cobros"}
                          {g.refunds_count ? ` · ${g.refunds_count} dev.` : ""} · cobrado{" "}
                          {fmtQ(g.gross_charged, { decimals: 2 })} · ganó Nucleo{" "}
                          {fmtQ(g.platform_earned, { decimals: 2 })}
                        </Text>
                      </div>
                      <Group gap="sm" wrap="nowrap">
                        <Money value={g.net_to_deposit} decimals={2} />
                        <Badge color={estado.color} variant="light">
                          {estado.texto}
                        </Badge>
                      </Group>
                    </Group>
                  </Tarjeta>
                );
              })}
            </Stack>
          )}

          <Title order={4} mt="xl" mb="sm">
            Depósitos
          </Title>
          {payouts.isError ? (
            <PageError onRetry={() => payouts.refetch()} />
          ) : payouts.isLoading ? (
            <Text c="dimmed" size="sm">
              Cargando…
            </Text>
          ) : depositos.length === 0 ? (
            <Text c="dimmed" size="sm">
              Aún no se genera ningún depósito para este periodo.
            </Text>
          ) : (
            <Stack gap={6}>
              {depositos.map((p) => {
                const pendiente = p.status === "pending";
                return (
                  <Tarjeta
                    key={p.id}
                    etiqueta={pendiente ? `Marcar depositado ${p.gym_name}` : `Depósito de ${p.gym_name}`}
                    onClick={pendiente ? () => abrirPago(p) : undefined}
                    aviso={pendiente}
                  >
                    <Group justify="space-between" wrap="wrap" gap="sm">
                      <div style={{ minWidth: 160, flex: 1 }}>
                        <Text size="sm" fw={600} truncate>
                          {p.gym_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {/* Es el recargo COBRADO al atleta, congelado al generar el
                              depósito — no lo que ganó Nucleo. */}
                          Recargo cobrado {fmtQ(p.platform_surcharge, { decimals: 2 })}
                          {p.reference ? ` · ref. ${p.reference}` : ""}
                          {p.executed_at ? ` · ${new Date(p.executed_at).toLocaleString("es-GT")}` : ""}
                        </Text>
                      </div>
                      <Group gap="sm" wrap="nowrap">
                        <Money value={p.amount} decimals={2} />
                        <Badge color={pendiente ? "yellow" : "teal"} variant="light">
                          {pendiente ? "Pendiente" : "Depositado"}
                        </Badge>
                      </Group>
                    </Group>
                  </Tarjeta>
                );
              })}
            </Stack>
          )}
        </>
      )}

      {/* Ficha del gym en el periodo: el desglose y lo que se hace con su depósito. */}
      <Modal
        opened={!!ficha}
        onClose={() => setFichaId(null)}
        title={ficha ? `${ficha.gym_name} · ${ficha.period}` : ""}
        centered
      >
        {ficha && (
          <Stack gap={8}>
            <Linea etiqueta="Cobros">
              <Text size="sm" className="a-tabular">
                {ficha.payments_count}
                {ficha.refunds_count ? ` · ${ficha.refunds_count} dev.` : ""}
              </Text>
            </Linea>
            <Linea etiqueta="Cobrado">
              <Money value={ficha.gross_charged} decimals={2} />
            </Linea>
            <Linea etiqueta="Del gym">
              <Money value={ficha.gym_revenue} decimals={2} />
            </Linea>
            <Linea etiqueta="Ganó Nucleo">
              <Money value={ficha.platform_earned} decimals={2} c="flame" />
              <Text size="xs" c="dimmed">
                de {fmtQ(ficha.platform_surcharge, { decimals: 2 })} de recargo
              </Text>
            </Linea>
            <Linea etiqueta="Reembolsos">
              <Money value={ficha.refunds_total} decimals={2} c="var(--nucleo-danger)" />
              {ficha.chargebacks_count > 0 && (
                <Text size="xs" c="dimmed">
                  {fmtQ(ficha.chargebacks_total, { decimals: 2 })} de contracargos
                </Text>
              )}
            </Linea>
            <Linea etiqueta="A depositar">
              <Money value={ficha.net_to_deposit} decimals={2} fw={700} />
            </Linea>
            <Linea etiqueta="Depósito">
              <Badge color={estadoDeposito(ficha).color} variant="light">
                {estadoDeposito(ficha).texto}
              </Badge>
              {ficha.payout?.reference ? (
                <Text size="xs" c="dimmed">
                  ref. {ficha.payout.reference}
                </Text>
              ) : null}
            </Linea>
            <Group justify="flex-end" gap="xs" mt="sm">
              <Button
                variant="default"
                loading={generar.isPending && generar.variables?.gym_id === ficha.gym_id}
                disabled={ficha.payout?.status === "executed"}
                onClick={() => onGenerar(ficha.gym_id)}
              >
                {ficha.payout ? "Recalcular" : "Generar depósito"}
              </Button>
              {ficha.payout?.status === "pending" && (
                <Button onClick={() => abrirPago(ficha.payout as Payout)}>Marcar depositado</Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!pagando} onClose={() => setPagando(null)} title="Marcar depositado" centered>
        <Stack gap="md">
          {pagando && (
            <Text size="sm">
              {pagando.gym_name} · {pagando.period} ·{" "}
              <strong>{fmtQ(pagando.amount, { decimals: 2 })}</strong>
            </Text>
          )}
          <TextInput
            label="Referencia bancaria"
            placeholder="No. de transferencia o boleta"
            required
            data-autofocus
            value={reference}
            onChange={(e) => setReference(e.currentTarget.value)}
          />
          <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} autosize minRows={2} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPagando(null)}>
              Cancelar
            </Button>
            <Button onClick={onPagar} disabled={!reference.trim()} loading={marcarPagado.isPending}>
              Confirmar depósito
            </Button>
          </Group>
        </Stack>
      </Modal>
    </GlassCard>
  );
}
