import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { usePlatformChargebacks, useResolvePlatformChargeback } from "../api/hooks";
import type { Chargeback } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { Money, PageHeader, SectionLabel } from "../components/ui";
import { GlassCard, MetricTile, Stagger } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { fmtQ, toNumber } from "../lib/money";
import { useAuth } from "../lib/auth";
import { CHARGEBACK_STATUS, CHARGEBACK_STATUS_COLOR, PAYMENT_CONCEPT, label } from "../lib/labels";

/**
 * Bandeja de contracargos de TODA la red. Es de plataforma y no del gimnasio por
 * una razón de dinero: con la custodia puente (`PAGALO.SUPPORTS_SPLIT=False`) el
 * 100 % de lo cobrado con tarjeta cae en la cuenta de Nucleo y se deposita al gym
 * a fin de mes. Si el atleta disputa dos meses después, el banco le quita el
 * dinero a **Nucleo** cuando el gym ya cobró: el descubierto lo absorbe la
 * plataforma, así que es la plataforma la que tiene que estar mirando esta lista.
 *
 * El gym responde con su evidencia desde su propia pantalla de pagos; aquí sólo
 * se registra el FALLO del banco, que es lo único que mueve dinero de vuelta.
 */
export function PlatformChargebacksPage() {
  const { isSuperuser } = useAuth();
  const [estado, setEstado] = useState<string>("");
  const casos = usePlatformChargebacks({ status: estado || undefined }, isSuperuser);
  const resolver = useResolvePlatformChargeback();

  const [resolucion, setResolucion] = useState<{
    caso: Chargeback;
    result: "won" | "lost";
  } | null>(null);
  const [nota, setNota] = useState("");

  const filas = useMemo(() => casos.data ?? [], [casos.data]);
  // Sólo cuentan las disputas que todavía pueden mover dinero: una ganada volvió
  // y una perdida ya está contabilizada.
  const expuesto = useMemo(
    () =>
      filas
        .filter((c) => c.status === "open" || c.status === "submitted")
        .reduce((total, c) => total + toNumber(c.total_lost), 0),
    [filas],
  );
  const perdido = useMemo(
    () => filas.filter((c) => c.status === "lost").reduce((t, c) => t + toNumber(c.total_lost), 0),
    [filas],
  );
  const sinResolver = filas.filter((c) => c.status === "open" || c.status === "submitted").length;

  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Contracargos de la red" />
        <EmptyState title="Sin acceso" description="Esta bandeja es del equipo de Nucleo." />
      </Stack>
    );
  }

  const confirmar = async () => {
    if (!resolucion) return;
    try {
      await resolver.mutateAsync({
        chargebackId: resolucion.caso.id,
        result: resolucion.result,
        notes: nota.trim(),
      });
      notifications.show({
        color: resolucion.result === "won" ? "teal" : "gray",
        message:
          resolucion.result === "won"
            ? "Disputa ganada: se registró el pago de compensación y el ciclo del atleta vuelve si nadie más lo movió."
            : "Disputa perdida: la pérdida queda firme en el estado de cuenta del gimnasio.",
      });
      setResolucion(null);
      setNota("");
    } catch (err) {
      notifications.show({
        color: "red",
        message: errMsg(err, "No se pudo resolver la disputa. ¿Ya estaba resuelta?"),
      });
    }
  };

  return (
    <Stack>
      <PageHeader
        kicker="Plataforma · Cobranza"
        title="Contracargos de la red"
        subtitle="Disputas de tarjeta de todos los gimnasios. Con la custodia puente el descubierto lo absorbe Nucleo hasta que el banco falle."
      />

      <Stagger from={0.6}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <MetricTile
            label="En disputa"
            value={casos.isLoading ? "—" : fmtQ(expuesto, { decimals: 2 })}
            tone="var(--nucleo-accent)"
            hint="Dinero que el banco ya retiró y que todavía se puede recuperar respondiendo a tiempo."
          />
          <MetricTile
            label="Casos sin resolver"
            value={casos.isLoading ? "—" : sinResolver}
            hint="Recibidos o con evidencia enviada, esperando el fallo del banco."
          />
          <MetricTile
            label="Pérdida firme"
            value={casos.isLoading ? "—" : fmtQ(perdido, { decimals: 2 })}
            hint="Disputas ya perdidas. No vuelven: son el costo real del fraude y del servicio no reconocido."
          />
        </SimpleGrid>
      </Stagger>

      <GlassCard variant="core" delay={0.84}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="md">
          <SectionLabel mb={0} as="h2">
            Expedientes
          </SectionLabel>
          <SegmentedControl
            value={estado}
            onChange={setEstado}
            data={[
              { value: "", label: "Todos" },
              { value: "open", label: "Recibidos" },
              { value: "submitted", label: "Con evidencia" },
              { value: "won", label: "Ganados" },
              { value: "lost", label: "Perdidos" },
            ]}
          />
        </Group>

        {casos.isError ? (
          <PageError
            message={errMsg(casos.error, "No se pudieron cargar los contracargos.")}
            onRetry={() => casos.refetch()}
          />
        ) : casos.isLoading ? (
          <PageLoading />
        ) : !filas.length ? (
          <Text c="dimmed" size="sm">
            {estado
              ? "Ningún contracargo en ese estado."
              : "Ningún atleta de la red ha disputado un cobro."}
          </Text>
        ) : (
          <Stack gap="sm">
            {filas.map((c) => (
              <Box
                key={c.id}
                p="sm"
                style={{ border: "1px solid var(--a-line)", borderRadius: "calc(16 * var(--u))" }}
              >
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6} mb={6}>
                      <Badge
                        size="xs"
                        variant="light"
                        color={CHARGEBACK_STATUS_COLOR[c.status] ?? "gray"}
                      >
                        {label(CHARGEBACK_STATUS, c.status)}
                      </Badge>
                      <Badge size="xs" variant="light" color="flame">
                        {label(PAYMENT_CONCEPT, c.concept)}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {c.gym_name} · {c.athlete_name} ·{" "}
                        {new Date(c.created_at).toLocaleString("es-GT")}
                      </Text>
                    </Group>
                    <Text size="sm">
                      {c.reason || "El banco no detalló el motivo."}
                      {c.reason_code ? ` (código ${c.reason_code})` : ""}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Caso {c.case_reference || "sin referencia"} · cuota del gym{" "}
                      {fmtQ(c.amount, { decimals: 2 })} + recargo de Nucleo{" "}
                      {fmtQ(c.surcharge, { decimals: 2 })}
                      {c.evidence_due_at
                        ? ` · responde antes del ${new Date(c.evidence_due_at).toLocaleDateString("es-GT")}`
                        : ""}
                    </Text>
                  </div>
                  <Money value={c.total_lost} decimals={2} c="var(--nucleo-danger)" />
                </Group>

                {c.evidence_submitted_at && (
                  <Box mt="sm">
                    <SectionLabel mb={4}>
                      Evidencia del gimnasio ·{" "}
                      {new Date(c.evidence_submitted_at).toLocaleDateString("es-GT")}
                    </SectionLabel>
                    <Text size="sm" c="dimmed">
                      {c.evidence_notes || "(sin descargo escrito)"}
                    </Text>
                    {c.evidence_url && (
                      <Text size="xs" mt={4}>
                        <a href={c.evidence_url} target="_blank" rel="noreferrer">
                          {c.evidence_url}
                        </a>
                      </Text>
                    )}
                  </Box>
                )}

                {c.resolution_notes && (
                  <Text size="xs" c="dimmed" mt={8}>
                    Resolución registrada: {c.resolution_notes}
                  </Text>
                )}

                {c.status === "open" || c.status === "submitted" ? (
                  <Group gap="xs" mt="sm">
                    <Button
                      size="xs"
                      onClick={() => {
                        setResolucion({ caso: c, result: "won" });
                        setNota("");
                      }}
                    >
                      El banco nos dio la razón
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      color="red"
                      onClick={() => {
                        setResolucion({ caso: c, result: "lost" });
                        setNota("");
                      }}
                    >
                      Disputa perdida
                    </Button>
                  </Group>
                ) : (
                  <Text size="xs" c="dimmed" mt="sm">
                    Resuelta el{" "}
                    {c.resolved_at ? new Date(c.resolved_at).toLocaleDateString("es-GT") : "—"}.
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>

      <Modal
        opened={!!resolucion}
        onClose={() => setResolucion(null)}
        title={resolucion?.result === "won" ? "Disputa ganada" : "Disputa perdida"}
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {resolucion?.result === "won"
              ? "Se registra un pago POSITIVO de compensación (el movimiento negativo no se edita nunca) y se le devuelve el ciclo a la membresía sólo si nadie más la movió mientras tanto."
              : "La pérdida queda firme: el descuento ya aplicado al depósito del gimnasio no se revierte."}
          </Text>
          <Textarea
            label="Nota de la resolución (opcional)"
            placeholder="Qué dijo el banco y con qué evidencia se cerró."
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResolucion(null)}>
              Cancelar
            </Button>
            <Button
              color={resolucion?.result === "won" ? undefined : "red"}
              loading={resolver.isPending}
              onClick={confirmar}
            >
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
