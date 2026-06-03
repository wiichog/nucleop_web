import { useState } from "react";
import { useBranches, useErpPnl } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "var(--nucleo-muted)" }}>—</span>;
  const up = value >= 0;
  return (
    <span style={{ color: up ? "#16a34a" : "var(--nucleo-danger)", fontSize: 13 }}>
      {up ? "▲" : "▼"} {Math.abs(value)}% vs. periodo anterior
    </span>
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
  sub?: React.ReactNode;
}) {
  return (
    <div className="nucleo-card" style={{ flex: "1 1 170px", minWidth: 150 }}>
      <p style={{ margin: 0, color: "var(--nucleo-muted)", fontSize: 13 }}>{label}</p>
      <strong style={{ fontSize: 24, color: accent ? "var(--nucleo-accent)" : undefined }}>
        {value}
      </strong>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function BusinessReportPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [branch, setBranch] = useState("");
  const { data: branches } = useBranches(gymId);
  const { data, isLoading, isError, refetch } = useErpPnl(gymId, from, to, branch || undefined);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Reportes de negocio</h1>
      <div
        className="nucleo-card"
        style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <label>
          Desde <input className="nucleo-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta <input className="nucleo-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          Sede{" "}
          <select className="nucleo-input" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Todas</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <PageError onRetry={() => refetch()} />
      ) : !data ? (
        <EmptyState title="Sin datos" description="No hay actividad en el período seleccionado." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <Metric
              label="Ingresos totales"
              value={`Q${data.gross_revenue}`}
              sub={<Delta value={data.delta_revenue_pct} />}
            />
            <Metric label="Costo directo (COGS)" value={`Q${data.direct_cost}`} />
            <Metric
              label="Margen bruto"
              value={`Q${data.gross_margin}`}
              sub={<span style={{ color: "var(--nucleo-muted)", fontSize: 13 }}>{data.gross_margin_pct}%</span>}
            />
            <Metric label="Pérdidas (mermas)" value={`Q${data.losses}`} />
            <Metric label="Gastos operativos" value={`Q${data.expenses}`} />
            <Metric
              label="Utilidad neta"
              value={`Q${data.net_profit}`}
              accent
              sub={
                <>
                  <span style={{ color: "var(--nucleo-muted)", fontSize: 13 }}>{data.net_margin_pct}% </span>
                  <Delta value={data.delta_net_pct} />
                </>
              }
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <Metric label="Socios activos" value={String(data.active_members)} />
            <Metric label="Altas del período" value={String(data.new_members)} />
            <Metric label="Compras a inventario (uds.)" value={String(data.inventory_purchases_units)} />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="nucleo-card" style={{ flex: "1 1 320px" }}>
              <h2 style={{ marginTop: 0 }}>Ingresos por línea de negocio</h2>
              <table>
                <thead>
                  <tr>
                    <th>Línea</th>
                    <th>Ingreso</th>
                    <th>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenue_lines.map((l) => {
                    const total = Number(data.gross_revenue) || 1;
                    const pct = ((Number(l.revenue) / total) * 100).toFixed(0);
                    return (
                      <tr key={l.line}>
                        <td>{l.label}</td>
                        <td>Q{l.revenue}</td>
                        <td>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="nucleo-card" style={{ flex: "1 1 320px" }}>
              <h2 style={{ marginTop: 0 }}>Productos más vendidos</h2>
              {!data.top_products.length ? (
                <EmptyState title="Sin ventas" description="Aún no hay ventas en el período." />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_products.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td>{p.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
