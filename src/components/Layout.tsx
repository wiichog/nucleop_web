import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

const gymNav = [
  { to: "/panel", label: "Retención y morosidad" },
  { to: "/panel/atletas", label: "Atletas" },
  { to: "/panel/pagos", label: "Pagos" },
  { to: "/panel/planes", label: "Planes" },
  { to: "/panel/solicitudes", label: "Solicitudes e invitaciones" },
  { to: "/panel/clases", label: "Clases" },
  { to: "/panel/comunidad", label: "Comunidad" },
  { to: "/panel/auditoria", label: "Auditoría" },
];

const clubNav = [{ to: "/panel/club", label: "Administrar club" }];

export function Layout() {
  const { gymIds, clubIds, isSuperuser, logout, primaryGymId, roles, setPrimaryGymId } =
    useAuth();
  const nav = [
    ...(clubIds.length ? clubNav : []),
    ...(isSuperuser
      ? [...gymNav, { to: "/panel/plataforma/gyms", label: "Plataforma: gimnasios" }]
      : gymNav),
  ];
  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <ParticleSnow />
      <aside
        style={{
          width: 250,
          background: "var(--nucleo-surface)",
          padding: 20,
          borderRight: "1px solid var(--nucleo-surface-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <AtomLogo size={22} />
          <strong style={{ fontSize: 20, letterSpacing: 0.5 }}>Nucleo</strong>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/panel"}
              style={({ isActive }) => ({
                padding: "10px 12px",
                borderRadius: 8,
                color: isActive ? "var(--nucleo-carbon)" : "var(--nucleo-white)",
                background: isActive ? "var(--nucleo-accent)" : "transparent",
                textDecoration: "none",
                fontWeight: 600,
              })}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        {gymIds.length > 1 && (
          <select
            className="nucleo-input"
            style={{ marginTop: 20 }}
            value={primaryGymId ?? ""}
            onChange={(event) => setPrimaryGymId(event.target.value)}
          >
            {gymIds.map((gymId) => (
              <option key={gymId} value={gymId}>
                Gym {gymId.slice(0, 8)}
              </option>
            ))}
          </select>
        )}
        <button
          className="nucleo-btn"
          style={{ marginTop: 28, background: "transparent", color: "var(--nucleo-muted)" }}
          onClick={logout}
        >
          Cerrar sesión
        </button>
        <p style={{ color: "var(--nucleo-muted)", fontSize: 12, marginTop: 20 }}>
          Rol: {roles.map((r) => r.role).join(", ") || "—"}
        </p>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
