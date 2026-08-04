import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Burger,
  Drawer,
  Group,
  Indicator,
  Menu,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  BarChart3,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Globe,
  Handshake,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Mail,
  MessageSquare,
  LifeBuoy,
  Package,
  Receipt,
  Scale,
  Tag,
  TrendingDown,
  UserCog,
  Wallet,
} from "lucide-react";
import { usePendingSummary } from "../api/hooks";
import type { PendingSummary } from "../api/types";
import { PENDING_ITEMS, navBadgeCount } from "../lib/pending";
import { useAuth } from "../lib/auth";
import { AtomLogo } from "../landing/AtomLogo";
import { ReportIssueButton } from "./ReportIssueModal";
import { CountBadge } from "./ui";
import { GlassChip, ToolButton } from "./aurora";

/**
 * Shell del panel en el lenguaje **Aurora**.
 *
 * Tres piezas, calcadas de `design/aurora-reference.html`:
 *  1. **Backdrop** fijo (carbón + blooms flame + grano + viñeta). El vidrio
 *     necesita algo luminoso debajo: sobre un negro plano se leería como gris.
 *  2. **Rail** de 72u con solo íconos que se expande a 264u al hover/focus.
 *     El contenido reserva siempre los 72u, así que expandirlo no reflowea
 *     nada. Colapsado, los pendientes se anuncian con un punto flame.
 *  3. **Header** con saludo + herramientas circulares de vidrio.
 */

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
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
      { to: "/panel", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/panel/clases", label: "Clases", icon: CalendarDays },
      { to: "/panel/coaches", label: "Coaches", icon: UserCog },
      { to: "/panel/tickets", label: "Reportes / tickets", icon: LifeBuoy },
    ],
  },
  {
    title: "Usuarios",
    items: [
      { to: "/panel/atletas", label: "Atletas", icon: Dumbbell },
      { to: "/panel/solicitudes", label: "Solicitudes", icon: Mail },
      { to: "/panel/planes", label: "Planes y cuotas", icon: Tag },
    ],
  },
  {
    title: "Comunidad",
    items: [
      { to: "/panel/comunidad", label: "Feed y atleta del mes", icon: MessageSquare },
      { to: "/panel/clubes", label: "Clubes", icon: Handshake },
    ],
  },
  {
    title: "Negocio (ERP)",
    items: [
      { to: "/panel/pagos", label: "Membresías", icon: CreditCard },
      { to: "/panel/coaches-pagos", label: "Pagos a coaches", icon: Wallet },
      { to: "/panel/inventario", label: "Inventario", icon: Package },
      { to: "/panel/pos", label: "Punto de venta", icon: Receipt },
      { to: "/panel/gastos", label: "Gastos", icon: TrendingDown },
      { to: "/panel/reportes", label: "Reportes de negocio", icon: BarChart3 },
    ],
  },
];

function RailItem({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <RouterNavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className="a-nav-item"
      data-active={active ? "true" : "false"}
      title={item.label}
    >
      {active && <span className="a-pip" aria-hidden />}
      <span className="a-nav-item__icon">
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <span className="a-nav-item__label">{item.label}</span>
      {badge > 0 && (
        <>
          <span className="a-nav-item__end">
            <CountBadge count={badge} />
          </span>
          <span className="a-nav-dot" aria-hidden />
        </>
      )}
    </RouterNavLink>
  );
}

