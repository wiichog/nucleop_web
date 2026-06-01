import { FormEvent, useState } from "react";
import {
  useClassCheckins,
  useCreateClass,
  useGymClasses,
  useMemberships,
  useReceptionCheckin,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const classes = useGymClasses(gymId);
  const createClass = useCreateClass(gymId);
  const memberships = useMemberships(gymId);
  const [classType, setClassType] = useState("CrossFit");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const checkins = useClassCheckins(gymId, selectedClassId);
  const reception = useReceptionCheckin(gymId, selectedClassId);

  if (!gymId) return <NoGymAssigned />;
  if (classes.isError) return <PageError onRetry={() => classes.refetch()} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createClass.mutateAsync({
      class_type: classType,
      starts_at: new Date(startsAt).toISOString(),
      duration_min: 60,
      capacity: Number(capacity),
    });
    setStartsAt("");
  };

  return (
    <div>
      <h1>Calendario de clases</h1>
      <form className="nucleo-card" style={{ display: "flex", gap: 12, marginBottom: 16 }} onSubmit={submit}>
        <input className="nucleo-input" value={classType} onChange={(event) => setClassType(event.target.value)} />
        <input className="nucleo-input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        <input className="nucleo-input" type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
        <button className="nucleo-btn" disabled={!startsAt || createClass.isPending}>Crear</button>
      </form>
      <section className="nucleo-card">
        {classes.isLoading ? (
          <PageLoading />
        ) : !(classes.data ?? []).length ? (
          <EmptyState title="Sin clases" description="Crea la primera clase del calendario." />
        ) : (
        <table>
          <thead><tr><th>Clase</th><th>Fecha</th><th>Cupo</th><th>Estado</th><th>Recepción</th></tr></thead>
          <tbody>
            {(classes.data ?? []).map((gymClass) => (
              <tr key={gymClass.id}>
                <td>{gymClass.class_type}</td>
                <td>{new Date(gymClass.starts_at).toLocaleString("es-GT")}</td>
                <td>{gymClass.reserved_count}/{gymClass.capacity}</td>
                <td>{gymClass.status}</td>
                <td>
                  <button
                    className="nucleo-btn nucleo-btn--secondary"
                    onClick={() => setSelectedClassId(gymClass.id)}
                  >
                    Asistencia
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
      {!!selectedClassId && (
        <section className="nucleo-card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Check-in desde recepción</h2>
          <form
            style={{ display: "flex", gap: 12 }}
            onSubmit={async (event) => {
              event.preventDefault();
              await reception.mutateAsync(membershipId);
              setMembershipId("");
            }}
          >
            <select
              className="nucleo-input"
              value={membershipId}
              onChange={(event) => setMembershipId(event.target.value)}
            >
              <option value="">Selecciona un atleta activo</option>
              {(memberships.data ?? [])
                .filter(
                  (membership) =>
                    !!membership.status && ["active", "trial"].includes(membership.status),
                )
                .map((membership) => (
                  <option key={membership.id} value={membership.id}>{membership.athlete_name}</option>
                ))}
            </select>
            <button className="nucleo-btn" disabled={!membershipId || reception.isPending}>
              Registrar check-in
            </button>
          </form>
          <h3>Asistencia registrada</h3>
          {(checkins.data ?? []).length === 0 ? (
            <p>Sin check-ins registrados.</p>
          ) : (
            <table>
              <thead><tr><th>Atleta</th><th>Hora</th><th>Método</th></tr></thead>
              <tbody>
                {(checkins.data ?? []).map((checkin) => (
                  <tr key={checkin.id}>
                    <td>{checkin.athlete_name}</td>
                    <td>{new Date(checkin.checked_in_at).toLocaleString("es-GT")}</td>
                    <td>{checkin.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
