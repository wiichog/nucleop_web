import { useMemo, useState } from "react";
import { Badge, Box, Button, Group, Modal, Select, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { usePlatformChargebacks, useResolvePlatformChargeback } from "../api/hooks";
import type { Chargeback } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, useCuentaSinCargar } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { Money, PageHeader, SectionLabel } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { fmtQ, toNumber } from "../lib/money";
import { useAuth } from "../lib/auth";
import { CHARGEBACK_STATUS, CHARGEBACK_STATUS_COLOR, PAYMENT_CONCEPT, label } from "../lib/labels";

/**
 * Bandeja de contracargos de TODA la red. Es de plataforma y no del gimnasio por
 * una razón de dinero: con la custodia puente (`PAGALO.SUPPORTS_SPLIT=False`) el
 * 100 % de lo cobrado con tarjeta cae en la cuenta de Nucleo y se deposita al gym
 * a fin de mes. Si el atleta disputa dos meses después, el banco le quita el
 * dinero a **Nucleo** cuando el gym ya cobró.
 *
 * Quién se come la pérdida lo decide el backend, no esta pantalla: el contracargo
 * es un `Payment` negativo que `calcular_estado_cuenta` resta del depósito del gym
 * (`net_to_deposit = base + base_dev`), así que la CUOTA la pierde el gym en su
 * próximo depósito; Nucleo pierde su recargo y la comisión de la pasarela. Los
 * textos de aquí y el manual deben decir eso mismo.
 *
 * El gym responde con su evidencia desde su propia pantalla de pagos; aquí sólo
 * se registra el FALLO del banco, que es lo único que mueve dinero de vuelta.
 */

/** Recibido o con evidencia: todavía puede mover dinero. */
const estaAbierto = (c: Pick<Chargeback, "status">) => c.status === "open" || c.status === "submitted";

/**
 * Totales de los contadores. Sólo las disputas abiertas (recibidas o con
 * evidencia) pueden mover dinero todavía: una ganada volvió y una perdida ya está
 * contabilizada como pérdida firme.
 */
export function resumirContracargos(casos: Chargeback[]) {
  const abiertos = casos.filter(estaAbierto);
  return {
    expuesto: abiertos.reduce((total, c) => total + toNumber(c.total_lost), 0),
    sinResolver: abiertos.length,
    perdido: casos
      .filter((c) => c.status === "lost")
      .reduce((total, c) => total + toNumber(c.total_lost), 0),
  };
}

/**
 * Lo abierto primero, y entre lo abierto el que vence antes (sin fecha límite al
 * final); lo resuelto después, lo más reciente arriba.
 */