function NavTree({
  groups,
  counts,
  isActive,
  onNavigate,
}: {
  groups: NavGroup[];
  counts?: PendingSummary;
  isActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title}>
          <div className="a-nav-group">
            <span className="a-kicker">{group.title}</span>
          </div>
          {group.items.map((item) => (
            <RailItem
              key={item.to}
              item={item}
              active={isActive(item)}
              badge={navBadgeCount(item.to, counts)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function NotificationsBell({ summary }: { summary?: PendingSummary }) {
  const navigate = useNavigate();
  const total = summary?.total ?? 0;
  const pendientes = PENDING_ITEMS.filter((i) => (summary?.[i.key] ?? 0) > 0);

  return (
    <Menu shadow="md" width={300} position="bottom-end" withinPortal>
      <Menu.Target>
        <Indicator
          color="flame"
          size={16}
          label={total > 99 ? "99+" : total}
          disabled={total === 0}
          offset={8}
          styles={{ indicator: { fontSize: 10, fontWeight: 700, padding: "0 4px" } }}
        >
          <ToolButton label={`Pendientes${total ? ` (${total})` : ""}`}>
            {total > 0 ? <BellRing size={19} strokeWidth={1.8} /> : <Bell size={19} strokeWidth={1.8} />}
          </ToolButton>
        </Indicator>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{total > 0 ? `Pendientes (${total})` : "Pendientes"}</Menu.Label>
        {pendientes.length === 0 ? (
          <Stack align="center" gap={4} py="md" px="sm">
            <CheckCircle2 size={22} color="var(--mantine-color-teal-5)" />
            <Text size="sm" c="dimmed" ta="center">
              Todo al día. No hay nada por aprobar.
            </Text>
          </Stack>
        ) : (
          pendientes.map((item) => (
            <Menu.Item
              key={item.key}
              onClick={() => navigate(item.to)}
              rightSection={<CountBadge count={summary?.[item.key] ?? 0} />}
            >
              {item.label}
            </Menu.Item>
          ))
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

/** Selector de contexto (gimnasio/club) como pastilla de vidrio del header. */
function ContextSwitcher() {
  const { gyms, primaryGymId, setPrimaryGymId, clubIds, primaryClubId, setPrimaryClubId } =
    useAuth();
  const activeGym = gyms.find((g) => g.id === primaryGymId);
  const multiGym = gyms.length > 1;
  const multiClub = clubIds.length > 1;

  if (!activeGym && !multiClub) return null;
  if (!multiGym && !multiClub) {
    return (
      <GlassChip className="a-pop" style={{ maxWidth: "calc(230 * var(--u))" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{activeGym?.name}</span>
      </GlassChip>
    );
  }

  return (
    <Menu shadow="md" width={260} position="bottom-end" withinPortal>
      <Menu.Target>
        <button
          type="button"
          className="a-chip a-pop"
          style={{ maxWidth: "calc(260 * var(--u))", cursor: "pointer" }}
          aria-label="Cambiar de gimnasio"
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeGym?.name ?? "Elegir gimnasio"}
          </span>
          <ChevronDown size={14} style={{ flex: "none", opacity: 0.7 }} />
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        {multiGym && <Menu.Label>Gimnasio activo</Menu.Label>}
        {multiGym &&
          gyms.map((gym) => (
            <Menu.Item
              key={gym.id}
              onClick={() => setPrimaryGymId(gym.id)}
              rightSection={gym.id === primaryGymId ? <Check size={15} /> : undefined}
            >
              {gym.name}
            </Menu.Item>
          ))}
        {multiClub && <Menu.Label>Club activo</Menu.Label>}
        {multiClub &&
          clubIds.map((id) => (
            <Menu.Item
              key={id}
              onClick={() => setPrimaryClubId(id)}
              rightSection={id === primaryClubId ? <Check size={15} /> : undefined}
            >
              {`Club ${id.slice(0, 8)}`}
            </Menu.Item>
          ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function Layout() {
  const { gyms, clubIds, isSuperuser, email, primaryGymId, roles, logout } = useAuth();
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const pending = usePendingSummary(primaryGymId ?? "");
  const counts = pending.data;

  const showGymNav = isSuperuser || roles.some((r) => ["gym_admin", "coach"].includes(r.role));
  const groups: NavGroup[] = [];
  if (clubIds.length) {
    groups.push({
      title: "Mi club",
      items: [{ to: "/panel/club", label: "Administrar club", icon: Handshake }],
    });
  }
  if (showGymNav) groups.push(...GROUPS);
  if (isSuperuser) {
    groups.push({
      title: "Plataforma",
      items: [
        { to: "/panel/plataforma/gyms", label: "Gimnasios", icon: Globe },
        { to: "/panel/plataforma/apelaciones", label: "Apelaciones", icon: Scale },
      ],
    });
  }

  const isActive = (item: NavItem) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const activeGym = gyms.find((g) => g.id === primaryGymId);

  return (
    <div className="aurora-stage">
      {/* Atmósfera: lo que el vidrio refracta. */}
      <div className="aurora-backdrop" />
      <div className="aurora-bloom aurora-bloom--flame animate-drift-1" />
      <div className="aurora-bloom aurora-bloom--cold animate-drift-2" />
      <div className="aurora-grain" />
      <div className="aurora-vignette" />

      {/* Rail: 72u colapsado, 264u al hover/focus. */}
      <aside className="a-rail a-glass-rail a-slide-l" aria-label="Navegación principal">
        <div className="a-rail__brand">
          {/* `glow={false}`: la marca va limpia. El halo naranja se retiró del
              sistema — el acento es relleno/borde/texto, nunca resplandor. */}
          <AtomLogo size={34} glow={false} />
          <span className="a-rail__wordmark">Nucleo</span>
        </div>

        <nav className="a-rail__scroll">
          <NavTree groups={groups} counts={counts} isActive={isActive} />
        </nav>

        <div style={{ flex: "none", paddingTop: "calc(8 * var(--u))" }}>
          <div className="a-nav-group">
            <span className="a-kicker">Sesión</span>
          </div>
          <RailItem
            item={{ to: "/panel/perfil", label: "Mi perfil", icon: UserCog }}
            active={location.pathname === "/panel/perfil"}
            badge={0}
          />
          <button
            type="button"
            className="a-nav-item"
            onClick={logout}
            style={{ width: "100%", background: "none", border: 0, cursor: "pointer" }}
            title="Cerrar sesión"
          >
            <span className="a-nav-item__icon">
              <LogOut size={19} strokeWidth={1.8} />
            </span>
            <span className="a-nav-item__label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="a-shell">
        <header className="a-header">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#fff" />
            <div style={{ minWidth: 0 }}>
              <div className="a-hello a-rise" style={{ animationDelay: ".14s" }}>
                Bienvenido
              </div>
              <div
                className="a-who a-rise"
                style={{
                  animationDelay: ".22s",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "calc(420 * var(--u))",
                }}
              >
                {email || activeGym?.name || "Panel del gimnasio"}
              </div>
            </div>
          </Group>

          <Group gap="sm" wrap="nowrap" style={{ flex: "none" }}>
            <ContextSwitcher />
            <ReportIssueButton />
            {showGymNav && <NotificationsBell summary={counts} />}
            <ToolButton
              label="Mi perfil"
              className="a-pop"
              onClick={() => navigate("/panel/perfil")}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "calc(17 * var(--u))",
                  fontFamily: 'var(--a-font-display)',
                }}
              >
                {(email[0] ?? "?").toUpperCase()}
              </span>
            </ToolButton>
          </Group>
        </header>

        <main>
          <Outlet />
        </main>
      </div>

      {/* Navegación en móvil: el rail se convierte en drawer de vidrio. */}
      <Drawer
        opened={opened}
        onClose={close}
        size={280}
        padding="md"
        title="Nucleo"
        hiddenFrom="sm"
        scrollAreaComponent={ScrollArea.Autosize}
        classNames={{ body: "a-nav-drawer" }}
      >
        <NavTree groups={groups} counts={counts} isActive={isActive} onNavigate={close} />
        <div className="a-nav-group">
          <span className="a-kicker">Sesión</span>
        </div>
        <RailItem
          item={{ to: "/panel/perfil", label: "Mi perfil", icon: UserCog }}
          active={location.pathname === "/panel/perfil"}
          badge={0}
          onNavigate={close}
        />
        <button
          type="button"
          className="a-nav-item"
          onClick={logout}
          style={{ width: "100%", background: "none", border: 0, cursor: "pointer" }}
        >
          <span className="a-nav-item__icon">
            <LogOut size={19} strokeWidth={1.8} />
          </span>
          <span className="a-nav-item__label">Cerrar sesión</span>
        </button>
      </Drawer>
    </div>
  );
}
