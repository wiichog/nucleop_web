import { useState } from "react";
import { Badge, Card, Group, Select, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useErpInventoryValuation } from "../api/hooks";
import type { InventoryValuationRow } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { Money, SectionLabel } from "../components/ui";
import { fmtQ, toNumber } from "../lib/money";
import { sortRecords } from "../lib/sortRecords";

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text
        fw={700}
        fz={{ base: 20, sm: 24 }}
        c={accent ? "flame" : undefined}
        ff='"Space Grotesk", sans-serif'
        style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
      >
        {value}
      </Text>
      {sub && (
        <Text c="dimmed" size="xs" mt={4}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

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
      <Card mb="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <Title order={3} mb={4}>
              Valuación de inventario
            </Title>
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
      </Card>

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
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md" mb="lg">
            <Metric
              label="Valor a costo"
              value={fmtQ(data.total_value)}
              sub={`${data.total_units} unidades`}
              accent
            />
            <Metric label="Valor a precio de venta" value={fmtQ(data.total_retail_value)} />
            <Metric
              label="Margen potencial"
              value={fmtQ(data.potential_margin)}
              sub="Si se vendiera todo"
            />
            <Metric label="Productos" value={String(data.products_count)} />
            <Metric
              label="Capital dormido"
              value={fmtQ(data.dead_stock_value)}
              sub={`${data.dead_stock_count} sin vender en ${data.days} días`}
            />
            <Metric
              label="Por reordenar"
              value={String(data.reorder_count)}
              sub="Bajo el nivel de reorden"
            />
          </SimpleGrid>

          {(data.by_category ?? []).length > 0 && (
            <Card mb="lg">
              <SectionLabel>Por categoría</SectionLabel>
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
                        <Table.Td ta="right" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {c.units}
                        </Table.Td>
                        <Table.Td ta="right">
                          <Money value={c.value} decimals={2} />
                        </Table.Td>
                        <Table.Td ta="right" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {pct}%
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          )}

          <Card>
            <Group justify="space-between" align="flex-end" mb="md" wrap="wrap">
              <SectionLabel mb={0}>Detalle por producto</SectionLabel>
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
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
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
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
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
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
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
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
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
          </Card>
        </>
      )}
    </div>
  );
}
