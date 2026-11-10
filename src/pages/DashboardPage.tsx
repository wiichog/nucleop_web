import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Group, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { CheckCircle2 } from "lucide-react";
import { useDashboard, usePendingSummary } from "../api/hooks";
import type { PendingSummary } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { fmtQ } from "../lib/money";
import { PENDING_ITEMS } from "../lib/pending";
import { useAuth } from "../lib/auth";

/**
 * La portada del panel responde primero «¿qué tengo que atender hoy?»: los
 * pendientes en amarillo, cada uno lleva a la pantalla donde se resuelve. Después
 * cómo está la comunidad hoy y, al final, los números del periodo.
 */

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toIso(d: Date | null) {
  return d ? d.toLocaleDateString("en-CA") : "";
}

/**
 * Rótulo de una fila de «Clases más demandadas». El backend agrupa por servicio
 * **y** hora, así que el rótulo lleva las dos: «CrossFit 6:00» y «CrossFit 7:00»
 * en vez de dos «CrossFit» iguales.
 */
export function etiquetaClaseDemandada(c: { class_type: string; horario: string }) {
  const hora = c.horario.replace(/^0(\d)/, "$1");
  return hora ? `${c.class_type} ${hora}` : c.class_type;
}

export interface Pendiente {
  key: string;
  label: string;
  to: string;
  count: number;
}

/**
 * Lo que espera una decisión del gimnasio, en el orden de urgencia de
 * `PENDING_ITEMS`, sin los ceros.
 */
export function pendientesPorAtender(counts: PendingSummary | undefined): Pendiente[] {
  if (!counts) return [];
  return PENDING_ITEMS.map((i) => ({ key: i.key, label: i.label, to: i.to, count: counts[i.key] ?? 0 })).filter(
    (i) => i.count > 0,
  );
}

/** Una cifra que se toca para ir a donde se trabaja. `aviso` la pinta en amarillo. */
function Cifra({
  label,
  value,
  to,
  aviso,
}: {
  label: string;
  value: number | string;
  to?: string;
  aviso?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Tarjeta
      etiqueta={`${label}: ${value}`}
      onClick={to ? () => navigate(to) : undefined}
      aviso={aviso}
    >
      <Text size="xs" c="dimmed" lineClamp={2}>
        {label}
      </Text>
      <Text fw={700} fz={{ base: 20, sm: 22 }} className="a-tabular" mt={2}>
        {value}
      </Text>
    </Tarjeta>
  );
}

/** Lo que espera una decisión del gimnasio: la bandeja del día. */
function PorAtender({ gymId }: { gymId: string }) {
  const navigate = useNavigate();
  const pending = usePendingSummary(gymId);
  const items = pendientesPorAtender(pending.data);
  const total = items.reduce((acc, i) => acc + i.count, 0);

  return (
    <GlassCard delay={0.5} padding={18}>
      <Encabezado
        titulo="Por atender"
        avisos={
          total > 0 && (
            <Badge color="yellow" variant="light">
              {total}
            </Badge>
          )
        }
      />
      {pending.isError ? (
        <PageError message="No se pudieron cargar tus pendientes." onRetry={() => pending.refetch()} />
      ) : pending.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando…
        </Text>
      ) : items.length === 0 ? (
        <Group gap="xs">
          <CheckCircle2 size={19} color="var(--mantine-color-teal-5)" strokeWidth={1.9} />
          <Text fw={600} size="sm">
            Todo al día
          </Text>
        </Group>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {items.map((i) => (
            <Tarjeta key={i.key} aviso etiqueta={`${i.label}: ${i.count}`} onClick={() => navigate(i.to)}>
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Text size="sm" fw={600} style={{ minWidth: 0 }}>
                  {i.label}
                </Text>
                <Text fw={700} fz={20} className="a-tabular">
                  {i.count}
                </Text>
              </Group>
              <Text size="xs" mt={4} c="var(--mantine-color-yellow-light-color)">
                Resolver →
              </Text>
            </Tarjeta>
          ))}
        </SimpleGrid>
      )}
    </GlassCard>
  );
}

