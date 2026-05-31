import { FormEvent, useState } from "react";
import { useCreatePlan, usePlans } from "../api/hooks";
import { useAuth } from "../lib/auth";

export function PlansPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = usePlans(gymId);
  const createPlan = useCreatePlan(gymId);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createPlan.mutateAsync({ name, price, duration_days: 30 });
    setName("");
    setPrice("");
  };

  if (!gymId) return <p>No tienes un gimnasio asignado.</p>;

  return (
    <div>
      <h1>Planes y cuotas</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>Crear plan</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="nucleo-input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="nucleo-input" placeholder="Precio (Q)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button className="nucleo-btn" disabled={!name || !price || createPlan.isPending}>
            Crear
          </button>
        </div>
      </form>
      <div className="nucleo-card">
        {isLoading ? (
          <p>Cargando…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Precio</th>
                <th>Duración (días)</th>
                <th>Renovación auto.</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>Q{p.price}</td>
                  <td>{p.duration_days}</td>
                  <td>{p.auto_renew_default ? "Sí" : "No"}</td>
                  <td>{p.is_active ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
