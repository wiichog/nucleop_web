import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/hooks";

export function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login.mutateAsync({ phone, password });
    navigate("/");
  };

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
      </form>
    </div>
  );
}
