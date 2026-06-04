import { FormEvent, useState } from "react";
import {
  useAssignPlan,
  useDecideJoinRequest,
  useInviteAthlete,
  useJoinRequests,
  usePlanOffers,
  usePlans,
} from "../api/hooks";
import { JoinRequest } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

function RequestActions({ request, gymId }: { request: JoinRequest; gymId: string }) {
  const decide = useDecideJoinRequest(gymId);
  const assign = useAssignPlan(gymId);
  const plans = usePlans(gymId);
  const offers = usePlanOffers(gymId);
  const [planId, setPlanId] = useState("");
  const [customFee, setCustomFee] = useState("");
  const [offerId, setOfferId] = useState("");
  const [comment, setComment] = useState("");
  const status = request.status ?? "";
  const membershipId = request.membership;
  const canDecide = ["requested", "invited", "pending_approval"].includes(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {canDecide && (
        <input
          className="nucleo-input"
          placeholder="Comentario para el atleta (opcional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {canDecide && (
        <>
          <button className="nucleo-btn" onClick={() => decide.mutate({ requestId: request.id, decision: "approve", comment })}>
            Aprobar
          </button>
          {status !== "invited" && (
            <button className="nucleo-btn" onClick={() => decide.mutate({ requestId: request.id, decision: "offer_trial", comment })}>
              Ofrecer prueba
            </button>
          )}
          <button
            className="nucleo-btn"
            onClick={() => decide.mutate({ requestId: request.id, decision: "request_info", comment })}
          >
            Pedir información
          </button>
          <button className="nucleo-btn" onClick={() => decide.mutate({ requestId: request.id, decision: "reject", comment })}>
            Rechazar
          </button>
        </>
      )}
      {membershipId && ["approved_no_plan", "trial"].includes(status) && (
        <>
          <select className="nucleo-input" value={planId} onChange={(event) => setPlanId(event.target.value)}>
            <option value="">Selecciona plan</option>
            {(plans.data ?? []).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
          <input className="nucleo-input" placeholder="Cuota personalizada" value={customFee} onChange={(event) => setCustomFee(event.target.value)} />
          <select
            className="nucleo-input"
            value={offerId}
            onChange={(event) => setOfferId(event.target.value)}
            title="Aplica una oferta del catálogo (opcional)"
          >
            <option value="">Sin oferta</option>
            {(offers.data ?? [])
              .filter((o) => o.is_active && (!o.plan || o.plan === planId))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.offer_type === "percent" ? `${o.value}%` : `${o.value} meses`})
                </option>
              ))}
          </select>
          <button
            className="nucleo-btn"
            disabled={!planId || assign.isPending}
            onClick={() => assign.mutate({ membershipId, planId, customFee, offerId })}
          >
            Asignar plan
          </button>
        </>
      )}
      </div>
    </div>
  );
}

export function RequestsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const requests = useJoinRequests(gymId);
  const invite = useInviteAthlete(gymId);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", phone: "" });
  const [trialStart, setTrialStart] = useState("");
  const [trialEnd, setTrialEnd] = useState("");

  if (!gymId) return <NoGymAssigned />;
  if (requests.isError) return <PageError onRetry={() => requests.refetch()} />;

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    await invite.mutateAsync({
      ...form,
      trial_start: trialStart || null,
      trial_end: trialEnd || null,
    });
    setForm({ email: "", first_name: "", last_name: "", phone: "" });
    setTrialStart("");
    setTrialEnd("");
  };

  return (
    <div>
      <h1>Solicitudes e invitaciones</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onInvite}>
        <h2 style={{ marginTop: 0 }}>Invitar atleta</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {(["email", "first_name", "last_name", "phone"] as const).map((key) => (
            <input
              key={key}
              className="nucleo-input"
              type={key === "email" ? "email" : "text"}
              placeholder={{ email: "Correo electrónico", phone: "Teléfono (opcional)", first_name: "Nombre", last_name: "Apellido" }[key]}
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          ))}
        </div>
        <p style={{ color: "var(--nucleo-muted)", fontSize: 13, margin: "12px 0 4px" }}>
          Periodo temporal (opcional): al aceptar la invitación, el atleta queda como{" "}
          <strong>temporal (prueba)</strong> entre estas fechas.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Desde{" "}
            <input className="nucleo-input" type="date" value={trialStart} onChange={(e) => setTrialStart(e.target.value)} />
          </label>
          <label>
            Hasta{" "}
            <input className="nucleo-input" type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
          </label>
        </div>
        {invite.isError && (
          <p style={{ color: "var(--nucleo-danger)", fontSize: 13 }}>
            No se pudo enviar la invitación. Verifica el correo.
          </p>
        )}
        <button className="nucleo-btn" style={{ marginTop: 12 }} disabled={!form.email || !form.first_name || !form.last_name || invite.isPending}>
          {invite.isPending ? "Enviando…" : "Enviar invitación"}
        </button>
      </form>
      <section className="nucleo-card">
        {requests.isLoading ? (
          <PageLoading />
        ) : !(requests.data ?? []).length ? (
          <EmptyState title="Sin solicitudes" description="Las nuevas solicitudes de unión aparecerán aquí." />
        ) : (
        <table>
          <thead><tr><th>Atleta</th><th>Estado</th><th>Objetivo</th><th>Acciones</th></tr></thead>
          <tbody>
            {(requests.data ?? []).map((request) => (
              <tr key={request.id}>
                <td>{request.athlete_name}</td>
                <td>{request.status}</td>
                <td>{request.goal || "—"}</td>
                <td><RequestActions request={request} gymId={gymId} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}
