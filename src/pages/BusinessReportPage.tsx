import { useState } from "react";
import { useErpPnl } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="nucleo-card" style={{ flex: "1 1 160px", minWidth: 150 }}>
      <p style={{ margin: 0, color: "var(--nucleo-muted)", fontSize: 13 }}>{label}</p>
      <strong style={{ fontSize: 24, color: accent ? "var(--nucleo-accent)" : undefined }}>
        Q{value}
      </strong>
    </div>
  );
}

export function BusinessReportPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading, isError, refetch } = useErpPnl(gymId, from, to);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Reportes de negocio</h1>
      <div className="nucleo-card" style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          Desde <input className="nucleo-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta <input className="nucleo-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
            <Metric label="Ingreso retail" value={data.retail_revenue} />
            <Metric label="Ingreso membresías" value={data.membership_revenue} />
            <Metric label="Costo de ventas (COGS)" value={data.cogs} />
            <Metric label="Margen bruto" value={data.gross_margin} />
            <Metric label="Gastos" value={data.expenses} />
            <Metric label="Utilidad neta" value={data.net_profit} accent />
          </div>

          <div className="nucleo-card">
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
        </>
      )}
    </div>
  );
}
