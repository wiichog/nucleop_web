import { FormEvent, useState } from "react";
import {
  useAssignPlan,
  useDecideJoinRequest,
  useInviteAthlete,
  useJoinRequests,
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
  const [planId, setPlanId] = useState("");
  const [customFee, setCustomFee] = useState("");
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
          <button
            className="nucleo-btn"
            disabled={!planId || assign.isPending}
            onClick={() => assign.mutate({ membershipId, planId, customFee })}
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
  const [form, setForm] = useState({ phone: "", email: "", first_name: "", last_name: "" });

  if (!gymId) return <NoGymAssigned />;
  if (requests.isError) return <PageError onRetry={() => requests.refetch()} />;

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    await invite.mutateAsync(form);
    setForm({ phone: "", email: "", first_name: "", last_name: "" });
  };

  return (
    <div>
      <h1>Solicitudes e invitaciones</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onInvite}>
        <h2 style={{ marginTop: 0 }}>Invitar atleta</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {Object.entries(form).map(([key, value]) => (
            <input
              key={key}
              className="nucleo-input"
              placeholder={{ phone: "Teléfono", email: "Correo opcional", first_name: "Nombre", last_name: "Apellido" }[key]}
              value={value}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          ))}
        </div>
        {invite.isError && (
          <p style={{ color: "var(--nucleo-danger)", fontSize: 13 }}>
            No se pudo enviar la invitación. Verifica el teléfono.
          </p>
        )}
        <button className="nucleo-btn" style={{ marginTop: 12 }} disabled={!form.phone || !form.first_name || !form.last_name || invite.isPending}>
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
