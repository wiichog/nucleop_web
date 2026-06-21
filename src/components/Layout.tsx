import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Group,
  Indicator,
  Menu,
  NavLink,
  ScrollArea,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  BarChart3,
  Bell,
  BellRing,
  Bug,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Dumbbell,
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
import { usePendingSummary } from "../api/hooks";
import type { PendingSummary } from "../api/types";
import { NAV_BADGE, PENDING_ITEMS } from "../lib/pending";
import { useAuth } from "../lib/auth";
import { AtomLogo } from "../landing/AtomLogo";
import { ParticleSnow } from "../landing/ParticleSnow";
import { ReportIssueButton } from "./ReportIssueModal";

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
          offset={6}
          styles={{ indicator: { fontSize: 10, fontWeight: 700, padding: "0 4px" } }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label={`Pendientes${total ? ` (${total})` : ""}`}
          >
            {total > 0 ? <BellRing size={20} /> : <Bell size={20} />}
          </ActionIcon>
        </Indicator>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          {total > 0 ? `Pendientes (${total})` : "Pendientes"}
        </Menu.Label>
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
              rightSection={
                <Badge color="flame" variant="filled" size="sm" circle>
                  {summary?.[item.key]}
                </Badge>
              }
            >
              {item.label}
            </Menu.Item>
          ))
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

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

export function Layout() {
  const { gymIds, clubIds, isSuperuser, email, primaryGymId, roles, setPrimaryGymId } = useAuth();
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
        { to: "/panel/plataforma/tickets", label: "Soporte / Reportes", icon: Bug },
      ],
    });
  }

  const isActive = (item: NavItem) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "lg" }}
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
          <Group gap="xs">
            <ReportIssueButton />
            {showGymNav && <NotificationsBell summary={counts} />}
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
                const badgeKey = NAV_BADGE[item.to];
                const badgeCount = badgeKey ? counts?.[badgeKey] ?? 0 : 0;
                return (
                  <NavLink
                    key={item.to}
                    component={RouterNavLink}
                    to={item.to}
                    end={item.end}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    rightSection={
                      badgeCount > 0 ? (
                        <Badge color="flame" variant="filled" size="sm" circle>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Badge>
                      ) : undefined
                    }
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
