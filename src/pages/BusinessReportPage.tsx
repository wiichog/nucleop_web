import { useState, type ReactNode } from "react";
import { Group, Select, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useBranches, useErpPnl } from "../api/hooks";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Money, PageHeader } from "../components/ui";
import { Encabezado } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";
import { fechaIso as iso, motivoPeriodoInvalido } from "../lib/periodo";

/**
 * Reporte de negocio como **estado de resultados**: de arriba abajo, cuánto
 * entró (y de qué línea), cuánto costó y cuánto queda. Los renglones siguen la
 * misma cuenta que el backend (`erp/services.py`):
 *
 *   ingresos − costo de lo vendido = margen bruto
 *   margen bruto − mermas − gastos operativos = utilidad neta
 *
 * y los desgloses (líneas de ingreso, gastos por categoría) suman exactamente su
 * renglón. Las ventas de productos van aparte, en tablas chicas.
 */

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function Delta({ value }: { value: number | null }) {
  if (value === null)
    return (
      <Text c="dimmed" span size="xs">
        —
      </Text>
    );
  const up = value >= 0;
  return (
    <Text span size="xs" c={up ? "teal" : "red"} style={{ whiteSpace: "nowrap" }}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </Text>
  );
}

/** Un costo se resta: se pinta en negativo (y un cero sigue siendo cero). */
const menos = (v: string | number) => (Number(v) ? -Number(v) : 0);

/** Un renglón del estado de resultados. `sub` = desglose (sangrado, tenue). */
function Renglon({
  concepto,
  valor,
  extra,
  sub,
  total,
  tono,
}: {
  concepto: string;
  valor: string | number;
  extra?: ReactNode;
  sub?: boolean;
  total?: boolean;
  tono?: string;
}) {
  return (
    <Table.Tr
      style={
        total
          ? {
              borderTop: "2px solid var(--a-line, var(--mantine-color-default-border))",
            }
          : undefined
      }
    >
      <Table.Td pl={sub ? "lg" : undefined}>
        <Text size="sm" fw={total ? 700 : sub ? 400 : 600} c={sub ? "dimmed" : undefined}>
          {concepto}
        </Text>
      </Table.Td>
      <Table.Td ta="right" style={{ whiteSpace: "nowrap" }}>
        <Money value={valor} decimals={2} fw={total ? 700 : sub ? 400 : 600} c={tono} />
      </Table.Td>
      <Table.Td ta="right" w={1} style={{ whiteSpace: "nowrap" }}>
        {extra}
      </Table.Td>
    </Table.Tr>
  );
}

