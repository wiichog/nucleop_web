import { useGymClubs, useDecideClub } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";
import { CLUB_STATUS, label } from "../lib/labels";

const BADGE: Record<string, string> = {
  pending: "badge--warn",
  approved: "badge--ok",
  rejected: "badge--danger",
};

export function ClubsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const clubs = useGymClubs(gymId);
  const decide = useDecideClub(gymId);

  if (!gymId) return <NoGymAssigned />;
  if (clubs.isError) return <PageError onRetry={() => clubs.refetch()} />;

  const rows = clubs.data ?? [];
  const pending = rows.filter((c) => c.status === "pending");

  return (
    <div>
      <h1>Clubes del gimnasio</h1>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        Tus atletas pueden crear clubes; aquí apruebas o rechazas las solicitudes.
      </p>

      {pending.length > 0 && (
        <section className="nucleo-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Solicitudes pendientes ({pending.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Club</th>
                <th>Tipo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.club_type}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      className="nucleo-btn"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ clubId: c.id, decision: "approve" })}
                    >
                      Aprobar
                    </button>
                    <button
                      className="nucleo-btn nucleo-btn--secondary"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ clubId: c.id, decision: "reject" })}
                    >
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="nucleo-card">
        <h2 style={{ marginTop: 0 }}>Todos los clubes</h2>
        {clubs.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState
            title="Sin clubes"
            description="Cuando un atleta cree un club para este gimnasio, aparecerá aquí."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Club</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Miembros</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.club_type}</td>
                  <td>
                    <span className={`badge ${BADGE[c.status] ?? "badge--warn"}`}>
                      {label(CLUB_STATUS, c.status)}
                    </span>
                  </td>
                  <td>{c.member_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
