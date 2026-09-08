import { Anchor, Group, Progress, Stack, Table, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { PhoneCall } from "lucide-react";
import { fetchPipeline } from "../api/onboarding";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard, MetricTile, Stagger } from "../components/aurora";
import { ApplicationsSection } from "../components/onboarding/ApplicationsSection";
import { InvitationsSection } from "../components/onboarding/InvitationsSection";
import { ESTADO_ENLACE, ESTADO_SOLICITUD } from "../components/onboarding/labels";
import { errMsg } from "../lib/errors";
import { label } from "../lib/labels";
import { useAuth } from "../lib/auth";

/**
 * Altas de gimnasios (`/panel/plataforma/altas`): el embudo del contrato digital.
 *
 * Es del equipo de Nucleo, no de los gimnasios: el backend reserva todo `/platform/*`
 * a `IsSuperadmin` y aquí no existe una variante filtrada por gym.
 *
 * El orden de la pantalla es el del trabajo real: primero **a quién hay que llamar**
 * (quien abrió su enlace y se atoró), después los enlaces y al final la bandeja de
 * contratos firmados. Un embudo que solo cuenta totales no le dice a nadie qué hacer
 * hoy; la lista de atorados sí.
 */

const ORDEN_SOLICITUDES = ["received", "in_review", "approved", "rejected"];
const ORDEN_ENLACES = ["active", "used", "revoked", "expired"];

const RETICULA = {
  display: "grid",
  gap: "var(--mantine-spacing-md)",
  gridTemplateColumns: "repeat(auto-fit, minmax(calc(150 * var(--u)), 1fr))",
  marginBottom: "calc(20 * var(--u))",
} as const;

const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function PlatformOnboardingPage() {
  const { isSuperuser } = useAuth();
  const embudo = useQuery({
    queryKey: ["onboarding-pipeline"],
    queryFn: fetchPipeline,
    enabled: isSuperuser,
  });

  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Altas de gimnasios" />
        <EmptyState
          title="Sin acceso"
          description="El alta de gimnasios la opera el equipo de Nucleo."
        />
      </Stack>
    );
  }

  const datos = embudo.data;
  const atorados = datos?.stuck ?? [];

  return (
    <div>
      <PageHeader
        kicker="Plataforma · Altas"
        title="Altas de gimnasios"
        subtitle="El contrato digital de punta a punta: a quién le mandaste el enlace, quién se atoró llenándolo y qué contratos ya están firmados esperando montaje."
      />

      {embudo.isError ? (
        <PageError
          message={errMsg(embudo.error, "No se pudo cargar el embudo.")}
          onRetry={() => embudo.refetch()}
        />
      ) : embudo.isLoading ? (
        <PageLoading />
      ) : (
        datos && (
          <>
            <SectionLabel as="h2">Solicitudes</SectionLabel>
            <Stagger from={0.52} style={RETICULA}>
              {ORDEN_SOLICITUDES.map((estado) => (
                <MetricTile
                  key={estado}
                  label={label(ESTADO_SOLICITUD, estado)}
                  value={datos.applications[estado] ?? 0}
                />
              ))}
            </Stagger>

            <SectionLabel as="h2">Enlaces</SectionLabel>
            <Stagger from={0.62} style={RETICULA}>
              {ORDEN_ENLACES.map((estado) => (
                <MetricTile
                  key={estado}
                  label={label(ESTADO_ENLACE, estado)}
                  value={datos.invitations[estado] ?? 0}
                />
              ))}
            </Stagger>

            <SectionLabel as="h2">A quién llamar</SectionLabel>
            {/* Abrieron el enlace y no lo enviaron. Es la única lista de esta pantalla
                que pide una acción fuera del panel: levantar el teléfono. */}
            {!atorados.length ? (
              <EmptyState
                icon={PhoneCall}
                title="Nadie atorado"
                description="Todos los que abrieron su enlace lo terminaron de enviar."
              />
            ) : (
              <GlassCard padding={12} style={{ marginBottom: "calc(20 * var(--u))" }}>
                <Table.ScrollContainer minWidth={640}>
                  <Table verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Prospecto</Table.Th>
                        <Table.Th>Avance</Table.Th>
                        <Table.Th>Aperturas</Table.Th>
                        <Table.Th>Última vez</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {atorados.map((a) => (
                        <Table.Tr key={a.id}>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {a.gym_name || a.email}
                            </Text>
                            <Anchor href={`mailto:${a.email}`} size="xs">
                              {a.email}
                            </Anchor>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={8} wrap="nowrap">
                              <Progress value={a.percent} size="xs" color="flame" w={72} />
                              <Text size="xs" c="dimmed">
                                {a.percent}%
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{a.opened_count}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {fechaHora(a.last_opened_at)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </GlassCard>
            )}
          </>
        )
      )}

      <Stack gap="xl" mt="xl">
        <InvitationsSection />
        <ApplicationsSection />
      </Stack>
    </div>
  );
}
