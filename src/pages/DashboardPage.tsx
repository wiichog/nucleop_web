import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Divider, Group, SimpleGrid, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Dumbbell,
  Flame,
  Receipt,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useDashboard, usePendingSummary } from "../api/hooks";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { CountBadge, PageHeader, SectionLabel } from "../components/ui";
import {
  BigMetric,
  GlassCard,
  MetricTile,
  Stagger,
  WaveChart,
} from "../components/aurora";
import { fmtQ } from "../lib/money";
import { PENDING_ITEMS } from "../lib/pending";
import { useAuth } from "../lib/auth";

/**
 * Dashboard = vitrina del lenguaje **Aurora**. Reproduce la composición del
 * dashboard de la referencia: hero a la izquierda, cifra protagonista, la onda
 * que se dibuja sola, y un rail de tarjetas de vidrio a la derecha con el
 * estado actual del gimnasio.
 */

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toIso(d: Date | null) {
  return d ? d.toLocaleDateString("en-CA") : "";
}

/** Pendientes por resolver: la bandeja de entrada del operador. */
function PendingPanel({ gymId }: { gymId: string }) {
  const navigate = useNavigate();
  const pending = usePendingSummary(gymId);
  const counts = pending.data;
  if (!counts) return null;

  const activos = PENDING_ITEMS.filter((i) => (counts[i.key] ?? 0) > 0);

  if (activos.length === 0) {
    return (
      <GlassCard padding={16} className="a-rise" style={{ marginBottom: "calc(18 * var(--u))" }}>
        <Group gap="xs">
          <CheckCircle2 size={19} color="var(--mantine-color-teal-5)" strokeWidth={1.9} />
          <Text fw={600} size="sm">
            Todo al día
          </Text>
          <Text c="dimmed" size="sm">
            No hay pendientes por aprobar.
          </Text>
        </Group>
      </GlassCard>
    );
  }

  return (
    <div style={{ marginBottom: "calc(18 * var(--u))" }}>
      <SectionLabel mb={10} as="h2">Pendientes por resolver · {counts.total}</SectionLabel>
      <Stagger
        from={0.52}
        style={{ display: "flex", flexWrap: "wrap", gap: "calc(10 * var(--u))" }}
      >
        {activos.map((item) => (
          <button
            key={item.key}
            type="button"
            className="a-chip a-lift"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(item.to)}
          >
            {item.label}
            <CountBadge count={counts[item.key] ?? 0} />
          </button>
        ))}
      </Stagger>
    </div>
  );
}

