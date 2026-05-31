import { FormEvent, useState } from "react";
import { useCreateClass, useGymClasses } from "../api/hooks";
import { useAuth } from "../lib/auth";

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const classes = useGymClasses(gymId);
  const createClass = useCreateClass(gymId);
  const [classType, setClassType] = useState("CrossFit");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("20");

  if (!gymId) return <p>No tienes un gimnasio asignado.</p>;

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
        <table>
          <thead><tr><th>Clase</th><th>Fecha</th><th>Cupo</th><th>Estado</th></tr></thead>
          <tbody>
            {(classes.data ?? []).map((gymClass) => (
              <tr key={gymClass.id}>
                <td>{gymClass.class_type}</td>
                <td>{new Date(gymClass.starts_at).toLocaleString("es-GT")}</td>
                <td>{gymClass.reserved_count}/{gymClass.capacity}</td>
                <td>{gymClass.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
