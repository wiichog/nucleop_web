import { useState } from "react";
import { Card, Group, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDashboard } from "../api/hooks";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
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