/** Tabla chica de dos o más columnas con su estado vacío. */
function TablaChica({
  titulo,
  vacio,
  cabeza,
  filas,
}: {
  titulo: string;
  vacio: string;
  cabeza: string[];
  filas: ReactNode[][];
}) {
  return (
    <div>
      <Title order={5} mb="xs">
        {titulo}
      </Title>
      {filas.length === 0 ? (
        <Text size="sm" c="dimmed">
          {vacio}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={260}>
          <Table verticalSpacing={6}>
            <Table.Thead>
              <Table.Tr>
                {cabeza.map((c, i) => (
                  <Table.Th key={c} ta={i === 0 ? undefined : "right"}>
                    {c}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filas.map((f, i) => (
                <Table.Tr key={i}>
                  {f.map((celda, j) => (
                    <Table.Td
                      key={j}
                      ta={j === 0 ? undefined : "right"}
                      className={j === 0 ? undefined : "a-tabular"}
                    >
                      {celda}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </div>
  );
}

export function BusinessReportPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [from, setFrom] = useState<Date | null>(firstOfMonth());
  const [to, setTo] = useState<Date | null>(new Date());
  const [branch, setBranch] = useState<string | null>("");
  const { data: branches } = useBranches(gymId);
  /**
   * Sin fechas o con el rango al revés no se consulta (el hook queda apagado
   * con fechas vacías) y en lugar del reporte se dice por qué.
   */
  const periodoInvalido = motivoPeriodoInvalido(from, to);
  const { data, isLoading, isError, refetch } = useErpPnl(
    gymId,
    periodoInvalido ? "" : iso(from),
    periodoInvalido ? "" : iso(to),
    branch || undefined,
  );

  if (!gymId) return <NoGymAssigned />;

  const total = data ? Number(data.gross_revenue) || 0 : 0;
  const pct = (v: string | number) => (total ? `${((Number(v) / total) * 100).toFixed(0)}%` : "");

  return (
    <div>
      <PageHeader kicker="Negocio · Reportes" title="Reportes de negocio" />

      <GlassCard padding={18} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <Encabezado titulo="Resultado">
          <DatePickerInput
            aria-label="Desde"
            placeholder="Desde"
            value={from}
            onChange={setFrom}
            valueFormat="DD/MM/YYYY"
            error={periodoInvalido?.desde}
            w={{ base: "100%", xs: 140 }}
          />
          <DatePickerInput
            aria-label="Hasta"
            placeholder="Hasta"
            value={to}
            onChange={setTo}
            valueFormat="DD/MM/YYYY"
            error={periodoInvalido?.hasta}
            w={{ base: "100%", xs: 140 }}
          />
          {(branches ?? []).length > 0 && (
            <Select
              aria-label="Sede"
              placeholder="Todas las sedes"
              value={branch}
              onChange={setBranch}
              clearable
              w={{ base: "100%", xs: 180 }}
              data={(branches ?? []).map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />
          )}
        </Encabezado>

        {periodoInvalido ? (
          <Text size="sm" c="dimmed">
            {periodoInvalido.mensaje}
          </Text>
        ) : isLoading ? (
          <Text size="sm" c="dimmed">
            Calculando…
          </Text>
        ) : isError ? (
          <PageError onRetry={() => refetch()} />
        ) : !data ? (
          <Text size="sm" c="dimmed">
            Sin actividad en esas fechas.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={360}>
            <Table maw={640} verticalSpacing={6}>
              <Table.Tbody>
                <Renglon
                  concepto="Ingresos"
                  valor={data.gross_revenue}
                  extra={<Delta value={data.delta_revenue_pct} />}
                />
                {data.revenue_lines.map((l) => (
                  <Renglon
                    key={l.line}
                    sub
                    concepto={l.label}
                    valor={l.revenue}
                    extra={
                      <Text span size="xs" c="dimmed" className="a-tabular">
                        {pct(l.revenue)}
                      </Text>
                    }
                  />
                ))}
                <Renglon concepto="Costo de lo vendido" valor={menos(data.direct_cost)} />
                <Renglon
                  concepto="Margen bruto"
                  valor={data.gross_margin}
                  extra={
                    <Text span size="xs" c="dimmed" className="a-tabular">
                      {data.gross_margin_pct}%
                    </Text>
                  }
                />
                <Renglon
                  concepto="Mermas"
                  valor={menos(data.losses)}
                  tono={Number(data.losses) ? "var(--nucleo-danger)" : undefined}
                />
                <Renglon concepto="Gastos operativos" valor={menos(data.expenses)} />
                {(data.expenses_by_category ?? []).map((e) => (
                  <Renglon key={e.category} sub concepto={e.label} valor={menos(e.amount)} />
                ))}
                <Renglon
                  total
                  concepto="Utilidad neta"
                  valor={data.net_profit}
                  tono={Number(data.net_profit) < 0 ? "var(--nucleo-danger)" : undefined}
                  extra={
                    <Group gap={6} wrap="nowrap" justify="flex-end">
                      <Text span size="xs" c="dimmed" className="a-tabular">
                        {data.net_margin_pct}%
                      </Text>
                      <Delta value={data.delta_net_pct} />
                    </Group>
                  }
                />
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </GlassCard>

      {data && !periodoInvalido && !isLoading && !isError && (
        <GlassCard padding={18}>
          <Encabezado titulo="Socios y productos" />
          <Group gap="xl" mb="lg" wrap="wrap">
            <Text size="sm">
              <Text span fw={700} className="a-tabular">
                {data.active_members}
              </Text>{" "}
              <Text span c="dimmed">
                socios activos
              </Text>
            </Text>
            <Text size="sm">
              <Text span fw={700} className="a-tabular">
                {data.new_members}
              </Text>{" "}
              <Text span c="dimmed">
                altas
              </Text>
            </Text>
            <Text size="sm">
              <Text span fw={700} className="a-tabular">
                {data.inventory_purchases_units}
              </Text>{" "}
              <Text span c="dimmed">
                uds. compradas a inventario
              </Text>
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="xl">
            <TablaChica
              titulo="Más vendidos"
              vacio="Sin ventas en esas fechas."
              cabeza={["Producto", "Uds."]}
              filas={data.top_products.map((p) => [p.name, p.units])}
            />
            <TablaChica
              titulo="Retail por categoría"
              vacio="Sin ventas de productos en esas fechas."
              cabeza={["Categoría", "Uds.", "Ingreso", "Margen"]}
              filas={(data.revenue_by_category ?? []).map((c) => [
                c.label,
                c.units,
                <Money key="i" value={c.revenue} decimals={2} />,
                <Money key="m" value={Number(c.revenue) - Number(c.cogs)} decimals={2} />,
              ])}
            />
            {/* El corte sale solo de las ventas de productos (mostrador y tienda
                de la app); los cobros de membresías y servicios no entran aquí. */}
            <TablaChica
              titulo="Ventas por método"
              vacio="Sin ventas de productos en esas fechas."
              cabeza={["Método", "Total"]}
              filas={(data.revenue_by_method ?? []).map((m) => [
                m.label,
                <Money key="t" value={m.revenue} decimals={2} />,
              ])}
            />
          </SimpleGrid>
        </GlassCard>
      )}
    </div>
  );
}
