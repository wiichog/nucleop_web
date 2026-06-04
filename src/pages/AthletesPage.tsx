import { useEffect, useState } from "react";
import {
  useEditAthleteProfile,
  useMembershipDetail,
  useMemberships,
  useResetAthletePassword,
  useSendReminder,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { MEMBERSHIP_STATUS, PAYMENT_STATUS, label } from "../lib/labels";

const STATUS_BADGE: Record<string, string> = {
  active: "badge--ok",
  trial: "badge--ok",
  overdue: "badge--danger",
  expired: "badge--warn",
};

/** Iniciales o foto del atleta como avatar circular. */
function Avatar({ photo, name, size = 38 }: { photo?: string | null; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", background: "var(--nucleo-surface-2)" }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--nucleo-surface-2)",
        color: "var(--nucleo-accent)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
      }}
    >
      {initials || "?"}
    </span>
  );
}

/** Badge de vencimiento a partir de días restantes (negativo = vencido). */
function DueBadge({ days, date }: { days?: number | null; date?: string | null }) {
  if (days == null) return <span style={{ color: "var(--nucleo-muted)" }}>—</span>;
  const cls = days < 0 ? "badge--danger" : days <= 7 ? "badge--warn" : "badge--ok";
  const text =
    days < 0 ? `Vencido hace ${Math.abs(days)} d` : days === 0 ? "Vence hoy" : `${days} días`;
  return (
    <span className={`badge ${cls}`} title={date ? `Vence: ${date}` : undefined}>
      {text}
    </span>
  );
}

function EmergencyContact({ value }: { value?: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0)
    return <span style={{ color: "var(--nucleo-muted)" }}>Sin contacto de emergencia</span>;
  const name = (value.name as string) || "";
  const phone = (value.phone as string) || "";
  const relation = (value.relation as string) || "";
  return (
    <span>
      {name || "—"} {relation ? `(${relation})` : ""} {phone ? `· ${phone}` : ""}
    </span>
  );
}

