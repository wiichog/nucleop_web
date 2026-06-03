import { FormEvent, useState } from "react";
import { usePasswordChange } from "../api/hooks";
import { useAuth } from "../lib/auth";
import { AUDIT_ROLE, label } from "../lib/labels";

export function ProfilePage() {
  const { email, roles, isSuperuser, logout, primaryGymId } = useAuth();
  const changePassword = usePasswordChange();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (next.length < 8) {
      setErr("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    try {
      await changePassword.mutateAsync({ current_password: current, new_password: next });
      setMsg("Contraseña actualizada.");
      setCurrent("");
      setNext("");
    } catch {
      setErr("No se pudo cambiar la contraseña. Verifica la actual.");
    }
  };

  const rolesLabel =
    roles.map((r) => label(AUDIT_ROLE, r.role)).join(", ") ||
    (isSuperuser ? "Superadmin" : "—");

  return (
    <div>
      <h1>Mi perfil</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <section className="nucleo-card" style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ marginTop: 0 }}>Cuenta</h2>
          <p>
            <strong>Correo:</strong> {email || "—"}
          </p>
          <p>
            <strong>Rol:</strong> {rolesLabel}
          </p>
          <p>
            <strong>Gimnasio actual:</strong>{" "}
            {primaryGymId ? `${primaryGymId.slice(0, 8)}…` : "—"}
          </p>
          <button
            className="nucleo-btn nucleo-btn--secondary"
            style={{ marginTop: 12 }}
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </section>

        <section className="nucleo-card" style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ marginTop: 0 }}>Cambiar contraseña</h2>
          <form onSubmit={onSubmit}>
            <label>Contraseña actual</label>
            <input
              className="nucleo-input"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <label>Nueva contraseña</label>
            <input
              className="nucleo-input"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {msg && <p style={{ color: "var(--nucleo-accent)" }}>{msg}</p>}
            {err && <p style={{ color: "var(--nucleo-danger)" }}>{err}</p>}
            <button className="nucleo-btn" disabled={!current || !next || changePassword.isPending}>
              {changePassword.isPending ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