/** Cómo está la comunidad hoy. No depende del periodo. */
function Hoy({
  gymId,
  activos,
  porVencer,
  servicios,
}: {
  gymId: string;
  activos?: number;
  porVencer?: number;
  servicios?: number;
}) {
  // Mientras carga, un 0 mentiría («no hay clases sin coach»): va un guion.
  const counts = usePendingSummary(gymId).data;
  const sinCoach = counts?.clases_sin_coach ?? 0;
  const enRiesgo = counts?.en_riesgo ?? 0;
  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Hoy" />
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
        <Cifra label="Atletas activos" value={activos ?? "—"} to="/panel/atletas" />
        <Cifra
          label="Clases de hoy sin coach"
          value={counts ? sinCoach : "—"}
          to="/panel/clases?tab=classes"
          aviso={sinCoach > 0}
        />
        <Cifra label="Por vencer" value={porVencer ?? "—"} to="/panel/atletas?filtro=por_vencer" />
        <Cifra label="En riesgo" value={counts ? enRiesgo : "—"} to="/panel/atletas?filtro=en_riesgo" />
        <Cifra label="Servicios activos" value={servicios ?? "—"} to="/panel/clases?tab=services" />
      </SimpleGrid>
    </GlassCard>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  // El rango se aplica cuando las dos fechas están puestas: a medio elegir, la
  // consulta sin rango traería otro periodo y los números brincarían.
  const [rango, setRango] = useState<[Date | null, Date | null]>([firstOfMonth(), new Date()]);
  const [periodo, setPeriodo] = useState<[Date, Date]>([firstOfMonth(), new Date()]);
  const dashboard = useDashboard(gymId, toIso(periodo[0]), toIso(periodo[1]));

  if (!gymId) return <NoGymAssigned />;

  const d = dashboard.data;
  // El corte (top 5) lo decide el backend; aquí se muestran todas las que lleguen.
  const demanda = d?.clases_mas_demandadas ?? [];
  const maxDemanda = Math.max(1, ...demanda.map((c) => c.reservas));

  return (
    <div>
      <PageHeader kicker="Operación" title="Tu gimnasio hoy" />

      <Stack gap="lg">
        <PorAtender gymId={gymId} />

        <Hoy
          gymId={gymId}
          activos={d?.atletas_activos}
          porVencer={d?.proximos_vencimientos}
          servicios={d?.servicios_activos}
        />

        <GlassCard delay={0.7} padding={18}>
          <Encabezado titulo="Periodo">
            <DatePickerInput
              type="range"
              aria-label="Periodo"
              value={rango}
              onChange={(v) => {
                setRango(v);
                if (v[0] && v[1]) setPeriodo([v[0], v[1]]);
              }}
              valueFormat="DD/MM/YYYY"
              size="sm"
              w={{ base: "100%", sm: 260 }}
            />
            <Button variant="subtle" size="sm" onClick={() => navigate("/panel/reportes")}>
              Reportes →
            </Button>
          </Encabezado>

          {dashboard.isError ? (
            <PageError onRetry={() => dashboard.refetch()} />
          ) : dashboard.isLoading || !d ? (
            <Text size="sm" c="dimmed">
              Cargando…
            </Text>
          ) : (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <Cifra label="Ingresos" value={fmtQ(d.ingresos_total)} to="/panel/pagos" />
                <Cifra label="Tarjeta" value={fmtQ(d.ingresos_tarjeta)} to="/panel/pagos" />
                <Cifra label="Manual" value={fmtQ(d.ingresos_manual)} to="/panel/pagos" />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
                <Cifra label="Pagos" value={d.pagos ?? 0} to="/panel/pagos" />
                <Cifra label="Nuevos atletas" value={d.nuevos_atletas ?? 0} to="/panel/atletas" />
                <Cifra label="Check-ins" value={d.checkins ?? 0} to="/panel/clases?tab=classes" />
                <Cifra label="Workouts publicados" value={d.wods_publicados ?? 0} to="/panel/clases?tab=wod" />
                <Cifra label="Scores subidos" value={d.resultados_wod ?? 0} to="/panel/clases?tab=wod" />
                <Cifra label="PRs nuevos" value={d.prs_nuevos ?? 0} />
              </SimpleGrid>

              <div>
                <Text fw={600} size="sm" mb="xs">
                  Clases más demandadas
                </Text>
                {demanda.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Sin reservas en el periodo.
                  </Text>
                ) : (
                  <Stack gap={8}>
                    {demanda.map((c) => {
                      const etiqueta = etiquetaClaseDemandada(c);
                      return (
                        <div key={etiqueta}>
                          <Group justify="space-between" gap="sm" mb={3} wrap="nowrap">
                            <Text size="sm" truncate>
                              {etiqueta}
                            </Text>
                            <Text size="sm" fw={600} className="a-tabular">
                              {c.reservas}
                            </Text>
                          </Group>
                          <Progress
                            value={(c.reservas / maxDemanda) * 100}
                            size="sm"
                            color="flame"
                            aria-label={`${etiqueta}: ${c.reservas} reservas`}
                          />
                        </div>
                      );
                    })}
                  </Stack>
                )}
              </div>
            </Stack>
          )}
        </GlassCard>
      </Stack>
    </div>
  );
}
