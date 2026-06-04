import { FormEvent, useMemo, useState } from "react";
import {
  useAthletesOfMonth,
  useGymClasses,
  useGymFeed,
  useMemberships,
  usePostAnnouncement,
  useSetAthleteOfMonth,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

const KIND_LABEL: Record<string, string> = {
  pr: "PR",
  badge: "Badge",
  points: "Puntos",
  athlete_of_month: "Atleta del mes",
  challenge: "Reto",
  announcement: "Anuncio",
};

export function CommunityPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const feed = useGymFeed(gymId);
  const classes = useGymClasses(gymId);
  const memberships = useMemberships(gymId);
  const awards = useAthletesOfMonth(gymId);
  const setAom = useSetAthleteOfMonth(gymId);
  const postAnnouncement = usePostAnnouncement(gymId);

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annClass, setAnnClass] = useState("");

  // Tipos de clase distintos del gym, más la opción "todo el gym" (class_type vacío).
  const classTypes = useMemo(() => {
    const set = new Set<string>();
    (classes.data ?? []).forEach((c) => c.class_type && set.add(c.class_type));
    return Array.from(set).sort();
  }, [classes.data]);

  const activeAthletes = useMemo(
    () => (memberships.data ?? []).filter((m) => ["active", "trial"].includes(m.status ?? "")),
    [memberships.data],
  );

  const awardFor = (classType: string) =>
    (awards.data ?? []).find((a) => (a.class_type ?? "") === classType);

  const onSetAom = (classType: string, athleteId: string) =>
    setAom.mutate({ class_type: classType, athlete_id: athleteId || null });

  const onPost = async (event: FormEvent) => {
    event.preventDefault();
    await postAnnouncement.mutateAsync({ title: annTitle, body: annBody, class_type: annClass || undefined });
    setAnnTitle("");
    setAnnBody("");
    setAnnClass("");
  };

  if (!gymId) return <NoGymAssigned />;
  if (feed.isError) return <PageError onRetry={() => feed.refetch()} />;

  // Filas de atleta del mes: "Todo el gym" + cada tipo de clase.
  const aomRows = ["", ...classTypes];

  return (
    <div>
      <h1>Comunidad del gym</h1>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        Feed de PRs, badges, puntos, anuncios y destacados de tu comunidad.
      </p>

      <section className="nucleo-card nucleo-card--glow" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Atleta del mes por clase</h2>
        <p style={{ color: "var(--nucleo-muted)", fontSize: 13, marginTop: -6 }}>
          Selección manual. Elige un atleta por clase (el de pilates no es el de crossfit) o deja “Sin
          asignar”.
        </p>
        {memberships.isLoading || awards.isLoading ? (
          <PageLoading />
        ) : (
          <table>
            <thead>
              <tr><th>Clase</th><th>Atleta del mes</th></tr>
            </thead>
            <tbody>
              {aomRows.map((ct) => {
                const current = awardFor(ct);
                return (
                  <tr key={ct || "__all__"}>
                    <td>{ct || "Todo el gym"}</td>
                    <td>
                      <select
                        className="nucleo-input"
                        style={{ maxWidth: 320 }}
                        value={current?.athlete ?? ""}
                        disabled={setAom.isPending}
                        onChange={(e) => onSetAom(ct, e.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {activeAthletes.map((m) => (
                          <option key={m.athlete} value={m.athlete}>
                            {m.athlete_name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="nucleo-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Publicar anuncio en el feed</h2>
        <form onSubmit={onPost}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <input
              className="nucleo-input"
              placeholder="Título del anuncio"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
            />
            <select className="nucleo-input" value={annClass} onChange={(e) => setAnnClass(e.target.value)}>
              <option value="">Todo el gym</option>
              {classTypes.map((ct) => (
                <option key={ct} value={ct}>Solo {ct}</option>
              ))}
            </select>
          </div>
          <textarea
            className="nucleo-input"
            placeholder="Mensaje para tus atletas…"
            value={annBody}
            onChange={(e) => setAnnBody(e.target.value)}
            rows={3}
            style={{ marginTop: 12, resize: "vertical" }}
          />
          <button
            className="nucleo-btn"
            style={{ marginTop: 12 }}
            disabled={!annTitle || !annBody || postAnnouncement.isPending}
          >
            {postAnnouncement.isPending ? "Publicando…" : "Publicar anuncio"}
          </button>
        </form>
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
                style={{ borderBottom: "1px solid var(--nucleo-surface-2)", padding: "12px 0" }}
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
