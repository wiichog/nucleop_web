import { FormEvent, useState } from "react";
import { useBranches, useCreateBranch } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

export function BranchesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useBranches(gymId);
  const createBranch = useCreateBranch(gymId);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createBranch.mutateAsync({ name, location_text: location });
    setName("");
    setLocation("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Sucursales</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>Nueva sede</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input className="nucleo-input" placeholder="Nombre (ej. Zona 10)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="nucleo-input" placeholder="Ubicación" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button className="nucleo-btn" disabled={!name || createBranch.isPending}>
            Agregar
          </button>
        </div>
      </form>

      <div className="nucleo-card">
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState
            title="Sin sucursales"
            description="Agrega tus sedes para medir rentabilidad por ubicación."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sede</th>
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.location_text || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
