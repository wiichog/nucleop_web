import { FormEvent, useState } from "react";
import {
  useCreatePlatformGym,
  usePlatformGyms,
  useUpdatePlatformGym,
  useUpsertPlatformSubscription,
} from "../api/hooks";
import type { GymAdmin } from "../api/types";
import { useAuth } from "../lib/auth";

export function PlatformGymsPage() {
  const { isSuperuser } = useAuth();
  const gyms = usePlatformGyms(isSuperuser);
  const createGym = useCreatePlatformGym();
  const updateGym = useUpdatePlatformGym();
  const upsertSubscription = useUpsertPlatformSubscription();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState("");
  const [saasPlan, setSaasPlan] = useState("starter");
  const [commission, setCommission] = useState("0.0300");
  const [fixedFee, setFixedFee] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [nextBillingDate, setNextBillingDate] = useState("");

  if (!isSuperuser) return <p>Se requiere rol de superadmin.</p>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createGym.mutateAsync({ name, location_text: location });
    setName("");
    setLocation("");
  };

  const edit = (gym: GymAdmin) => {
    setEditingId(gym.id);
    setSaasPlan(gym.saas_plan ?? "starter");
    setCommission(gym.platform_commission_pct ?? "0.0300");
    setFixedFee(gym.fixed_fee ?? "");
    setIsPublic(gym.is_public ?? true);
    setMonthlyPrice(gym.subscription?.monthly_price ?? "");
    setSubscriptionStatus(gym.subscription?.status ?? "active");
    setNextBillingDate(gym.subscription?.next_billing_date ?? "");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    await updateGym.mutateAsync({
      gymId: editingId,
      body: {
        saas_plan: saasPlan,
        platform_commission_pct: commission,
        fixed_fee: fixedFee || null,
        is_public: isPublic,
      },
    });
    if (monthlyPrice) {
      await upsertSubscription.mutateAsync({
        gymId: editingId,
        body: {
          saas_plan: saasPlan,
          monthly_price: monthlyPrice,
          status: subscriptionStatus,
          next_billing_date: nextBillingDate || null,
        },
      });
    }
    setEditingId("");
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
      {editingId && (
        <form
          className="nucleo-card"
          style={{ display: "flex", gap: 12, marginBottom: 16 }}
          onSubmit={save}
        >
          <select
            className="nucleo-input"
            value={saasPlan}
            onChange={(event) => setSaasPlan(event.target.value)}
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <input
            className="nucleo-input"
            placeholder="Comisión (ej. 0.0300)"
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
          />
          <input
            className="nucleo-input"
            placeholder="Fee fijo"
            value={fixedFee}
            onChange={(event) => setFixedFee(event.target.value)}
          />
          <input
            className="nucleo-input"
            placeholder="Suscripción mensual"
            value={monthlyPrice}
            onChange={(event) => setMonthlyPrice(event.target.value)}
          />
          <select
            className="nucleo-input"
            value={subscriptionStatus}
            onChange={(event) => setSubscriptionStatus(event.target.value)}
          >
            <option value="active">Activa</option>
            <option value="paused">Pausada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <input
            className="nucleo-input"
            type="date"
            value={nextBillingDate}
            onChange={(event) => setNextBillingDate(event.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            Público
          </label>
          <button
            className="nucleo-btn"
            disabled={!commission || updateGym.isPending || upsertSubscription.isPending}
          >
            Guardar
          </button>
        </form>
      )}
      <section className="nucleo-card">
        <table>
          <thead><tr><th>Gimnasio</th><th>Ubicación</th><th>SaaS</th><th>Suscripción</th><th>Comisión</th><th>Fee fijo</th><th>Público</th><th></th></tr></thead>
          <tbody>
            {(gyms.data ?? []).map((gym) => (
              <tr key={gym.id}>
                <td>{gym.name}</td>
                <td>{gym.location_text || "—"}</td>
                <td>{gym.saas_plan}</td>
                <td>
                  {gym.subscription
                    ? `Q${gym.subscription.monthly_price} (${gym.subscription.status})`
                    : "—"}
                </td>
                <td>{gym.platform_commission_pct}</td>
                <td>{gym.fixed_fee ?? "—"}</td>
                <td>{gym.is_public ? "sí" : "no"}</td>
                <td><button className="link-btn" onClick={() => edit(gym)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
