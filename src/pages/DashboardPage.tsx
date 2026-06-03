import { useState } from "react";
import { useDashboard } from "../api/hooks";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="nucleo-card" style={{ flex: "1 1 180px", minWidth: 160 }}>
      <p style={{ color: "var(--nucleo-muted)", margin: "0 0 6px", fontSize: 13 }}>{label}</p>
      <strong style={{ fontSize: 28, color: tone ?? "var(--nucleo-white)" }}>{value}</strong>
      {hint && (
        <p style={{ color: "var(--nucleo-muted)", margin: "6px 0 0", fontSize: 12 }}>{hint}</p>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const dashboard = useDashboard(gymId, from, to);

  if (!gymId) return <NoGymAssigned />;
  if (dashboard.isError) return <PageError onRetry={() => dashboard.refetch()} />;

  const d = dashboard.data;

  return (
    <div>
      <h1>Dashboard del gimnasio</h1>
      <div
        className="nucleo-card"
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}
      >
        <strong style={{ marginRight: "auto" }}>Periodo</strong>
        <label>
          Desde{" "}
          <input className="nucleo-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta{" "}
          <input className="nucleo-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {dashboard.isLoading || !d ? (
        <PageLoading label="Cargando KPIs…" />
      ) : (
        <>
          <p style={{ color: "var(--nucleo-muted)", marginTop: 0 }}>Ingresos y actividad del periodo</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <Kpi label="Ingresos del periodo" value={`Q${d.ingresos_total}`} tone="var(--nucleo-accent)" />
            <Kpi label="Ingresos tarjeta" value={`Q${d.ingresos_tarjeta}`} />
            <Kpi label="Ingresos manuales" value={`Q${d.ingresos_manual}`} />
            <Kpi label="Pagos" value={d.pagos} />
            <Kpi label="Nuevos atletas" value={d.nuevos_atletas} />
            <Kpi label="Check-ins" value={d.checkins} />
          </div>

          <p style={{ color: "var(--nucleo-muted)", marginTop: 0 }}>Estado actual del gimnasio</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <Kpi label="Atletas activos" value={d.atletas_activos} />
            <Kpi label="Morosos" value={d.morosos} tone="var(--nucleo-danger)" />
            <Kpi label="Por vencer" value={d.proximos_vencimientos} tone="var(--nucleo-warning)" />
          </div>

          <div className="nucleo-card">
            <h2 style={{ marginTop: 0 }}>Clases más demandadas</h2>
            {!d.clases_mas_demandadas.length ? (
              <p style={{ color: "var(--nucleo-muted)" }}>Sin reservas registradas.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Clase</th>
                    <th>Reservas</th>
                  </tr>
                </thead>
                <tbody>
                  {d.clases_mas_demandadas.map((c) => (
                    <tr key={c.class_type}>
                      <td>{c.class_type}</td>
                      <td>{c.reservas}</td>
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
