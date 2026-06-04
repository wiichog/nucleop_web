import { FormEvent, useState } from "react";
import {
  useCreatePlan,
  useCreatePlanOffer,
  usePlanOffers,
  usePlans,
  useTogglePlanOffer,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

const OFFER_LABEL: Record<string, string> = { percent: "Descuento %", free_months: "Meses gratis" };

export function PlansPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = usePlans(gymId);
  const createPlan = useCreatePlan(gymId);
  const offers = usePlanOffers(gymId);
  const createOffer = useCreatePlanOffer(gymId);
  const toggleOffer = useTogglePlanOffer(gymId);

  // Form de plan
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [classLimit, setClassLimit] = useState("");
  const [specialAccess, setSpecialAccess] = useState(false);
  const [openGym, setOpenGym] = useState(false);
  const [noshowPoints, setNoshowPoints] = useState("-10");

  // Form de oferta
  const [offerName, setOfferName] = useState("");
  const [offerType, setOfferType] = useState<"percent" | "free_months">("percent");
  const [offerValue, setOfferValue] = useState("");
  const [offerPlan, setOfferPlan] = useState("");
  const [offerFrom, setOfferFrom] = useState("");
  const [offerTo, setOfferTo] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const points = parseInt(noshowPoints, 10);
    await createPlan.mutateAsync({
      name,
      price,
      duration_days: Number(durationDays) || 30,
      class_limit: classLimit ? Number(classLimit) : null,
      special_classes_access: specialAccess,
      open_gym_access: openGym,
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
    setClassLimit("");
  };

  const onCreateOffer = async (event: FormEvent) => {
    event.preventDefault();
    await createOffer.mutateAsync({
      name: offerName,
      offer_type: offerType,
      value: offerValue,
      plan: offerPlan || null,
      valid_from: offerFrom || null,
      valid_to: offerTo || null,
    });
    setOfferName("");
    setOfferValue("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Planes y cuotas</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>Crear plan</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <label>
            Nombre
            <input className="nucleo-input" placeholder="Mensual CrossFit" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Precio (Q)
            <input className="nucleo-input" placeholder="350" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            Duración (días)
            <input className="nucleo-input" type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          </label>
          <label>
            Límite de clases (opcional)
            <input className="nucleo-input" type="number" placeholder="Sin límite" value={classLimit} onChange={(e) => setClassLimit(e.target.value)} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "12px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={specialAccess} onChange={(e) => setSpecialAccess(e.target.checked)} />
            Acceso a clases especiales
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={openGym} onChange={(e) => setOpenGym(e.target.checked)} />
            Open gym
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Penalización no-show (pts)
            <input
              className="nucleo-input"
              style={{ width: 90 }}
              value={noshowPoints}
              onChange={(e) => setNoshowPoints(e.target.value)}
              title="Puntos de comunidad que se restan si el atleta no asiste a una clase reservada"
            />
          </label>
          <button className="nucleo-btn" disabled={!name || !price || createPlan.isPending}>
            {createPlan.isPending ? "Creando…" : "Crear plan"}
          </button>
        </div>
      </form>

      <form className="nucleo-card nucleo-card--glow" style={{ marginBottom: 16 }} onSubmit={onCreateOffer}>
        <h2 style={{ marginTop: 0 }}>Crear oferta / promoción</h2>
        <p style={{ color: "var(--nucleo-muted)", fontSize: 13, marginTop: -6 }}>
          Ej.: “2 meses gratis” (meses gratis = 2) o “30% de fecha a fecha” (descuento % = 30 con rango).
          Se aplican al asignar el plan a un atleta.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <label>
            Nombre de la oferta
            <input className="nucleo-input" placeholder="Promo verano" value={offerName} onChange={(e) => setOfferName(e.target.value)} />
          </label>
          <label>
            Tipo
            <select className="nucleo-input" value={offerType} onChange={(e) => setOfferType(e.target.value as "percent" | "free_months")}>
              <option value="percent">Descuento %</option>
              <option value="free_months">Meses gratis</option>
            </select>
          </label>
          <label>
            {offerType === "percent" ? "Porcentaje (0-100)" : "Meses gratis"}
            <input className="nucleo-input" placeholder={offerType === "percent" ? "30" : "2"} value={offerValue} onChange={(e) => setOfferValue(e.target.value)} />
          </label>
          <label>
            Plan (opcional)
            <select className="nucleo-input" value={offerPlan} onChange={(e) => setOfferPlan(e.target.value)}>
              <option value="">Cualquier plan</option>
              {(data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Válida desde
            <input className="nucleo-input" type="date" value={offerFrom} onChange={(e) => setOfferFrom(e.target.value)} />
          </label>
          <label>
            Válida hasta
            <input className="nucleo-input" type="date" value={offerTo} onChange={(e) => setOfferTo(e.target.value)} />
          </label>
        </div>
        <button className="nucleo-btn" style={{ marginTop: 12 }} disabled={!offerName || !offerValue || createOffer.isPending}>
          {createOffer.isPending ? "Creando…" : "Crear oferta"}
        </button>
      </form>

      <div className="nucleo-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Ofertas</h2>
        {offers.isLoading ? (
          <PageLoading />
        ) : !(offers.data ?? []).length ? (
          <EmptyState title="Sin ofertas" description="Crea promociones reutilizables para tus planes." />
        ) : (
          <table>
            <thead>
              <tr><th>Oferta</th><th>Tipo</th><th>Valor</th><th>Plan</th><th>Vigencia</th><th>Activa</th></tr>
            </thead>
            <tbody>
              {(offers.data ?? []).map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{OFFER_LABEL[o.offer_type] ?? o.offer_type}</td>
                  <td>{o.offer_type === "percent" ? `${o.value}%` : `${o.value} meses`}</td>
                  <td>{o.plan_name ?? "Cualquiera"}</td>
                  <td>{o.valid_from || "—"} → {o.valid_to || "—"}</td>
                  <td>
                    <button
                      className="nucleo-btn nucleo-btn--secondary"
                      disabled={toggleOffer.isPending}
                      onClick={() => toggleOffer.mutate({ offerId: o.id, is_active: !o.is_active })}
                    >
                      {o.is_active ? "Activa ✓" : "Inactiva"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="nucleo-card">
        <h2 style={{ marginTop: 0 }}>Planes</h2>
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
