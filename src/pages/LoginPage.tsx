import { FormEvent, useState } from "react";
import { useLogin, usePasswordResetRequest } from "../api/hooks";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

function AuthBrand({ subtitle }: { subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 20 }}>
      <AtomLogo size={64} />
      <strong style={{ fontSize: 30, letterSpacing: 0.5 }}>Nucleo</strong>
      <span style={{ color: "var(--nucleo-accent)", fontSize: 13, fontWeight: 600 }}>{subtitle}</span>
    </div>
  );
}

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
        <ParticleSnow />
        <form
          className="nucleo-card nucleo-card--glass"
          style={{ width: 360, position: "relative" }}
          onSubmit={async (event) => {
            event.preventDefault();
            await reset.mutateAsync(identifier);
          }}
        >
          <AuthBrand subtitle="Recupera tu acceso" />
          <h1 style={{ fontSize: 22 }}>Recuperar contraseña</h1>
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
    <div className="auth-shell">
      <ParticleSnow />
      <form
        className="nucleo-card nucleo-card--glass"
        style={{ width: 360, position: "relative" }}
        onSubmit={onSubmit}
      >
        <AuthBrand subtitle="Panel del gimnasio" />
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
