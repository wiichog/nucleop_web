import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

// Navegación agrupada por tema (cada bloque tiene su encabezado).
const GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { to: "/panel", label: "Retención y morosidad", end: true },
      { to: "/panel/clases", label: "Clases" },
      { to: "/panel/pagos", label: "Pagos" },
      { to: "/panel/actividad", label: "Actividad" },
    ],
  },
  {
    title: "Usuarios",
    items: [
      { to: "/panel/atletas", label: "Atletas" },
      { to: "/panel/solicitudes", label: "Solicitudes e invitaciones" },
      { to: "/panel/planes", label: "Planes y cuotas" },
    ],
  },
  {
    title: "Comunidad",
    items: [
      { to: "/panel/comunidad", label: "Feed y atleta del mes" },
      { to: "/panel/clubes", label: "Clubes" },
    ],
  },
  {
    title: "Negocio (ERP)",
    items: [
      { to: "/panel/inventario", label: "Inventario" },
      { to: "/panel/pos", label: "Punto de venta" },
      { to: "/panel/gastos", label: "Gastos" },
      { to: "/panel/sucursales", label: "Sucursales" },
      { to: "/panel/reportes", label: "Reportes de negocio" },
    ],
  },
];

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "9px 12px",
  borderRadius: 8,
  color: isActive ? "var(--nucleo-carbon)" : "var(--nucleo-white)",
  background: isActive ? "var(--nucleo-accent)" : "transparent",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
});

const headerStyle = {
  color: "var(--nucleo-muted)",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  margin: "16px 12px 4px",
};

export function Layout() {
  const { gymIds, clubIds, isSuperuser, logout, primaryGymId, roles, setPrimaryGymId } =
    useAuth();
  const showGymNav = isSuperuser || roles.some((r) => ["gym_admin", "coach"].includes(r.role));

  const groups: NavGroup[] = [];
  if (clubIds.length) {
    groups.push({ title: "Mi club", items: [{ to: "/panel/club", label: "Administrar club" }] });
  }
  if (showGymNav) {
    groups.push(...GROUPS);
  }
  if (isSuperuser) {
    groups.push({
      title: "Plataforma",
      items: [{ to: "/panel/plataforma/gyms", label: "Gimnasios" }],
    });
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AtomLogo size={22} />
          <strong style={{ fontSize: 20, letterSpacing: 0.5 }}>Nucleo</strong>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {groups.map((group) => (
            <div key={group.title}>
              <p style={headerStyle}>{group.title}</p>
              {group.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} style={linkStyle}>
                  {n.label}
                </NavLink>
              ))}
            </div>
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
          style={{ marginTop: 24, background: "transparent", color: "var(--nucleo-muted)" }}
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
