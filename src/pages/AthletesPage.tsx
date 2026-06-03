import { useState } from "react";
import { useMembershipDetail, useMemberships, useResetAthletePassword } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";

const STATUS_BADGE: Record<string, string> = {
  active: "badge--ok",
  trial: "badge--ok",
  overdue: "badge--danger",
  expired: "badge--warn",
};

export function AthletesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading, isError, refetch } = useMemberships(gymId);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const detail = useMembershipDetail(gymId, selectedMembershipId);
  const resetPassword = useResetAthletePassword(gymId);
  const [resetMsg, setResetMsg] = useState("");

  const onResetPassword = async (membershipId: string, name: string) => {
    if (!window.confirm(`¿Enviar restablecimiento de contraseña a ${name}? Se le pedirá cambiarla al ingresar.`))
      return;
    try {
      await resetPassword.mutateAsync(membershipId);
      setResetMsg(`Se envió el restablecimiento a ${name}.`);
    } catch {
      setResetMsg("No se pudo enviar el restablecimiento.");
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <h1>Atletas del gimnasio</h1>
        <button
          className="nucleo-btn"
          style={{ alignSelf: "center" }}
          onClick={() =>
            downloadCsv(
              "atletas-nucleo.csv",
              ["atleta", "estado", "plan", "cuota", "pago", "puntos_comunidad"],
              (data ?? []).map((membership) => [
                membership.athlete_name,
                membership.status,
                membership.plan,
                membership.effective_fee,
                membership.payment_status,
                membership.community_points,
              ]),
            )
          }
        >
          Exportar CSV
        </button>
      </div>
      <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
        Solo se muestra la relación con ESTE gym (visibilidad por relación).
      </p>
      <div className="nucleo-card">
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState title="Sin atletas" description="Aprueba solicitudes o invita atletas al gym." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Cuota efectiva</th>
                <th>Estado de pago</th>
                <th>Puntos comunidad</th>
                <th>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{m.athlete_name}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[m.status ?? ""] ?? "badge--warn"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{m.plan ?? "—"}</td>
                  <td>Q{m.effective_fee ?? "—"}</td>
                  <td>{m.payment_status}</td>
                  <td>{m.community_points}</td>
                  <td>
                    <button
                      className="nucleo-btn nucleo-btn--secondary"
                      onClick={() => setSelectedMembershipId(m.id)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {detail.data && (
        <section className="nucleo-card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ marginTop: 0 }}>Ficha relacional: {detail.data.athlete_name}</h2>
            <button
              className="nucleo-btn nucleo-btn--secondary"
              disabled={resetPassword.isPending}
              onClick={() => onResetPassword(selectedMembershipId, detail.data!.athlete_name)}
            >
              Restablecer contraseña
            </button>
          </div>
          {resetMsg && <p style={{ color: "var(--nucleo-accent)" }}>{resetMsg}</p>}
          <p style={{ color: "var(--nucleo-muted)" }}>
            {detail.data.athlete_profile.sport_level || "Nivel sin registrar"} ·{" "}
            {detail.data.athlete_profile.goals || "Objetivos sin registrar"}
          </p>
          <p>
            <strong>Notas internas:</strong> {detail.data.internal_notes || "Sin notas"}
          </p>
          <h3>Pagos en este gimnasio</h3>
          {detail.data.payments.length === 0 ? (
            <p>Sin pagos registrados.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Fecha</th><th>Método</th><th>Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {detail.data.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.created_at).toLocaleDateString("es-GT")}</td>
                    <td>{payment.method}</td>
                    <td>Q{payment.amount}</td>
                    <td>{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3>Asistencia en este gimnasio</h3>
          {detail.data.checkins.length === 0 ? (
            <p>Sin check-ins registrados.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Clase</th><th>Fecha</th><th>Método</th></tr>
              </thead>
              <tbody>
                {detail.data.checkins.map((checkin) => (
                  <tr key={checkin.id}>
                    <td>{checkin.class_type}</td>
                    <td>{new Date(checkin.starts_at).toLocaleString("es-GT")}</td>
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
