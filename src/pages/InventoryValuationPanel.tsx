import { useState } from "react";
import { Badge, Group, Select, SimpleGrid, Table, Text } from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { AlertTriangle, Boxes, PackageSearch, TrendingUp } from "lucide-react";
import { useErpInventoryValuation } from "../api/hooks";
import type { InventoryValuationRow } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { BigMetric, GlassCard, MetricTile, Stagger } from "../components/aurora";
import { Money, SectionLabel } from "../components/ui";
import { fmtQ, toNumber } from "../lib/money";
import { sortRecords } from "../lib/sortRecords";

const num = (v: number | null | undefined, sufijo = "") =>
  v === null || v === undefined ? "—" : `${v}${sufijo}`;

/**
 * Valuación del inventario: cuánto dinero está parado en la bodega, qué tan
 * viejo es y qué tan rápido rota. Es el reporte que contesta «¿por qué no tengo
 * efectivo si vendí bien?».
 */
export function InventoryValuationPanel({ gymId }: { gymId: string }) {
  const [dias, setDias] = useState<string | null>("90");
  const valuation = useErpInventoryValuation(gymId, Number(dias) || 90);
  const [soloDormido, setSoloDormido] = useState<string | null>("todos");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<InventoryValuationRow>>({
    columnAccessor: "stock_value",
    direction: "desc",
  });

  const data = valuation.data;
  const filas = sortRecords(
    (data?.products ?? []).filter((p) =>
      soloDormido === "dormido"
        ? p.is_dead_stock
        : soloDormido === "reorden"
          ? p.needs_reorder
          : true,
    ),
    sortStatus,
  );

  return (
    <div>
      {/* Controles de periodo: pastilla de vidrio, arriba de todo (0.6s). */}
      <GlassCard padding={16} delay={0.6} style={{ marginBottom: "calc(16 * var(--u))" }}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <SectionLabel as="h2" mb={6}>Valuación de inventario</SectionLabel>
            <Text c="dimmed" size="sm">
              Valor a costo de lo que tienes en bodega, antigüedad y rotación
              {data ? ` al ${data.as_of}` : ""}.
            </Text>
          </div>
          <Select
            label="Ventana de análisis"
            value={dias}
            onChange={setDias}
            w={{ base: "100%", sm: 200 }}
            data={[
              { value: "30", label: "Últimos 30 días" },
              { value: "60", label: "Últimos 60 días" },
              { value: "90", label: "Últimos 90 días" },
              { value: "180", label: "Últimos 180 días" },
              { value: "365", label: "Último año" },
            ]}
          />
        </Group>
      </GlassCard>

      {valuation.isError ? (
        <PageError onRetry={() => valuation.refetch()} />
      ) : valuation.isLoading ? (
        <PageLoading label="Calculando la valuación…" />
      ) : !data || !data.products_count ? (
        <EmptyState
          title="Sin inventario"
          description="Cuando tengas productos con stock, aquí verás cuánto dinero tienes parado en bodega."
        />
      ) : (
        <>
          {/* La cifra que manda en la pantalla: el dinero parado en bodega. */}
          <GlassCard
            variant="core"
            sheen
            padding={26}
            delay={0.7}
            style={{ marginBottom: "calc(16 * var(--u))" }}
          >
            <BigMetric
              label="Valor del inventario a costo"
              value={fmtQ(data.total_value)}
              fz="clamp(32px, calc(54 * var(--u)), 64px)"
              hint={`${data.total_units} unidades en bodega · ventana de ${data.days} días`}
              delay={1.04}
            />
          </GlassCard>

          <SectionLabel as="h2" mb="xs">Lo que dice la bodega</SectionLabel>
          <Stagger from={1.0} style={{ marginBottom: "calc(16 * var(--u))" }}>
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
              <MetricTile
                label="A precio de venta"
                value={fmtQ(data.total_retail_value)}
                icon={<TrendingUp size={16} strokeWidth={1.8} />}
              />
              <MetricTile
                label="Margen potencial"
                value={fmtQ(data.potential_margin)}
                hint="Si se vendiera todo"
                tone="var(--nucleo-accent)"
              />
              <MetricTile
                label="Productos"
                value={data.products_count}
                icon={<Boxes size={16} strokeWidth={1.8} />}
              />
              <MetricTile
                label="Capital dormido"
                value={fmtQ(data.dead_stock_value)}
                hint={`${data.dead_stock_count} sin vender en ${data.days} días`}
                icon={<PackageSearch size={16} strokeWidth={1.8} />}
                tone="var(--nucleo-warning)"
              />
              <MetricTile
                label="Por reordenar"
                value={data.reorder_count}
                hint="Bajo el nivel de reorden"
                icon={<AlertTriangle size={16} strokeWidth={1.8} />}
                tone="var(--nucleo-danger)"
              />
            </SimpleGrid>
          </Stagger>

          {(data.by_category ?? []).length > 0 && (
            <GlassCard padding={18} delay={0.84} style={{ marginBottom: "calc(16 * var(--u))" }}>
              <SectionLabel as="h2">Por categoría</SectionLabel>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Categoría</Table.Th>
                    <Table.Th ta="right">Unidades</Table.Th>
                    <Table.Th ta="right">Valor a costo</Table.Th>
                    <Table.Th ta="right">% del total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.by_category.map((c) => {
                    const total = toNumber(data.total_value) || 1;
                    const pct = ((toNumber(c.value) / total) * 100).toFixed(0);
                    return (
                      <Table.Tr key={c.category}>
                        <Table.Td>{c.label}</Table.Td>
                        <Table.Td ta="right" className="a-tabular">
                          {c.units}
                        </Table.Td>
                        <Table.Td ta="right">
                          <Money value={c.value} decimals={2} />
                        </Table.Td>
                        <Table.Td ta="right" className="a-tabular">
                          {pct}%
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </GlassCard>
          )}

          <GlassCard padding={14} delay={0.96}>
            <Group justify="space-between" align="flex-end" mb="md" wrap="wrap">
              <SectionLabel as="h2" mb={0}>Detalle por producto</SectionLabel>
              <Select
                value={soloDormido}
                onChange={setSoloDormido}
                w={{ base: "100%", sm: 240 }}
                data={[
                  { value: "todos", label: "Todos los productos" },
                  { value: "dormido", label: "Solo capital dormido" },
                  { value: "reorden", label: "Solo por reordenar" },
                ]}
              />
            </Group>
            <DataTable<InventoryValuationRow>
              minHeight={160}
              highlightOnHover
              striped
              idAccessor="product"
              records={filas}
              noRecordsText="Ningún producto cae en este filtro."
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
              columns={[
                {
                  accessor: "name",
                  title: "Producto",
                  sortable: true,
                  render: (p) => (
                    <div>
                      <Text size="sm" fw={600}>
                        {p.name}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {p.category_label}
                        {p.sku ? ` · ${p.sku}` : ""}
                      </Text>
                    </div>
                  ),
                },
                {
                  accessor: "stock_qty",
                  title: "Stock",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => (
                    <Text size="sm" className="a-tabular">
                      {p.stock_qty}
                    </Text>
                  ),
                },
                {
                  accessor: "avg_cost",
                  title: "Costo prom.",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => <Money value={p.avg_cost} decimals={2} block />,
                },
                {
                  accessor: "stock_value",
                  title: "Valor a costo",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => <Money value={p.stock_value} decimals={2} block />,
                },
                {
                  accessor: "units_sold",
                  title: "Vendidas",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => (
                    <Text size="sm" className="a-tabular">
                      {p.units_sold}
                    </Text>
                  ),
                },
                {
                  accessor: "days_of_inventory",
                  title: "Días de stock",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => (
                    <Text size="sm" className="a-tabular">
                      {num(p.days_of_inventory)}
                    </Text>
                  ),
                },
                {
                  accessor: "turnover",
                  title: "Rotación",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => (
                    <Text size="sm" className="a-tabular">
                      {p.turnover === null ? "—" : `${p.turnover}×`}
                    </Text>
                  ),
                },
                {
                  accessor: "days_since_purchase",
                  title: "Antigüedad",
                  sortable: true,
                  render: (p) => (
                    <Text c="dimmed" size="xs">
                      {p.days_since_purchase === null
                        ? "Sin compras registradas"
                        : `Compra hace ${p.days_since_purchase} d`}
                      {p.days_since_sale !== null ? ` · venta hace ${p.days_since_sale} d` : ""}
                    </Text>
                  ),
                },
                {
                  accessor: "is_dead_stock",
                  title: "Señal",
                  render: (p) => (
                    <Group gap={4} wrap="nowrap">
                      {p.is_dead_stock && (
                        <Badge color="orange" variant="light">
                          Dormido
                        </Badge>
                      )}
                      {p.needs_reorder && (
                        <Badge color="red" variant="light">
                          Reordenar
                        </Badge>
                      )}
                      {!p.is_dead_stock && !p.needs_reorder && (
                        <Text c="dimmed" size="sm">
                          —
                        </Text>
                      )}
                    </Group>
                  ),
                },
              ]}
            />
          </GlassCard>
        </>
      )}
    </div>
  );
}
