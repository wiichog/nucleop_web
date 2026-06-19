import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, Group, SimpleGrid, Table, Text, Title, UnstyledButton } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useDashboard, usePendingSummary } from "../api/hooks";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { PENDING_ITEMS } from "../lib/pending";
import { useAuth } from "../lib/auth";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toIso(d: Date | null) {
  return d ? d.toLocaleDateString("en-CA") : "";
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card>
      <Text c="dimmed" size="sm" mb={4}>
        {label}
      </Text>
      <Text fw={700} fz={{ base: 22, sm: 28 }} c={tone} ff='"Space Grotesk", sans-serif'>
        {value}
      </Text>
    </Card>
  );
}

function PendingPanel({ gymId }: { gymId: string }) {
  const navigate = useNavigate();
  const pending = usePendingSummary(gymId);
  const counts = pending.data;
  if (!counts) return null;

  const activos = PENDING_ITEMS.filter((i) => (counts[i.key] ?? 0) > 0);

  if (activos.length === 0) {
    return (
      <Card mb="lg" withBorder>
        <Group gap="xs">
          <CheckCircle2 size={20} color="var(--mantine-color-teal-5)" />
          <Text fw={600}>Todo al día</Text>
          <Text c="dimmed" size="sm">
            No hay pendientes por aprobar.
          </Text>
        </Group>
      </Card>
    );
  }

  return (
    <Card mb="lg" withBorder>
      <Group mb="md" gap="xs">
        <BellRing size={18} color="var(--mantine-color-flame-5)" />
        <Text fw={700} ff='"Space Grotesk", sans-serif'>
          Pendientes por resolver
        </Text>
        <Badge color="flame" variant="filled" ml={4}>
          {counts.total}
        </Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
        {activos.map((item) => (
          <UnstyledButton
            key={item.key}
            onClick={() => navigate(item.to)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--mantine-color-default-border)",
              background: "var(--mantine-color-body)",
            }}
          >
            <Text size="sm" style={{ lineHeight: 1.2 }}>
              {item.label}
            </Text>
            <Badge color="flame" variant="filled" size="lg" circle>
              {counts[item.key]}
            </Badge>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Card>
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

  return (
    <div>
      <PageHeader title="Dashboard del gimnasio" subtitle="Ingresos y actividad del periodo" />

      <PendingPanel gymId={gymId} />

      <Card mb="lg">
        <Group>
          <Text fw={600} style={{ marginRight: "auto" }}>
            Periodo
          </Text>
          <DatePickerInput label="Desde" value={from} onChange={setFrom} valueFormat="YYYY-MM-DD" />
          <DatePickerInput label="Hasta" value={to} onChange={setTo} valueFormat="YYYY-MM-DD" />
        </Group>
      </Card>

      {dashboard.isLoading || !d ? (
        <PageLoading label="Cargando KPIs…" />
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md" mb="lg">
            <Kpi label="Ingresos del periodo" value={`Q${d.ingresos_total ?? 0}`} tone="flame" />
            <Kpi label="Ingresos tarjeta" value={`Q${d.ingresos_tarjeta ?? 0}`} />
            <Kpi label="Ingresos manuales" value={`Q${d.ingresos_manual ?? 0}`} />
            <Kpi label="Pagos" value={d.pagos ?? 0} />
            <Kpi label="Nuevos atletas" value={d.nuevos_atletas ?? 0} />
            <Kpi label="Check-ins" value={d.checkins ?? 0} />
          </SimpleGrid>

          <Text c="dimmed" mb="xs">
            Entrenamiento (periodo)
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
            <Kpi label="WODs publicados" value={d.wods_publicados ?? 0} tone="flame" />
            <Kpi label="Resultados de WOD" value={d.resultados_wod ?? 0} />
            <Kpi label="Nuevos PRs" value={d.prs_nuevos ?? 0} />
            <Kpi label="Servicios activos" value={d.servicios_activos ?? 0} />
          </SimpleGrid>

          <Text c="dimmed" mb="xs">
            Estado actual del gimnasio
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
            <Kpi label="Atletas activos" value={d.atletas_activos ?? 0} />
            <Kpi label="Morosos" value={d.morosos ?? 0} tone="red" />
            <Kpi label="Por vencer" value={d.proximos_vencimientos ?? 0} tone="yellow" />
          </SimpleGrid>

          <Card>
            <Title order={3} mb="sm">
              Clases más demandadas
            </Title>
            {!d.clases_mas_demandadas.length ? (
              <Text c="dimmed" size="sm">
                Sin reservas registradas.
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Clase</Table.Th>
                    <Table.Th>Horario</Table.Th>
                    <Table.Th>Reservas</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {d.clases_mas_demandadas.map((c, i) => (
                    <Table.Tr key={`${c.class_type}-${c.horario}-${i}`}>
                      <Table.Td>{c.class_type}</Table.Td>
                      <Table.Td>{c.horario}</Table.Td>
                      <Table.Td>{c.reservas}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