export function AthletesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading, isError, refetch } = useMemberships(gymId);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const detail = useMembershipDetail(gymId, selectedMembershipId);
  const resetPassword = useResetAthletePassword(gymId);
  const sendReminder = useSendReminder(gymId);
  const editProfile = useEditAthleteProfile(gymId);
  const [msg, setMsg] = useState("");

  // Form de edición de perfil (se hidrata cuando carga la ficha).
  const [edit, setEdit] = useState({ first_name: "", last_name: "", birth_date: "", ec_name: "", ec_phone: "", ec_relation: "" });
  useEffect(() => {
    const a = detail.data?.athlete_profile;
    if (!a) return;
    const ec = (a.emergency_contact ?? {}) as Record<string, string>;
    setEdit({
      first_name: a.first_name ?? "",
      last_name: a.last_name ?? "",
      birth_date: a.birth_date ?? "",
      ec_name: ec.name ?? "",
      ec_phone: ec.phone ?? "",
      ec_relation: ec.relation ?? "",
    });
  }, [detail.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onResetPassword = async (membershipId: string, name: string) => {
    if (!window.confirm(`¿Enviar restablecimiento de contraseña a ${name}? Se le pedirá cambiarla al ingresar.`))
      return;
    try {
      await resetPassword.mutateAsync(membershipId);
      setMsg(`Se envió el restablecimiento a ${name}.`);
    } catch {
      setMsg("No se pudo enviar el restablecimiento.");
    }
  };

  const onReminder = async (membershipId: string, name: string) => {
    try {
      await sendReminder.mutateAsync({ membershipId });
      setMsg(`Recordatorio enviado a ${name}.`);
    } catch {
      setMsg("No se pudo enviar el recordatorio.");
    }
  };

  const onSaveProfile = async () => {
    try {
      await editProfile.mutateAsync({
        membershipId: selectedMembershipId,
        first_name: edit.first_name,
        last_name: edit.last_name,
        birth_date: edit.birth_date || null,
        emergency_contact:
          edit.ec_name || edit.ec_phone || edit.ec_relation
            ? { name: edit.ec_name, phone: edit.ec_phone, relation: edit.ec_relation }
            : null,
      });
      setMsg("Perfil del atleta actualizado.");
    } catch {
      setMsg("No se pudo actualizar el perfil.");
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
              ["atleta", "estado", "plan", "cuota", "pago", "vence_en_dias", "puntos_comunidad"],
              (data ?? []).map((m) => [
                m.athlete_name,
                label(MEMBERSHIP_STATUS, m.status),
                m.plan_name ?? "Sin plan",
                m.effective_fee ?? "",
                label(PAYMENT_STATUS, m.payment_status),
                m.days_to_due ?? "",
                m.community_points,
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
      {msg && <p style={{ color: "var(--nucleo-accent)" }}>{msg}</p>}
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
                <th>Cuota</th>
                <th>Pago</th>
                <th>Vencimiento</th>
                <th>Puntos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar photo={m.athlete_photo} name={m.athlete_name} />
                      <span>{m.athlete_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[m.status ?? ""] ?? "badge--warn"}`}>
                      {label(MEMBERSHIP_STATUS, m.status)}
                    </span>
                  </td>
                  <td>{m.plan_name ?? "—"}</td>
                  <td>Q{m.effective_fee ?? "—"}</td>
                  <td>{label(PAYMENT_STATUS, m.payment_status)}</td>
                  <td>
                    <DueBadge days={m.days_to_due} date={m.renewal_date} />
                  </td>
                  <td>{m.community_points}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="nucleo-btn nucleo-btn--secondary"
                        onClick={() => setSelectedMembershipId(m.id)}
                      >
                        Ver detalle
                      </button>
                      <button
                        className="nucleo-btn nucleo-btn--secondary"
                        disabled={sendReminder.isPending}
                        onClick={() => onReminder(m.id, m.athlete_name)}
                        title="Enviar recordatorio de pago/vencimiento"
                      >
                        Recordatorio
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail.data && (
        <section className="nucleo-card nucleo-card--glass" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar photo={detail.data.athlete_profile.photo} name={detail.data.athlete_name} size={56} />
              <div>
                <h2 style={{ margin: 0 }}>{detail.data.athlete_profile.full_name ?? detail.data.athlete_name}</h2>
                <span style={{ color: "var(--nucleo-muted)" }}>
                  {detail.data.plan_name ?? "Sin plan"} · {label(MEMBERSHIP_STATUS, detail.data.status)}{" "}
                  {detail.data.renewal_date ? (
                    <>
                      · vence {detail.data.renewal_date}{" "}
                      <DueBadge days={detail.data.days_to_due} date={detail.data.renewal_date} />
                    </>
                  ) : null}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="nucleo-btn nucleo-btn--secondary"
                disabled={sendReminder.isPending}
                onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name)}
              >
                Enviar recordatorio
              </button>
              <button
                className="nucleo-btn nucleo-btn--secondary"
                disabled={resetPassword.isPending}
                onClick={() => onResetPassword(selectedMembershipId, detail.data!.athlete_name)}
              >
                Restablecer contraseña
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 14 }}>
            <p style={{ margin: 0 }}>
              <strong>Cumpleaños:</strong>{" "}
              {detail.data.athlete_profile.birth_date || (
                <span style={{ color: "var(--nucleo-muted)" }}>Sin registrar</span>
              )}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Contacto de emergencia:</strong>{" "}
              <EmergencyContact value={detail.data.athlete_profile.emergency_contact} />
            </p>
            <p style={{ margin: 0 }}>
              <strong>Nivel / objetivos:</strong>{" "}
              {detail.data.athlete_profile.sport_level || "Nivel sin registrar"} ·{" "}
              {detail.data.athlete_profile.goals || "Objetivos sin registrar"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Notas internas:</strong> {detail.data.internal_notes || "Sin notas"}
            </p>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", color: "var(--nucleo-accent)", fontWeight: 600 }}>
              Editar datos del atleta
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
              <label>
                Nombre
                <input className="nucleo-input" value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} />
              </label>
              <label>
                Apellido
                <input className="nucleo-input" value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} />
              </label>
              <label>
                Cumpleaños
                <input className="nucleo-input" type="date" value={edit.birth_date} onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })} />
              </label>
              <label>
                Contacto (nombre)
                <input className="nucleo-input" value={edit.ec_name} onChange={(e) => setEdit({ ...edit, ec_name: e.target.value })} />
              </label>
              <label>
                Contacto (teléfono)
                <input className="nucleo-input" value={edit.ec_phone} onChange={(e) => setEdit({ ...edit, ec_phone: e.target.value })} />
              </label>
              <label>
                Parentesco
                <input className="nucleo-input" value={edit.ec_relation} onChange={(e) => setEdit({ ...edit, ec_relation: e.target.value })} />
              </label>
            </div>
            <button className="nucleo-btn" style={{ marginTop: 10 }} disabled={editProfile.isPending} onClick={onSaveProfile}>
              {editProfile.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </details>

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
