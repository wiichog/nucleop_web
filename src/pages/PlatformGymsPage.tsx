import { FormEvent, useState } from "react";
import { useCreatePlatformGym, usePlatformGyms } from "../api/hooks";
import { useAuth } from "../lib/auth";

export function PlatformGymsPage() {
  const { isSuperuser } = useAuth();
  const gyms = usePlatformGyms(isSuperuser);
  const createGym = useCreatePlatformGym();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  if (!isSuperuser) return <p>Se requiere rol de superadmin.</p>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createGym.mutateAsync({ name, location_text: location });
    setName("");
    setLocation("");
  };

  return (
    <div>
      <h1>Plataforma: gimnasios</h1>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        Alta y revisión de gimnasios conectados a Nucleo.
      </p>
      <form
        className="nucleo-card"
        style={{ display: "flex", gap: 12, marginBottom: 16 }}
        onSubmit={submit}
      >
        <input
          className="nucleo-input"
          placeholder="Nombre del gimnasio"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="nucleo-input"
          placeholder="Ubicación"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
        <button className="nucleo-btn" disabled={!name || createGym.isPending}>
          Crear gym
        </button>
      </form>
      <section className="nucleo-card">
        <table>
          <thead><tr><th>Gimnasio</th><th>Ubicación</th><th>SaaS</th><th>Comisión</th><th>Público</th></tr></thead>
          <tbody>
            {(gyms.data ?? []).map((gym) => (
              <tr key={gym.id}>
                <td>{gym.name}</td>
                <td>{gym.location_text || "—"}</td>
                <td>{gym.saas_plan}</td>
                <td>{gym.platform_commission_pct}</td>
                <td>{gym.is_public ? "sí" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
