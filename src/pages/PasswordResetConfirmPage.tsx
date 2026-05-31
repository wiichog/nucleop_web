import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePasswordResetConfirm } from "../api/hooks";

export function PasswordResetConfirmPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const reset = usePasswordResetConfirm();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await reset.mutateAsync({ uid, token, password });
  };

  return (
    <div className="auth-shell">
      <form className="nucleo-card" style={{ width: 380 }} onSubmit={submit}>
        <h1>Nueva contraseña</h1>
        <p style={{ color: "var(--nucleo-muted)" }}>Crea una clave nueva para tu cuenta.</p>
        <input
          className="nucleo-input"
          type="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ marginBottom: 16 }}
          required
        />
        {reset.isError && <p style={{ color: "var(--nucleo-danger)" }}>El enlace no es válido o expiró.</p>}
        {reset.isSuccess ? (
          <p>Contraseña actualizada. <Link to="/login">Inicia sesión</Link>.</p>
        ) : (
          <button className="nucleo-btn" style={{ width: "100%" }} disabled={!uid || !token || reset.isPending}>
            Actualizar contraseña
          </button>
        )}
      </form>
    </div>
  );
}
