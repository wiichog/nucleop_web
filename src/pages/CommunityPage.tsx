import { useGymFeed, useAthleteOfMonth, useComputeAthleteOfMonth } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

const KIND_LABEL: Record<string, string> = {
  pr: "PR",
  badge: "Badge",
  points: "Puntos",
  athlete_of_month: "Atleta del mes",
  challenge: "Reto",
};

export function CommunityPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const feed = useGymFeed(gymId);
  const athleteOfMonth = useAthleteOfMonth(gymId);
  const compute = useComputeAthleteOfMonth(gymId);

  if (!gymId) return <NoGymAssigned />;
  if (feed.isError) return <PageError onRetry={() => feed.refetch()} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <h1>Comunidad del gym</h1>
        <button
          className="nucleo-btn"
          disabled={compute.isPending}
          onClick={() => compute.mutate()}
        >
          {compute.isPending ? "Calculando…" : "Calcular atleta del mes"}
        </button>
      </div>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        Feed de PRs, badges, puntos y destacados de tu comunidad.
      </p>

      <section className="nucleo-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Atleta del mes</h2>
        {athleteOfMonth.isLoading ? (
          <PageLoading />
        ) : athleteOfMonth.data ? (
          <p>
            <strong>{athleteOfMonth.data.athlete_name}</strong> · período{" "}
            {athleteOfMonth.data.period} · {athleteOfMonth.data.score} pts comunidad
          </p>
        ) : (
          <EmptyState
            title="Sin atleta del mes"
            description="Calcula el destacado del mes según puntos de comunidad ganados."
          />
        )}
      </section>

      <section className="nucleo-card">
        <h2 style={{ marginTop: 0 }}>Feed</h2>
        {feed.isLoading ? (
          <PageLoading />
        ) : !(feed.data ?? []).length ? (
          <EmptyState title="Sin actividad" description="La actividad de tus atletas aparecerá aquí." />
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(feed.data ?? []).map((item) => (
              <li
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--nucleo-surface-2)",
                  padding: "12px 0",
                }}
              >
                <strong style={{ color: "var(--nucleo-accent)" }}>
                  {KIND_LABEL[item.kind] ?? item.kind} · {item.title}
                </strong>
                <p style={{ margin: "4px 0", color: "var(--nucleo-white)" }}>{item.body}</p>
                <p style={{ margin: 0, color: "var(--nucleo-muted)", fontSize: 13 }}>
                  {item.actor_name} · {new Date(item.created_at).toLocaleString("es-GT")}
                  {item.reaction_count > 0 ? ` · ♥ ${item.reaction_count}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
