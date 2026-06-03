import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { to: "/panel", label: "Dashboard", icon: "📊", end: true },
      { to: "/panel/retencion", label: "Retención y morosidad", icon: "🔥" },
      { to: "/panel/clases", label: "Clases", icon: "🗓️" },
      { to: "/panel/pagos", label: "Pagos", icon: "💳" },
      { to: "/panel/actividad", label: "Actividad", icon: "📋" },
    ],
  },
  {
    title: "Usuarios",
    items: [
      { to: "/panel/atletas", label: "Atletas", icon: "🏋️" },
      { to: "/panel/solicitudes", label: "Solicitudes", icon: "✉️" },
      { to: "/panel/planes", label: "Planes y cuotas", icon: "🏷️" },
    ],
  },
  {
    title: "Comunidad",
    items: [
      { to: "/panel/comunidad", label: "Feed y atleta del mes", icon: "💬" },
      { to: "/panel/clubes", label: "Clubes", icon: "🤝" },
    ],
  },
  {
    title: "Negocio (ERP)",
    items: [
      { to: "/panel/inventario", label: "Inventario", icon: "📦" },
      { to: "/panel/pos", label: "Punto de venta", icon: "🧾" },
      { to: "/panel/gastos", label: "Gastos", icon: "💸" },
      { to: "/panel/sucursales", label: "Sucursales", icon: "🏢" },
      { to: "/panel/reportes", label: "Reportes de negocio", icon: "📈" },
    ],
  },
];

const STORAGE_KEY = "nucleo.nav.collapsed";

export function Layout() {
  const { gymIds, clubIds, isSuperuser, email, primaryGymId, roles, setPrimaryGymId } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      return !c;
    });
  };

  const showGymNav = isSuperuser || roles.some((r) => ["gym_admin", "coach"].includes(r.role));
  const groups: NavGroup[] = [];
  if (clubIds.length) {
    groups.push({
      title: "Mi club",
      items: [{ to: "/panel/club", label: "Administrar club", icon: "🤝" }],
    });
  }
  if (showGymNav) groups.push(...GROUPS);
  if (isSuperuser) {
    groups.push({
      title: "Plataforma",
      items: [{ to: "/panel/plataforma/gyms", label: "Gimnasios", icon: "🌐" }],
    });
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: collapsed ? "10px 0" : "9px 12px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 8,
    color: isActive ? "var(--nucleo-carbon)" : "var(--nucleo-white)",
    background: isActive ? "var(--nucleo-accent)" : "transparent",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <ParticleSnow />
      <aside
        style={{
          width: collapsed ? 68 : 244,
          transition: "width .15s ease",
          background: "var(--nucleo-surface)",
          borderRight: "1px solid var(--nucleo-surface-2)",
          display: "flex",
          flexDirection: "column",
          padding: collapsed ? "16px 10px" : "18px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            marginBottom: 14,
          }}
        >
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AtomLogo size={22} />
              <strong style={{ fontSize: 19, letterSpacing: 0.5 }}>Nucleo</strong>
            </div>
          )}
          <button
            onClick={toggle}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            style={{
              background: "var(--nucleo-surface-2)",
              color: "var(--nucleo-white)",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto", flex: 1 }}>
          {groups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p
                  style={{
                    color: "var(--nucleo-muted)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    margin: "14px 12px 4px",
                  }}
                >
                  {group.title}
                </p>
              )}
              {collapsed && <div style={{ height: 10 }} />}
              {group.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} title={n.label} style={linkStyle}>
                  <span style={{ fontSize: 16 }}>{n.icon}</span>
                  {!collapsed && <span>{n.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {gymIds.length > 1 && !collapsed && (
          <select
            className="nucleo-input"
            style={{ marginTop: 12 }}
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

        <NavLink
          to="/panel/perfil"
          title="Mi perfil"
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 10,
            background: isActive ? "var(--nucleo-accent)" : "var(--nucleo-surface-2)",
            color: isActive ? "var(--nucleo-carbon)" : "var(--nucleo-white)",
            textDecoration: "none",
            fontWeight: 600,
          })}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--nucleo-accent)",
              color: "var(--nucleo-carbon)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {(email[0] ?? "?").toUpperCase()}
          </span>
          {!collapsed && (
            <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>
              {email || "Mi perfil"}
            </span>
          )}
        </NavLink>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
