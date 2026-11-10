import { useState } from "react";
import { Badge, Group, Select, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useErpInventoryValuation } from "../api/hooks";
import type { InventoryValuationRow } from "../api/types";
import { PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { Money } from "../components/ui";
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
  // Tocar «Capital dormido» o «Por reordenar» filtra el detalle; tocarlo otra vez lo suelta.
  const alternar = (f: string) => setSoloDormido((v) => (v === f ? "todos" : f));

  return (
    <GlassCard padding={18} delay={0.6}>
      <Encabezado titulo="Valuación" avisos={data ? <Text size="xs" c="dimmed">al {data.as_of}</Text> : null}>
        <Select
          aria-label="Ventana de análisis"
          value={dias}
          onChange={setDias}
          allowDeselect={false}
          w={{ base: "100%", sm: 180 }}
          data={[
            { value: "30", label: "Últimos 30 días" },
            { value: "60", label: "Últimos 60 días" },
            { value: "90", label: "Últimos 90 días" },
            { value: "180", label: "Últimos 180 días" },
            { value: "365", label: "Último año" },
          ]}
        />
      </Encabezado>

      {valuation.isError ? (
        <PageError onRetry={() => valuation.refetch()} />
      ) : valuation.isLoading ? (
        <Text c="dimmed" size="sm">
          Calculando…
        </Text>
      ) : !data || !data.products_count ? (
        <Text c="dimmed" size="sm" py="md">
          Sin inventario todavía: cuando tengas productos con stock, aquí ves cuánto dinero tienes en bodega.
        </Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm" mb="md">
            <Cifra etiqueta="A costo" valor={fmtQ(data.total_value)} pie={`${data.total_units} unidades`} />
            <Cifra etiqueta="A precio de venta" valor={fmtQ(data.total_retail_value)} />
            <Cifra etiqueta="Margen potencial" valor={fmtQ(data.potential_margin)} />
            <Cifra
              etiqueta="Capital dormido"
              valor={fmtQ(data.dead_stock_value)}
              pie={`${data.dead_stock_count} sin vender en ${data.days} días`}
              aviso={data.dead_stock_count > 0}
              activa={soloDormido === "dormido"}
              onClick={data.dead_stock_count > 0 ? () => alternar("dormido") : undefined}
            />
            <Cifra
              etiqueta="Por reordenar"
              valor={String(data.reorder_count)}
              pie="bajo su mínimo"
              aviso={data.reorder_count > 0}
              activa={soloDormido === "reorden"}
              onClick={data.reorder_count > 0 ? () => alternar("reorden") : undefined}
            />
          </SimpleGrid>

          {(data.by_category ?? []).length > 0 && (
            <Table.ScrollContainer minWidth={360} mb="md">
              <Table verticalSpacing={4}>
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
            </Table.ScrollContainer>
          )}

          <Group justify="space-between" align="center" mb="xs" wrap="wrap" gap="sm">
            <Title order={5}>Por producto</Title>
            <Select
              aria-label="Filtrar productos"
              value={soloDormido}
              onChange={setSoloDormido}
              allowDeselect={false}
              w={{ base: "100%", sm: 220 }}
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
            verticalSpacing="xs"
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
                      <Badge color="yellow" variant="light" size="sm">
                        Dormido
                      </Badge>
                    )}
                    {p.needs_reorder && (
                      <Badge color="yellow" variant="light" size="sm">
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
        </>
      )}
    </GlassCard>
  );
}

/**
 * Una cifra de la valuación. Las que piden atención (capital dormido, por
 * reordenar) salen en amarillo y al tocarlas filtran el detalle por producto.
 */
function Cifra({
  etiqueta,
  valor,
  pie,
  aviso,
  activa,
  onClick,
}: {
  etiqueta: string;
  valor: string;
  pie?: string;
  aviso?: boolean;
  activa?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tarjeta
      etiqueta={`${etiqueta}: ${valor}${onClick ? (activa ? ", quitar filtro" : ", ver productos") : ""}`}
      onClick={onClick}
      aviso={aviso}
      style={activa ? { outline: "2px solid var(--mantine-color-yellow-filled)" } : undefined}
    >
      <Text size="xs" c="dimmed">
        {etiqueta}
      </Text>
      <Text fw={700} className="a-tabular" c={aviso ? "var(--mantine-color-yellow-light-color)" : undefined}>
        {valor}
      </Text>
      {pie && (
        <Text size="xs" c="dimmed" lineClamp={2}>
          {pie}
        </Text>
      )}
    </Tarjeta>
  );
}
