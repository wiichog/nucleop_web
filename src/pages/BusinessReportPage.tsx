import { useState, type ReactNode } from "react";
import { Card, Group, Select, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useBranches, useErpPnl } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

function Delta({ value }: { value: number | null }) {
  if (value === null) return <Text c="dimmed" span size="xs">—</Text>;
  const up = value >= 0;
  return (
    <Text span size="xs" c={up ? "teal" : "red"}>
      {up ? "▲" : "▼"} {Math.abs(value)}% vs. periodo anterior
    </Text>
  );
}

function Metric({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: boolean;
  sub?: ReactNode;
}) {
  return (
    <Card>
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text fw={700} fz={{ base: 20, sm: 24 }} c={accent ? "flame" : undefined} ff='"Space Grotesk", sans-serif'>
        {value}
      </Text>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

export function BusinessReportPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [from, setFrom] = useState<Date | null>(firstOfMonth());
  const [to, setTo] = useState<Date | null>(new Date());
  const [branch, setBranch] = useState<string | null>("");
  const { data: branches } = useBranches(gymId);
  const { data, isLoading, isError, refetch } = useErpPnl(gymId, iso(from), iso(to), branch || undefined);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader title="Reportes de negocio" subtitle="Rentabilidad, márgenes y líneas de ingreso." />

      <Card mb="lg">
        <Group align="flex-end" gap="md">
          <DatePickerInput label="Desde" value={from} onChange={setFrom} valueFormat="YYYY-MM-DD" />
          <DatePickerInput label="Hasta" value={to} onChange={setTo} valueFormat="YYYY-MM-DD" />
          {(branches ?? []).length > 0 && (
            <Select
              label="Sede"
              placeholder="Todas"
              value={branch}
              onChange={setBranch}
              clearable
              data={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
        </Group>
      </Card>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <PageError onRetry={() => refetch()} />
      ) : !data ? (
        <EmptyState title="Sin datos" description="No hay actividad en el período seleccionado." />
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md" mb="lg">
            <Metric label="Ingresos totales" value={`Q${data.gross_revenue}`} sub={<Delta value={data.delta_revenue_pct} />} />
            <Metric label="Costo directo (COGS)" value={`Q${data.direct_cost}`} />
            <Metric
              label="Margen bruto"
              value={`Q${data.gross_margin}`}
              sub={<Text span size="xs" c="dimmed">{data.gross_margin_pct}%</Text>}
            />
            <Metric label="Pérdidas (mermas)" value={`Q${data.losses}`} />
            <Metric label="Gastos operativos" value={`Q${data.expenses}`} />
            <Metric
              label="Utilidad neta"
              value={`Q${data.net_profit}`}
              accent
              sub={
                <>
                  <Text span size="xs" c="dimmed">{data.net_margin_pct}% </Text>
                  <Delta value={data.delta_net_pct} />
                </>
              }
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
            <Metric label="Socios activos" value={String(data.active_members)} />
            <Metric label="Altas del período" value={String(data.new_members)} />
            <Metric label="Compras a inventario (uds.)" value={String(data.inventory_purchases_units)} />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card>
              <Title order={3} mb="sm">
                Ingresos por línea de negocio
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Línea</Table.Th>
                    <Table.Th>Ingreso</Table.Th>
                    <Table.Th>% del total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.revenue_lines.map((l) => {
                    const total = Number(data.gross_revenue) || 1;
                    const pct = ((Number(l.revenue) / total) * 100).toFixed(0);
                    return (
                      <Table.Tr key={l.line}>
                        <Table.Td>{l.label}</Table.Td>
                        <Table.Td>Q{l.revenue}</Table.Td>
                        <Table.Td>{pct}%</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>

            <Card>
              <Title order={3} mb="sm">
                Productos más vendidos
              </Title>
              {!data.top_products.length ? (
                <EmptyState title="Sin ventas" description="Aún no hay ventas en el período." />
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Producto</Table.Th>
                      <Table.Th>Unidades</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.top_products.map((p) => (
                      <Table.Tr key={p.name}>
                        <Table.Td>{p.name}</Table.Td>
                        <Table.Td>{p.units}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mt="lg">
            <Card>
              <Title order={3} mb={4}>
                Retail por categoría
              </Title>
              <Text c="dimmed" size="sm" mb="sm">
                Ropa, bebidas, suplementos… mostrador + tienda de la app.
              </Text>
              {!(data.revenue_by_category ?? []).length ? (
                <EmptyState title="Sin ventas" description="Aún no hay ventas de productos en el período." />
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Categoría</Table.Th>
                      <Table.Th>Uds.</Table.Th>
                      <Table.Th>Ingreso</Table.Th>
                      <Table.Th>Margen</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.revenue_by_category.map((c) => (
                      <Table.Tr key={c.category}>
                        <Table.Td>{c.label}</Table.Td>
                        <Table.Td>{c.units}</Table.Td>
                        <Table.Td>Q{c.revenue}</Table.Td>
                        <Table.Td>Q{(Number(c.revenue) - Number(c.cogs)).toFixed(2)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>

            <Card>
              <Title order={3} mb="sm">
                Cobros por método
              </Title>
              {!(data.revenue_by_method ?? []).length ? (
                <EmptyState title="Sin ventas" description="Registra ventas para ver el corte de caja." />
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Método</Table.Th>
                      <Table.Th>Total</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.revenue_by_method.map((m) => (
                      <Table.Tr key={m.method}>
                        <Table.Td>{m.label}</Table.Td>
                        <Table.Td>Q{m.revenue}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
              <Title order={3} mt="lg" mb="sm">
                Gastos por categoría
              </Title>
              {!(data.expenses_by_category ?? []).length ? (
                <EmptyState title="Sin gastos" description="No hay gastos registrados en el período." />
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Categoría</Table.Th>
                      <Table.Th>Monto</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.expenses_by_category.map((e) => (
                      <Table.Tr key={e.category}>
                        <Table.Td>{e.label}</Table.Td>
                        <Table.Td>Q{e.amount}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </SimpleGrid>
        </>
      )}
    </div>
  );
}
