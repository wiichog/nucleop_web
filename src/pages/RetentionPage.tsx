import { useAtRisk, useOverdue } from "../api/hooks";
import { NoGymAssigned } from "../components/PageStatus";
import { useAuth } from "../lib/auth";
import { Membership } from "../api/types";
import { downloadCsv } from "../lib/csv";
import { MEMBERSHIP_STATUS, PAYMENT_STATUS, label } from "../lib/labels";

export function RetentionPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const atRisk = useAtRisk(gymId);
  const overdue = useOverdue(gymId);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1>Retención y morosidad</h1>
          <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
            El gancho de Nucleo: deja de perder alumnos.
          </p>
        </div>
        <button
          className="nucleo-btn"
          style={{ alignSelf: "center" }}
          onClick={() =>
            downloadCsv(
              "retencion-nucleo.csv",
              ["segmento", "atleta", "estado", "cuota", "pago"],
              [
                ...(atRisk.data ?? []).map((membership) => ["en riesgo", membership] as const),
                ...(overdue.data ?? []).map((membership) => ["moroso", membership] as const),
              ].map(([segment, membership]) => [
                segment,
                membership.athlete_name,
                label(MEMBERSHIP_STATUS, membership.status),
                membership.effective_fee,
                label(PAYMENT_STATUS, membership.payment_status),
              ]),
            )
          }
        >
          Exportar CSV
        </button>
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

function RelationTable({ rows, empty }: { rows: Membership[]; empty: string }) {
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
            <td>{label(MEMBERSHIP_STATUS, m.status)}</td>
            <td>Q{m.effective_fee ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