export function DashboardPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [from, setFrom] = useState<Date | null>(firstOfMonth());
  const [to, setTo] = useState<Date | null>(new Date());
  const dashboard = useDashboard(gymId, toIso(from), toIso(to));

  if (!gymId) return <NoGymAssigned />;
  if (dashboard.isError) return <PageError onRetry={() => dashboard.refetch()} />;

  const d = dashboard.data;
  const demanda = (d?.clases_mas_demandadas ?? []).slice(0, 6);

  return (
    <div>
      <PageHeader
        kicker="Operación"
        title="Tu gimnasio, en un vistazo"
        subtitle="Ingresos, actividad y estado de la comunidad en el periodo seleccionado. Todo lo que necesitas revisar antes de abrir el box."
      />

      <PendingPanel gymId={gymId} />

      {/* Retícula de la referencia: columna principal + rail de tarjetas. */}
      <div className="a-dash-grid">
        {/* ── Columna principal ────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "calc(20 * var(--u))" }}>
          <GlassCard padding={16} delay={0.6}>
            <Group gap="md" wrap="wrap" align="flex-end">
              <SectionLabel mb={0}>Periodo</SectionLabel>
              <DatePickerInput
                label="Desde"
                value={from}
                onChange={setFrom}
                valueFormat="YYYY-MM-DD"
                size="sm"
              />
              <DatePickerInput
                label="Hasta"
                value={to}
                onChange={setTo}
                valueFormat="YYYY-MM-DD"
                size="sm"
              />
            </Group>
          </GlassCard>

          {dashboard.isLoading || !d ? (
            <PageLoading label="Cargando KPIs…" />
          ) : (
            <>
              {/* Cifra protagonista: el equivalente del "10°C" de la referencia. */}
              <GlassCard variant="core" sheen padding={26} delay={0.7}>
                <BigMetric
                  label="Ingresos del periodo"
                  value={fmtQ(d.ingresos_total)}
                  fz="clamp(34px, calc(58 * var(--u)), 68px)"
                  delay={1.04}
                />
                <Group
                  gap="lg"
                  mt="lg"
                  className="a-rise"
                  style={{ animationDelay: "1.16s" }}
                  wrap="wrap"
                >
                  <div>
                    <SectionLabel mb={4}>Tarjeta</SectionLabel>
                    <Text fw={600} className="a-tabular">
                      {fmtQ(d.ingresos_tarjeta)}
                    </Text>
                  </div>
                  <Divider orientation="vertical" />
                  <div>
                    <SectionLabel mb={4}>Manual</SectionLabel>
                    <Text fw={600} className="a-tabular">
                      {fmtQ(d.ingresos_manual)}
                    </Text>
                  </div>
                </Group>

                <Group
                  justify="space-between"
                  mt="xl"
                  wrap="wrap"
                  gap="md"
                  className="a-rise"
                  style={{ animationDelay: "1.28s" }}
                >
                  <Group gap={7}>
                    <Receipt size={16} strokeWidth={1.8} style={{ opacity: 0.75 }} />
                    <Text size="sm" fw={500}>
                      {d.pagos ?? 0} pagos
                    </Text>
                  </Group>
                  <Group gap={7}>
                    <UserPlus size={16} strokeWidth={1.8} style={{ opacity: 0.75 }} />
                    <Text size="sm" fw={500}>
                      {d.nuevos_atletas ?? 0} nuevos atletas
                    </Text>
                  </Group>
                  <Group gap={7}>
                    <Activity size={16} strokeWidth={1.8} style={{ opacity: 0.75 }} />
                    <Text size="sm" fw={500}>
                      {d.checkins ?? 0} check-ins
                    </Text>
                  </Group>
                </Group>
              </GlassCard>

              {/* La firma gráfica: la onda se traza sola y el relleno la sigue. */}
              <GlassCard padding={24} delay={0.82}>
                <SectionLabel mb={14} as="h2">Clases más demandadas</SectionLabel>
                {demanda.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Sin reservas registradas en el periodo.
                  </Text>
                ) : (
                  <WaveChart
                    values={demanda.map((c) => c.reservas)}
                    labels={demanda.map((c) => c.class_type)}
                    formatValue={(v) => v}
                    height={190}
                    delay={1.5}
                  />
                )}
              </GlassCard>

              <div>
                <SectionLabel mb={12} as="h2">Entrenamiento en el periodo</SectionLabel>
                <Stagger from={1.0}>
                  <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                    <MetricTile
                      label="WODs publicados"
                      value={d.wods_publicados ?? 0}
                      icon={<Flame size={16} strokeWidth={1.8} />}
                      tone="var(--nucleo-accent)"
                    />
                    <MetricTile
                      label="Resultados de WOD"
                      value={d.resultados_wod ?? 0}
                      icon={<Trophy size={16} strokeWidth={1.8} />}
                    />
                    <MetricTile
                      label="Nuevos PRs"
                      value={d.prs_nuevos ?? 0}
                      icon={<Dumbbell size={16} strokeWidth={1.8} />}
                    />
                    <MetricTile
                      label="Servicios activos"
                      value={d.servicios_activos ?? 0}
                      icon={<CalendarClock size={16} strokeWidth={1.8} />}
                    />
                  </SimpleGrid>
                </Stagger>
              </div>
            </>
          )}
        </div>

        {/* ── Rail derecho: el estado actual del gimnasio ───────────────── */}
        {d && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "calc(20 * var(--u))",
              position: "sticky",
              top: "calc(var(--a-header-h) + 12 * var(--u))",
            }}
          >
            <GlassCard variant="big" sheen padding={24} delay={0.8}>
              <Group gap={7} mb="lg" className="a-rise" style={{ animationDelay: "1.04s" }}>
                <Users size={16} strokeWidth={1.9} style={{ opacity: 0.85 }} />
                <Text fw={600} size="sm">
                  Atletas activos
                </Text>
              </Group>
              <BigMetric value={d.atletas_activos ?? 0} delay={1.16} />
              <Text size="sm" c="dimmed" mt="md" className="a-rise" style={{ animationDelay: "1.28s" }}>
                Membresías vigentes en este gimnasio.
              </Text>
            </GlassCard>

            <GlassCard delay={0.92} padding={20}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <div className="a-kicker">Cobranza</div>
                  <Text fw={600} fz="lg" mt={5} style={{ letterSpacing: "-0.02em" }}>
                    Morosos
                  </Text>
                </div>
                <div className="a-metric a-metric--sm" style={{ color: "var(--nucleo-danger)" }}>
                  {d.morosos ?? 0}
                </div>
              </Group>
            </GlassCard>

            <GlassCard delay={1.03} padding={20}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <div className="a-kicker">Retención</div>
                  <Text fw={600} fz="lg" mt={5} style={{ letterSpacing: "-0.02em" }}>
                    Por vencer
                  </Text>
                </div>
                <div className="a-metric a-metric--sm" style={{ color: "var(--nucleo-warning)" }}>
                  {d.proximos_vencimientos ?? 0}
                </div>
              </Group>
            </GlassCard>

            <GlassCard delay={1.14} padding={20}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <div className="a-kicker">Catálogo</div>
                  <Text fw={600} fz="lg" mt={5} style={{ letterSpacing: "-0.02em" }}>
                    Servicios
                  </Text>
                </div>
                <div className="a-metric a-metric--sm">{d.servicios_activos ?? 0}</div>
              </Group>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
