import { useAtRisk, useDashboard, useOverdue } from "../api/hooks";
import { useAuth } from "../lib/auth";

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="nucleo-card" style={{ flex: 1, minWidth: 180 }}>
      <p style={{ color: "var(--nucleo-muted)", margin: "0 0 8px" }}>{label}</p>
      <strong style={{ fontSize: 30, color: tone ?? "var(--nucleo-white)" }}>{value}</strong>
    </div>
  );
}

export function DashboardPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const dashboard = useDashboard(gymId);
  const atRisk = useAtRisk(gymId);
  const overdue = useOverdue(gymId);

  if (!gymId) return <p>No tienes un gimnasio asignado.</p>;
  const d = dashboard.data ?? {};

  return (
    <div>
      <h1>Retención y morosidad</h1>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        El gancho de Nucleo: deja de perder alumnos.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <Kpi label="Atletas activos" value={d.atletas_activos ?? "—"} />
        <Kpi label="Morosos" value={d.morosos ?? "—"} tone="var(--nucleo-danger)" />
        <Kpi
          label="Por vencer"
          value={d.proximos_vencimientos ?? "—"}
          tone="var(--nucleo-warning)"
        />
        <Kpi label="Ingresos tarjeta (mes)" value={`Q${d.ingresos_mes_tarjeta ?? 0}`} />
        <Kpi label="Ingresos manuales (mes)" value={`Q${d.ingresos_mes_manual ?? 0}`} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <section className="nucleo-card" style={{ flex: 1, minWidth: 320 }}>
          <h2 style={{ marginTop: 0 }}>Atletas en riesgo</h2>
          <RelationTable rows={atRisk.data ?? []} empty="Nadie en riesgo. 💪" />
        </section>
        <section className="nucleo-card" style={{ flex: 1, minWidth: 320 }}>
          <h2 style={{ marginTop: 0 }}>Morosidad</h2>
          <RelationTable rows={overdue.data ?? []} empty="Sin morosos." />
        </section>
      </div>
    </div>
  );
}

function RelationTable({ rows, empty }: { rows: any[]; empty: string }) {
  if (!rows.length) return <p style={{ color: "var(--nucleo-muted)" }}>{empty}</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Atleta</th>
          <th>Estado</th>
          <th>Cuota</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id}>
            <td>{m.athlete_name}</td>
            <td>{m.status}</td>
            <td>Q{m.effective_fee ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
