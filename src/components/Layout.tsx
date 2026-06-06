import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Select,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Sparkles,
  Globe,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  MessageSquare,
  LifeBuoy,
  Package,
  Receipt,
  Tag,
  TrendingDown,
  UserCog,
  Wallet,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";

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
      { to: "/panel/servicios", label: "Servicios", icon: Sparkles },
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
      { to: "/panel/pagos", label: "Pagos", icon: CreditCard },
      { to: "/panel/coaches-pagos", label: "Pagos a coaches", icon: Wallet },
      { to: "/panel/inventario", label: "Inventario", icon: Package },
      { to: "/panel/pos", label: "Punto de venta", icon: Receipt },
      { to: "/panel/gastos", label: "Gastos", icon: TrendingDown },
      { to: "/panel/sucursales", label: "Sucursales", icon: Building2 },
      { to: "/panel/reportes", label: "Reportes de negocio", icon: BarChart3 },
    ],
  },
];

export function Layout() {
  const { gymIds, clubIds, isSuperuser, email, primaryGymId, roles, setPrimaryGymId } = useAuth();
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();

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
      items: [{ to: "/panel/plataforma/gyms", label: "Gimnasios", icon: Globe }],
    });
  }

  const isActive = (item: NavItem) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <AtomLogo size={24} />
            <Text fw={700} size="lg" ff='"Space Grotesk", sans-serif' style={{ letterSpacing: 0.5 }}>
              Nucleo
            </Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          {groups.map((group) => (
            <Box key={group.title} mb="sm">
              <Text size="xs" tt="uppercase" c="dimmed" fw={600} px="sm" mb={4} style={{ letterSpacing: 1 }}>
                {group.title}
              </Text>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    component={RouterNavLink}
                    to={item.to}
                    end={item.end}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={isActive(item)}
                    onClick={close}
                    variant="filled"
                    style={{ borderRadius: 8 }}
                  />
                );
              })}
            </Box>
          ))}
        </AppShell.Section>

        <AppShell.Section>
          {gymIds.length > 1 && (
            <Select
              mb="sm"
              size="sm"
              label="Gimnasio activo"
              value={primaryGymId ?? ""}
              onChange={(v) => v && setPrimaryGymId(v)}
              data={gymIds.map((id) => ({ value: id, label: `Gym ${id.slice(0, 8)}` }))}
              comboboxProps={{ withinPortal: true }}
            />
          )}
          <NavLink
            component={RouterNavLink}
            to="/panel/perfil"
            active={location.pathname === "/panel/perfil"}
            onClick={() => {
              close();
              navigate("/panel/perfil");
            }}
            label={<Text size="sm" truncate>{email || "Mi perfil"}</Text>}
            description="Mi perfil"
            leftSection={
              <Avatar color="flame" radius="xl" size={28}>
                {(email[0] ?? "?").toUpperCase()}
              </Avatar>
            }
            variant="filled"
            style={{ borderRadius: 10 }}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <ParticleSnow />
        <Box style={{ position: "relative" }}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
