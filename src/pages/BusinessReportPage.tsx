import { useState } from "react";
import { Divider, Group, Select, SimpleGrid, Table, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useBranches, useErpPnl } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { Money, PageHeader, SectionLabel } from "../components/ui";
import {
  BigMetric,
  GlassCard,
  MetricTile,
  Stagger,
  WaveChart,
} from "../components/aurora";
import { fmtQ, toNumber } from "../lib/money";
import { useAuth } from "../lib/auth";

/**
 * Reporte de negocio en el lenguaje **Aurora**: la utilidad neta manda (cifra
 * protagonista), las líneas de ingreso se leen como onda antes que como tabla,
 * y el resto de cortes (retail, métodos de cobro, gastos) vive en vidrio.
 */

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
      <PageHeader
        kicker="Negocio · Reportes"
        title="Reportes de negocio"
        subtitle="Rentabilidad del periodo: de dónde entra el dinero, cuánto cuesta operar y cuánto queda al final."
      />

      <GlassCard padding={16} delay={0.6} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <Group align="flex-end" gap="md" wrap="wrap">
          <SectionLabel mb={0}>Periodo</SectionLabel>
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
      </GlassCard>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <PageError onRetry={() => refetch()} />
      ) : !data ? (
        <EmptyState title="Sin datos" description="No hay actividad en el período seleccionado." />
      ) : (
        <>
          {/* La cifra que manda: lo que de verdad queda después de todo. */}
          <GlassCard
            variant="core"
            sheen
            padding={26}
            delay={0.7}
            style={{ marginBottom: "calc(20 * var(--u))" }}
          >
            <BigMetric
              label="Utilidad neta del periodo"
              value={fmtQ(data.net_profit)}
              fz="clamp(34px, calc(58 * var(--u)), 68px)"
              delay={1.04}
              hint={
                <>
                  {data.net_margin_pct}% de margen · <Delta value={data.delta_net_pct} />
                </>
              }
            />
            <Group
              gap="lg"
              mt="lg"
              wrap="wrap"
              className="a-rise"
              style={{ animationDelay: "1.16s" }}
            >
              <div>
                <SectionLabel mb={4}>Ingresos totales</SectionLabel>
                <Text fw={600} className="a-tabular">
                  {fmtQ(data.gross_revenue)}
                </Text>
                <Delta value={data.delta_revenue_pct} />
              </div>
              <Divider orientation="vertical" />
              <div>
                <SectionLabel mb={4}>Margen bruto</SectionLabel>
                <Text fw={600} className="a-tabular">
                  {fmtQ(data.gross_margin)}
                </Text>
                <Text span size="xs" c="dimmed">
                  {data.gross_margin_pct}% del ingreso
                </Text>
              </div>
            </Group>
          </GlassCard>

          <SectionLabel as="h2" mb={12}>Costos del periodo</SectionLabel>
          <Stagger from={0.82}>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
              <MetricTile label="Costo directo (COGS)" value={fmtQ(data.direct_cost)} />
              <MetricTile
                label="Pérdidas (mermas)"
                value={fmtQ(data.losses)}
                tone="var(--nucleo-danger)"
              />
              <MetricTile label="Gastos operativos" value={fmtQ(data.expenses)} />
            </SimpleGrid>
          </Stagger>

          <SectionLabel as="h2" mt="lg" mb={12}>
            Comunidad e inventario
          </SectionLabel>
          <Stagger from={0.94}>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
              <MetricTile label="Socios activos" value={data.active_members} />
              <MetricTile label="Altas del período" value={data.new_members} />
              <MetricTile
                label="Compras a inventario (uds.)"
                value={data.inventory_purchases_units}
              />
            </SimpleGrid>
          </Stagger>

          {/* La onda lee la mezcla de ingresos de un vistazo; la tabla la detalla. */}
          <GlassCard padding={22} delay={1.06} style={{ marginTop: "calc(20 * var(--u))" }}>
            <SectionLabel as="h2" mb={12}>Ingresos por línea de negocio</SectionLabel>
            {data.revenue_lines.length > 1 && (
              <WaveChart
                values={data.revenue_lines.map((l) => toNumber(l.revenue))}
                labels={data.revenue_lines.map((l) => l.label)}
                formatValue={(v) => fmtQ(v, { decimals: 0 })}
                height={170}
                delay={1.5}
              />
            )}
            <Table mt={data.revenue_lines.length > 1 ? "xl" : "xs"}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Línea</Table.Th>
                  <Table.Th ta="right">Ingreso</Table.Th>
                  <Table.Th ta="right">% del total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.revenue_lines.map((l) => {
                  const total = Number(data.gross_revenue) || 1;
                  const pct = ((Number(l.revenue) / total) * 100).toFixed(0);
                  return (
                    <Table.Tr key={l.line}>
                      <Table.Td>{l.label}</Table.Td>
                      <Table.Td ta="right"><Money value={l.revenue} decimals={2} /></Table.Td>
                      <Table.Td ta="right" style={{ fontVariantNumeric: "tabular-nums" }}>{pct}%</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </GlassCard>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mt="lg">
            <GlassCard padding={22} delay={1.18}>
              <SectionLabel as="h2" mb={12}>Productos más vendidos</SectionLabel>
              {!data.top_products.length ? (
                <Text c="dimmed" size="sm">
                  Aún no hay ventas en el período.
                </Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Producto</Table.Th>
                      <Table.Th ta="right">Unidades</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.top_products.map((p) => (
                      <Table.Tr key={p.name}>
                        <Table.Td>{p.name}</Table.Td>
                        <Table.Td ta="right" style={{ fontVariantNumeric: "tabular-nums" }}>{p.units}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </GlassCard>

            <GlassCard padding={22} delay={1.24}>
              <SectionLabel as="h2" mb={4}>Retail por categoría</SectionLabel>
              <Text c="dimmed" size="sm" mb="sm">
                Ropa, bebidas, suplementos… mostrador + tienda de la app.
              </Text>
              {!(data.revenue_by_category ?? []).length ? (
                <Text c="dimmed" size="sm">
                  Aún no hay ventas de productos en el período.
                </Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Categoría</Table.Th>
                      <Table.Th ta="right">Uds.</Table.Th>
                      <Table.Th ta="right">Ingreso</Table.Th>
                      <Table.Th ta="right">Margen</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.revenue_by_category.map((c) => (
                      <Table.Tr key={c.category}>
                        <Table.Td>{c.label}</Table.Td>
                        <Table.Td ta="right" style={{ fontVariantNumeric: "tabular-nums" }}>{c.units}</Table.Td>
                        <Table.Td ta="right"><Money value={c.revenue} decimals={2} /></Table.Td>
                        <Table.Td ta="right"><Money value={Number(c.revenue) - Number(c.cogs)} decimals={2} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </GlassCard>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mt="lg">
            <GlassCard padding={22} delay={1.3}>
              <SectionLabel as="h2" mb={12}>Cobros por método</SectionLabel>
              {!(data.revenue_by_method ?? []).length ? (
                <Text c="dimmed" size="sm">
                  Registra ventas para ver el corte de caja.
                </Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Método</Table.Th>
                      <Table.Th ta="right">Total</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.revenue_by_method.map((m) => (
                      <Table.Tr key={m.method}>
                        <Table.Td>{m.label}</Table.Td>
                        <Table.Td ta="right"><Money value={m.revenue} decimals={2} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </GlassCard>

            <GlassCard padding={22} delay={1.36}>
              <SectionLabel as="h2" mb={12}>Gastos por categoría</SectionLabel>
              {!(data.expenses_by_category ?? []).length ? (
                <Text c="dimmed" size="sm">
                  No hay gastos registrados en el período.
                </Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Categoría</Table.Th>
                      <Table.Th ta="right">Monto</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.expenses_by_category.map((e) => (
                      <Table.Tr key={e.category}>
                        <Table.Td>{e.label}</Table.Td>
                        <Table.Td ta="right"><Money value={e.amount} decimals={2} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </GlassCard>
          </SimpleGrid>
        </>
      )}
    </div>
  );
}
