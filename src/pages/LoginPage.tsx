import { FormEvent, useState } from "react";
import { useLogin, usePasswordResetRequest } from "../api/hooks";
import { AtomLogo } from "../landing/AtomLogo";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const login = useLogin();
  const reset = usePasswordResetRequest();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login.mutateAsync({ email: email.trim().toLowerCase(), password });
    window.location.assign("/panel");
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
            Ingresa el correo con el que te registraste. Te enviaremos instrucciones si la cuenta existe.
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
          <AtomLogo size={26} />
          <h1 style={{ margin: 0, fontSize: 24 }}>Nucleo</h1>
        </div>
        <p style={{ color: "var(--nucleo-muted)", marginTop: 0 }}>
          Panel del gimnasio
        </p>
        <label>Correo electrónico</label>
        <input
          className="nucleo-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@tugym.com"
          style={{ marginBottom: 12 }}
          required
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