export function ordenarContracargos(casos: Chargeback[]): Chargeback[] {
  const limite = (c: Chargeback) => (c.evidence_due_at ? Date.parse(c.evidence_due_at) : Infinity);
  return casos.slice().sort((a, b) => {
    const abiertoA = estaAbierto(a);
    const abiertoB = estaAbierto(b);
    if (abiertoA !== abiertoB) return abiertoA ? -1 : 1;
    if (abiertoA) return limite(a) - limite(b);
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

const FILTROS = [
  { value: "", label: "Todos" },
  { value: "open", label: "Recibidos" },
  { value: "submitted", label: "Con evidencia" },
  { value: "won", label: "Ganados" },
  { value: "lost", label: "Perdidos" },
];

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-GT");

export function PlatformChargebacksPage() {
  const { isSuperuser } = useAuth();
  const sinCuenta = useCuentaSinCargar();
  const [estado, setEstado] = useState<string>("");
  const casos = usePlatformChargebacks({ status: estado || undefined }, isSuperuser);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const filas = useMemo(() => ordenarContracargos(casos.data ?? []), [casos.data]);
  // Los contadores de arriba son de TODA la red, no del filtro: con «Ganados»
  // marcaban 0 en disputa aunque hubiera casos abiertos. Sin filtro comparte la
  // caché con la lista (misma llave), así que no cuesta otra petición.
  const todos = usePlatformChargebacks({}, isSuperuser);
  const { expuesto, sinResolver, perdido } = useMemo(
    () => resumirContracargos(todos.data ?? []),
    [todos.data],
  );

  // Si /me falló, `isSuperuser` también es false: no negarle el acceso a un superadmin.
  if (sinCuenta) return sinCuenta;
  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Contracargos" />
        <EmptyState title="Sin acceso" description="Esta bandeja es del equipo de Nucleo." />
      </Stack>
    );
  }

  const abierto = filas.find((c) => c.id === abiertoId) ?? null;
  const contadoresListos = !todos.isLoading && !todos.isError;

  return (
    <div>
      <PageHeader kicker="Plataforma · Cobranza" title="Contracargos" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Expedientes"
          avisos={
            contadoresListos && (
              <>
                {sinResolver > 0 && (
                  <Badge color="yellow" variant="light">
                    {sinResolver} sin resolver · {fmtQ(expuesto, { decimals: 2 })} en disputa
                  </Badge>
                )}
                {perdido > 0 && (
                  <Badge color="red" variant="light">
                    Pérdida firme {fmtQ(perdido, { decimals: 2 })}
                  </Badge>
                )}
              </>
            )
          }
        >
          <Select
            aria-label="Filtrar por estado"
            data={FILTROS}
            value={estado}
            onChange={(v) => setEstado(v ?? "")}
            allowDeselect={false}
            w={{ base: "100%", sm: 170 }}
          />
        </Encabezado>

        {casos.isError ? (
          <PageError
            message={errMsg(casos.error, "No se pudieron cargar los contracargos.")}
            onRetry={() => casos.refetch()}
          />
        ) : casos.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : !filas.length ? (
          <Text c="dimmed" size="sm">
            {estado ? "Ningún contracargo en ese estado." : "Ningún atleta de la red ha disputado un cobro."}
          </Text>
        ) : (
          <Stack gap={6}>
            {filas.map((c) => {
              const abiertoCaso = estaAbierto(c);
              return (
                <Tarjeta
                  key={c.id}
                  etiqueta={`Abrir el contracargo de ${c.athlete_name} en ${c.gym_name}`}
                  onClick={() => setAbiertoId(c.id)}
                  aviso={abiertoCaso}
                  apagada={!abiertoCaso}
                >
                  <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" truncate>
                        <b>{c.gym_name}</b>{" "}
                        <Text span c="dimmed">
                          · {c.athlete_name} · {label(PAYMENT_CONCEPT, c.concept)}
                        </Text>
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                        {c.reason || "El banco no detalló el motivo."}
                      </Text>
                      {abiertoCaso && c.evidence_due_at && (
                        <Text size="xs" mt={2} c="var(--mantine-color-yellow-light-color)">
                          Responde antes del {fecha(c.evidence_due_at)}
                        </Text>
                      )}
                    </div>
                    <Stack gap={4} align="flex-end">
                      <Money value={c.total_lost} decimals={2} c="var(--nucleo-danger)" />
                      <Badge size="xs" variant="light" color={CHARGEBACK_STATUS_COLOR[c.status] ?? "gray"}>
                        {label(CHARGEBACK_STATUS, c.status)}
                      </Badge>
                    </Stack>
                  </Group>
                </Tarjeta>
              );
            })}
          </Stack>
        )}
      </GlassCard>

      <ContracargoModal caso={abierto} onClose={() => setAbiertoId(null)} />
    </div>
  );
}

/** El expediente completo y, si sigue abierto, el fallo del banco. */
function ContracargoModal({ caso, onClose }: { caso: Chargeback | null; onClose: () => void }) {
  const resolver = useResolvePlatformChargeback();
  const [nota, setNota] = useState("");
  const [paraId, setParaId] = useState<string | null>(null);
  if (caso && paraId !== caso.id) {
    setParaId(caso.id);
    setNota("");
  }

  const confirmar = async (result: "won" | "lost") => {
    if (!caso) return;
    try {
      await resolver.mutateAsync({ chargebackId: caso.id, result, notes: nota.trim() });
      notifications.show({
        color: result === "won" ? "teal" : "gray",
        message:
          result === "won"
            ? "Disputa ganada: se registró el pago de compensación y el ciclo del atleta vuelve si nadie más lo movió."
            : "Disputa perdida: la pérdida queda firme. La cuota ya se descontó del depósito del gimnasio y Nucleo no recupera su recargo.",
      });
      onClose();
    } catch (err) {
      notifications.show({
        color: "red",
        message: errMsg(err, "No se pudo resolver la disputa. ¿Ya estaba resuelta?"),
      });
    }
  };

  const enCurso = (r: "won" | "lost") => resolver.isPending && resolver.variables?.result === r;

  return (
    <Modal
      opened={!!caso}
      onClose={onClose}
      title={caso ? `${caso.gym_name} · ${caso.athlete_name}` : ""}
      centered
      size="lg"
    >
      {caso && (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
            <Group gap={6}>
              <Badge variant="light" color={CHARGEBACK_STATUS_COLOR[caso.status] ?? "gray"}>
                {label(CHARGEBACK_STATUS, caso.status)}
              </Badge>
              <Badge variant="light" color="flame">
                {label(PAYMENT_CONCEPT, caso.concept)}
              </Badge>
              <Text size="xs" c="dimmed">
                {new Date(caso.created_at).toLocaleString("es-GT")}
              </Text>
            </Group>
            <Money value={caso.total_lost} decimals={2} c="var(--nucleo-danger)" />
          </Group>

          <div>
            <Text size="sm">
              {caso.reason || "El banco no detalló el motivo."}
              {caso.reason_code ? ` (código ${caso.reason_code})` : ""}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Caso {caso.case_reference || "sin referencia"} · cuota del gym{" "}
              {fmtQ(caso.amount, { decimals: 2 })} + recargo de Nucleo {fmtQ(caso.surcharge, { decimals: 2 })}
              {caso.evidence_due_at ? ` · responde antes del ${fecha(caso.evidence_due_at)}` : ""}
            </Text>
          </div>

          {caso.evidence_submitted_at ? (
            <Box>
              <SectionLabel mb={4}>Evidencia del gimnasio · {fecha(caso.evidence_submitted_at)}</SectionLabel>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {caso.evidence_notes || "(sin descargo escrito)"}
              </Text>
              {caso.evidence_url && (
                <Text size="xs" mt={4} style={{ wordBreak: "break-all" }}>
                  <a href={caso.evidence_url} target="_blank" rel="noreferrer">
                    {caso.evidence_url}
                  </a>
                </Text>
              )}
            </Box>
          ) : estaAbierto(caso) ? (
            <Badge color="yellow" variant="light" w="fit-content">
              Sin evidencia del gimnasio
            </Badge>
          ) : null}

          {caso.resolution_notes && (
            <Text size="xs" c="dimmed">
              Resolución registrada: {caso.resolution_notes}
            </Text>
          )}

          {estaAbierto(caso) ? (
            <>
              <Textarea
                label="Nota de la resolución (opcional)"
                placeholder="Qué dijo el banco y con qué evidencia se cerró."
                value={nota}
                onChange={(e) => setNota(e.currentTarget.value)}
                autosize
                minRows={2}
              />
              {/* Quién absorbe lo decide el backend: la cuota sale del próximo
                  depósito del gimnasio y Nucleo pierde su recargo. */}
              <Text size="xs" c="dimmed">
                Si se pierde, la cuota sale del próximo depósito del gimnasio y Nucleo no recupera su recargo.
              </Text>
              <Group justify="flex-end" gap="xs">
                <Button
                  color="red"
                  variant="light"
                  loading={enCurso("lost")}
                  disabled={resolver.isPending && !enCurso("lost")}
                  onClick={() => confirmar("lost")}
                >
                  Disputa perdida
                </Button>
                <Button
                  loading={enCurso("won")}
                  disabled={resolver.isPending && !enCurso("won")}
                  onClick={() => confirmar("won")}
                >
                  El banco nos dio la razón
                </Button>
              </Group>
            </>
          ) : (
            <Text size="xs" c="dimmed">
              Resuelta el {caso.resolved_at ? fecha(caso.resolved_at) : "—"}.
            </Text>
          )}
        </Stack>
      )}
    </Modal>
  );
}
