import { FormEvent, useState } from "react";
import { useLogin, usePasswordResetRequest } from "../api/hooks";

export function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const login = useLogin();
  const reset = usePasswordResetRequest();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login.mutateAsync({ phone, password });
    window.location.assign("/");
  };

  if (resetMode) {
    return (
      <div className="auth-shell">
        <form
          className="nucleo-card"
          style={{ width: 360 }}
          onSubmit={async (event) => {
            event.preventDefault();
            await reset.mutateAsync(identifier);
          }}
        >
          <h1>Recuperar contraseña</h1>
          <p style={{ color: "var(--nucleo-muted)" }}>
            Ingresa tu teléfono o correo. Si la cuenta tiene correo, enviaremos instrucciones.
          </p>
          <input
            className="nucleo-input"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            style={{ marginBottom: 16 }}
            required
          />
          {reset.isSuccess && <p>Solicitud recibida. Revisa tu correo.</p>}
          <button className="nucleo-btn" style={{ width: "100%" }} disabled={reset.isPending}>
            Enviar instrucciones
          </button>
          <button className="link-btn" type="button" onClick={() => setResetMode(false)}>
            Volver al login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form className="nucleo-card" style={{ width: 360 }} onSubmit={onSubmit}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--nucleo-accent)",
              boxShadow: "0 0 14px var(--nucleo-accent)",
            }}
          />
          <h1 style={{ margin: 0, fontSize: 24 }}>Nucleo</h1>
        </div>
        <p style={{ color: "var(--nucleo-muted)", marginTop: 0 }}>
          Panel del gimnasio
        </p>
        <label>Teléfono</label>
        <input
          className="nucleo-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+502 ..."
          style={{ marginBottom: 12 }}
        />
        <label>Contraseña</label>
        <input
          className="nucleo-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {login.isError && (
          <p style={{ color: "var(--nucleo-danger)" }}>Credenciales inválidas.</p>
        )}
        <button className="nucleo-btn" style={{ width: "100%" }} disabled={login.isPending}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </button>
        <button className="link-btn" type="button" onClick={() => setResetMode(true)}>
          Olvidé mi contraseña
        </button>
      </form>
    </div>
  );
}
