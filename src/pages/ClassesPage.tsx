import { FormEvent, useState } from "react";
import {
  useClassCheckins,
  useCreateRecurringClasses,
  useGymClasses,
  useMemberships,
  useReceptionCheckin,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";
import { CLASS_STATUS, label } from "../lib/labels";

const WEEKDAYS = [
  { value: 0, label: "Lun" },
  { value: 1, label: "Mar" },
  { value: 2, label: "Mié" },
  { value: 3, label: "Jue" },
  { value: 4, label: "Vie" },
  { value: 5, label: "Sáb" },
  { value: 6, label: "Dom" },
];

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const classes = useGymClasses(gymId);
  const createRecurring = useCreateRecurringClasses(gymId);
  const memberships = useMemberships(gymId);
  const [classType, setClassType] = useState("CrossFit");
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState("20");
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [openEnded, setOpenEnded] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const checkins = useClassCheckins(gymId, selectedClassId);
  const reception = useReceptionCheckin(gymId, selectedClassId);

  if (!gymId) return <NoGymAssigned />;
  if (classes.isError) return <PageError onRetry={() => classes.refetch()} />;

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await createRecurring.mutateAsync({
      class_type: classType,
      start_time: startTime,
      duration_min: Number(duration),
      capacity: Number(capacity),
      weekdays,
      from_date: fromDate,
      ...(openEnded ? { open_ended: true } : { to_date: toDate }),
    });
    setCreated((res as { created: number }).created);
  };

  return (
    <div>
      <h1>Calendario de clases</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Crear clases (horario fijo)</h2>
        <p style={{ color: "var(--nucleo-muted)", fontSize: 13, marginTop: -6 }}>
          Ej.: CrossFit de 6:00 a 7:00, de lunes a viernes, durante un rango de fechas.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input className="nucleo-input" placeholder="Tipo de clase" value={classType} onChange={(e) => setClassType(e.target.value)} />
          <label>Hora <input className="nucleo-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
          <label>Min <input className="nucleo-input" style={{ width: 80 }} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
          <label>Cupo <input className="nucleo-input" style={{ width: 80 }} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          {WEEKDAYS.map((d) => (
            <button
              type="button"
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className="nucleo-btn"
              style={{
                background: weekdays.includes(d.value) ? "var(--nucleo-accent)" : "var(--nucleo-surface-2)",
                color: weekdays.includes(d.value) ? "var(--nucleo-carbon)" : "var(--nucleo-white)",
                padding: "6px 12px",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>Desde <input className="nucleo-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label style={{ opacity: openEnded ? 0.5 : 1 }}>
            Hasta{" "}
            <input
              className="nucleo-input"
              type="date"
              value={toDate}
              disabled={openEnded}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={openEnded} onChange={(e) => setOpenEnded(e.target.checked)} />
            Sin fecha de fin (se repite siempre)
          </label>
          <button className="nucleo-btn" disabled={!weekdays.length || createRecurring.isPending}>
            {createRecurring.isPending ? "Creando…" : "Crear clases"}
          </button>
          {created !== null && (
            <span style={{ color: "var(--nucleo-accent)" }}>
              Se crearon {created} clases{openEnded ? " (próximas 8 semanas; vuelve a generar para extender)" : ""}.
            </span>
          )}
        </div>
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
                <td>{label(CLASS_STATUS, gymClass.status)}</td>
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
