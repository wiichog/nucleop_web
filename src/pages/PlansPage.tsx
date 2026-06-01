import { FormEvent, useState } from "react";
import { useCreatePlan, usePlans } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

export function PlansPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = usePlans(gymId);
  const createPlan = useCreatePlan(gymId);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [noshowPoints, setNoshowPoints] = useState("-10");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const points = parseInt(noshowPoints, 10);
    await createPlan.mutateAsync({
      name,
      price,
      duration_days: 30,
      noshow_penalty:
        Number.isFinite(points) && points !== 0
          ? {
              community_points: points,
              notify: true,
              message: "Penalización por no asistir a clase reservada.",
            }
          : null,
    });
    setName("");
    setPrice("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Planes y cuotas</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>Crear plan</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="nucleo-input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="nucleo-input" placeholder="Precio (Q)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <input
            className="nucleo-input"
            placeholder="Penalización no-show (pts comunidad, ej. -10)"
            value={noshowPoints}
            onChange={(e) => setNoshowPoints(e.target.value)}
            title="Puntos de comunidad que se restan si el atleta no asiste a una clase reservada"
          />
          <button className="nucleo-btn" disabled={!name || !price || createPlan.isPending}>
            Crear
          </button>
        </div>
      </form>
      <div className="nucleo-card">
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState
            title="Sin planes"
            description="Crea el primer plan para asignarlo a tus atletas."
          />
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
