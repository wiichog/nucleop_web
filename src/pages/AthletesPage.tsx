import { useMemberships } from "../api/hooks";
import { useAuth } from "../lib/auth";

const STATUS_BADGE: Record<string, string> = {
  active: "badge--ok",
  trial: "badge--ok",
  overdue: "badge--danger",
  expired: "badge--warn",
};

export function AthletesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useMemberships(gymId);

  if (!gymId) return <p>No tienes un gimnasio asignado.</p>;

  return (
    <div>
      <h1>Atletas del gimnasio</h1>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        Solo se muestra la relación con ESTE gym (visibilidad por relación).
      </p>
      <div className="nucleo-card">
        {isLoading ? (
          <p>Cargando…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Cuota efectiva</th>
                <th>Estado de pago</th>
                <th>Puntos comunidad</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m: any) => (
                <tr key={m.id}>
                  <td>{m.athlete_name}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[m.status] ?? "badge--warn"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{m.plan ?? "—"}</td>
                  <td>Q{m.effective_fee ?? "—"}</td>
                  <td>{m.payment_status}</td>
                  <td>{m.community_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
