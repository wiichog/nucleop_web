import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";
import {
  useClubAdminActivities,
  useClubAdminChallengeLeaderboard,
  useClubAdminChallenges,
  useClubAdminConfirm,
  useClubAdminCreateActivity,
  useClubAdminCreateChallenge,
  useClubAdminRsvps,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";

export function ClubAdminPage() {
  const { primaryClubId, clubIds } = useAuth();
  const clubId = primaryClubId ?? "";
  const activities = useClubAdminActivities(clubId);
  const createActivity = useClubAdminCreateActivity(clubId);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const rsvps = useClubAdminRsvps(clubId, expandedActivity ?? "");
  const confirm = useClubAdminConfirm(clubId, expandedActivity ?? "");

  const challenges = useClubAdminChallenges(clubId);
  const createChallenge = useClubAdminCreateChallenge(clubId);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const challengeBoard = useClubAdminChallengeLeaderboard(clubId, expandedChallenge ?? "");

  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");

  const [challengeName, setChallengeName] = useState("");
  const [challengeTarget, setChallengeTarget] = useState("50");
  const [challengeEnds, setChallengeEnds] = useState("");

  if (!clubId) {
    return (
      <EmptyState
        title="Sin club asignado"
        description="Tu usuario necesita rol club_admin en un club para administrar actividades."
      />
    );
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    await createActivity.mutateAsync({
      name,
      starts_at: new Date(startsAt).toISOString(),
      location,
      is_free: true,
    });
    setName("");
    setStartsAt("");
    setLocation("");
  };

  const onCreateChallenge = async (e: FormEvent) => {
    e.preventDefault();
    const ends = challengeEnds ? new Date(challengeEnds) : new Date();
    if (!challengeEnds) ends.setDate(ends.getDate() + 30);
    await createChallenge.mutateAsync({
      name: challengeName,
      description: "",
      metric: "distance_km",
      target_value: challengeTarget,
      starts_at: new Date().toISOString(),
      ends_at: ends.toISOString(),
      points_reward: 30,
    });
    setChallengeName("");
    setChallengeTarget("50");
    setChallengeEnds("");
  };

  if (activities.isError) return <PageError onRetry={() => activities.refetch()} />;

  return (
    <div>
      <h1>Administrar club</h1>
      <p style={{ color: "var(--nucleo-muted)" }}>
        Crea actividades, revisa RSVPs y confirma asistencia.
        {clubIds.length > 1 ? ` Club activo: ${clubId}` : ""}
      </p>

      <section className="nucleo-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Nueva actividad</h2>
        <form onSubmit={onCreate} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
          <input
            className="nucleo-input"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="nucleo-input"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
          <input
            className="nucleo-input"
            placeholder="Ubicación"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button className="nucleo-btn" type="submit" disabled={createActivity.isPending}>
            {createActivity.isPending ? "Guardando…" : "Crear actividad"}
          </button>
        </form>
      </section>

      <section className="nucleo-card">
        <h2 style={{ marginTop: 0 }}>Actividades</h2>
        {activities.isLoading ? (
          <PageLoading />
        ) : !(activities.data ?? []).length ? (
          <EmptyState title="Sin actividades" description="Crea la primera actividad del club." />
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(activities.data ?? []).map((activity) => (
              <li
                key={activity.id}
                style={{ borderBottom: "1px solid var(--nucleo-surface-2)", padding: "12px 0" }}
              >
                <strong>{activity.name}</strong>
                <p style={{ margin: "4px 0", color: "var(--nucleo-muted)" }}>
                  {new Date(activity.starts_at).toLocaleString("es-GT")}
                  {activity.location ? ` · ${activity.location}` : ""}
                  {activity.rsvp_count != null ? ` · ${activity.rsvp_count} RSVPs` : ""}
                </p>
                <button
                  type="button"
                  className="nucleo-btn"
                  onClick={() =>
                    setExpandedActivity(expandedActivity === activity.id ? null : activity.id)
                  }
                >
                  {expandedActivity === activity.id ? "Ocultar RSVPs" : "Ver RSVPs"}
                </button>
                {expandedActivity === activity.id && (
                  <div style={{ marginTop: 10 }}>
                    {rsvps.isLoading ? (
                      <PageLoading />
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0 }}>
                        {(rsvps.data ?? []).map((row) => (
                          <li key={row.id} style={{ marginBottom: 8 }}>
                            {row.athlete_name} · {row.status}
                            {row.status === "going" ? (
                              <button
                                type="button"
                                className="nucleo-btn"
                                style={{ marginLeft: 8 }}
                                disabled={confirm.isPending}
                                onClick={() => confirm.mutate(row.athlete)}
                              >
                                Confirmar asistencia
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="nucleo-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Retos</h2>
        <form onSubmit={onCreateChallenge} style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
          <input
            className="nucleo-input"
            placeholder="Nombre del reto"
            value={challengeName}
            onChange={(e) => setChallengeName(e.target.value)}
            required
          />
          <input
            className="nucleo-input"
            placeholder="Meta (km o cantidad)"
            value={challengeTarget}
            onChange={(e) => setChallengeTarget(e.target.value)}
            required
          />
          <input
            className="nucleo-input"
            type="datetime-local"
            value={challengeEnds}
            onChange={(e) => setChallengeEnds(e.target.value)}
          />
          <button className="nucleo-btn" type="submit" disabled={createChallenge.isPending}>
            {createChallenge.isPending ? "Creando…" : "Crear reto"}
          </button>
        </form>
        {challenges.isLoading ? (
          <PageLoading />
        ) : !(challenges.data ?? []).length ? (
          <EmptyState title="Sin retos" description="Crea el primer reto del club." />
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(challenges.data ?? []).map((challenge) => (
              <li
                key={challenge.id}
                style={{ borderBottom: "1px solid var(--nucleo-surface-2)", padding: "12px 0" }}
              >
                <strong>{challenge.name}</strong>
                <p style={{ margin: "4px 0", color: "var(--nucleo-muted)" }}>
                  Meta {challenge.target_value} ({challenge.metric}) · {challenge.participant_count ?? 0}{" "}
                  participantes
                </p>
                <button
                  type="button"
                  className="nucleo-btn"
                  onClick={() =>
                    setExpandedChallenge(
                      expandedChallenge === challenge.id ? null : challenge.id,
                    )
                  }
                >
                  {expandedChallenge === challenge.id ? "Ocultar ranking" : "Ver ranking"}
                </button>
                {expandedChallenge === challenge.id && (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
                    {(challengeBoard.data ?? []).map((row) => (
                      <li key={row.id} style={{ marginBottom: 6, color: "var(--nucleo-muted)" }}>
                        #{row.rank} {row.athlete_name} · {row.progress} · {row.status}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
