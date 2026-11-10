import { useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { Download, Search, Settings2, UserPlus } from "lucide-react";
import { useAtRisk, useMemberships } from "../api/hooks";
import type { Membership } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader, StatusBadge } from "../components/ui";
import { FilterChip, GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { administraGym, useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { MEMBERSHIP_STATUS, PAYMENT_STATUS, label } from "../lib/labels";
import { sortRecords } from "../lib/sortRecords";
import { AjustesRiesgoModal } from "./usuarios/AjustesRiesgoModal";
import { FichaAtleta } from "./usuarios/FichaAtleta";
import { InvitarAtletaModal } from "./usuarios/InvitarAtletaModal";
import {
  agruparPorServicio,
  estaEnServicio,
  necesitaAtencion,
  paymentPriority,
} from "./usuarios/reglasAtletas";
import { Vencimiento } from "./usuarios/Vencimiento";

// Las reglas viven en `usuarios/reglasAtletas.ts`; se re-exportan aquí porque es
// donde las buscan los tests y quien lee la pantalla.
export { dondeSeGestiona, efectoDeAsignarPlan, ultimoBloqueo } from "./usuarios/reglasAtletas";
export type { EfectoDePlan } from "./usuarios/reglasAtletas";

/**
 * Segmentos del padrón (viven en la URL: así los pendientes "bajas por confirmar"
 * o "morosos" abren el padrón YA filtrado). `pendiente` = lo que hay que atender:
 * su contador sale en amarillo.
 */
const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "morosos", label: "Morosos", pendiente: true },
  { value: "por_vencer", label: "Por vencer", pendiente: true },
  { value: "en_riesgo", label: "En riesgo", pendiente: true },
  { value: "bajas", label: "Bajas", pendiente: true, soloSiHay: true },
  { value: "pausadas", label: "Congeladas" },
  // Sin este segmento, un socio bloqueado quedaba enterrado en el padrón.
  { value: "bloqueadas", label: "Bloqueadas", soloSiHay: true },
];

/**
 * Segmentos que son la relación económica del socio (pago, retención). El coach
 * entra al padrón para pasar lista y el backend no le manda nada de eso
 * (`MembershipCoachSerializer`; `/overdue` y `/retention/at-risk` le dan 403),
 * así que sus contadores saldrían siempre en 0: se le esconden.
 */
const FILTROS_DEL_ADMIN = new Set(["morosos", "por_vencer", "en_riesgo"]);

/** Cómo ordenar la lista. Los dos primeros son de dinero: solo para el admin. */
const ORDENES: {
  value: string;
  label: string;
  accessor: keyof Membership | "payment_priority";
  direction: "asc" | "desc";
  admin?: boolean;
}[] = [
  { value: "prioridad", label: "Primero los que deben", accessor: "payment_priority", direction: "asc", admin: true },
  { value: "vencimiento", label: "Vencimiento", accessor: "days_to_due", direction: "asc", admin: true },
  { value: "nombre", label: "Nombre", accessor: "athlete_name", direction: "asc" },
  { value: "estado", label: "Estado", accessor: "status", direction: "asc" },
  { value: "plan", label: "Plan", accessor: "plan_name", direction: "asc" },
  { value: "antiguedad", label: "Más antiguos", accessor: "start_date", direction: "asc" },
  { value: "puntos", label: "Más puntos", accessor: "community_points", direction: "desc" },
];

/** Cuántas filas se pintan de entrada; el resto con «Ver más». */
const PASO = 60;

/** Una persona del padrón: tocarla abre su ficha con todas sus acciones. */
function FilaAtleta({
  m,
  enRiesgo,
  onOpen,
}: {
  m: Membership;
  enRiesgo: boolean;
  onOpen: () => void;
}) {
  const pidioBaja = (m.status as string) === "pending_leave" && m.leave_initiated_by === "athlete";
  return (
    <Tarjeta
      etiqueta={`Abrir ficha de ${m.athlete_name}`}
      onClick={onOpen}
      aviso={necesitaAtencion(m, enRiesgo)}
      style={{ padding: "8px 12px" }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Avatar src={m.athlete_photo} color="flame" radius="xl" size={36}>
            {m.athlete_name?.[0]?.toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} truncate>
              {m.athlete_name}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {m.plan_name || "Sin plan"}
              {m.billing_group_name ? ` · ${m.billing_group_name}` : ""}
              {` · ${m.community_points ?? 0} pts`}
            </Text>
          </div>
        </Group>
        <Group gap={6} wrap="wrap" justify="flex-end" style={{ flexShrink: 0, maxWidth: "55%" }}>
          {pidioBaja ? (
            <Badge color="yellow" variant="light">
              Pidió su baja
            </Badge>
          ) : m.status !== "active" ? (
            <StatusBadge kind="membership" status={m.status} />
          ) : null}
          {enRiesgo && (
            <Badge color="yellow" variant="light">
              En riesgo
            </Badge>
          )}
          <Vencimiento days={m.days_to_due} date={m.renewal_date} graceUntil={m.payment_grace_until} />
        </Group>
      </Group>
    </Tarjeta>
  );
}

export function AthletesPage() {
  const { primaryGymId, roles, isSuperuser } = useAuth();
  const gymId = primaryGymId ?? "";
  const esAdmin = administraGym(roles, isSuperuser, gymId);
  const filtros = esAdmin ? FILTROS : FILTROS.filter((f) => !FILTROS_DEL_ADMIN.has(f.value));
  const ordenes = esAdmin ? ORDENES : ORDENES.filter((o) => !o.admin);
  const { data, isLoading, isError, refetch } = useMemberships(gymId);
  const atRisk = useAtRisk(gymId, esAdmin);
  const [searchParams, setSearchParams] = useSearchParams();
  // Un enlace con `?filtro=morosos` abierto por un coach cae en "todos".
  const filtroUrl = searchParams.get("filtro") ?? "todos";
  const filtro = filtros.some((f) => f.value === filtroUrl) ? filtroUrl : "todos";
  const [limite, setLimite] = useState(PASO);
  const setFiltro = (v: string) => {
    setLimite(PASO);
    setSearchParams(v && v !== "todos" ? { filtro: v } : {}, { replace: true });
  };
  // Servicio dentro de Morosos / En riesgo ("" = todos). También en la URL; cambiar
  // de segmento lo limpia (setFiltro reescribe los parámetros sin él).
  const servicio = searchParams.get("servicio") ?? "";
  const setServicio = (v: string) =>
    setSearchParams(v ? { filtro, servicio: v } : { filtro }, { replace: true });
  const [search, setSearch] = useState("");
  const [orden, setOrden] = useState<string | null>(null);
  const ordenActivo = ordenes.find((o) => o.value === orden) ?? ordenes[0];
  const [abierta, setAbierta] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [ajustando, setAjustando] = useState(false);

  if (!gymId) return <NoGymAssigned />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const padron = data ?? [];
  const atRiskIds = new Set((atRisk.data ?? []).map((m) => m.id));
  const enSegmento = (m: Membership, f: string) => {
    if (f === "morosos") return m.payment_status === "overdue";
    if (f === "por_vencer") return m.payment_status === "due_soon";
    if (f === "en_riesgo") return atRiskIds.has(m.id);
    if (f === "pausadas") return m.status === "paused";
    if (f === "bloqueadas") return (m.status as string) === "blocked";
    // Baja pedida por una de las partes: espera que la otra la confirme o la cancele.
    if (f === "bajas") return (m.status as string) === "pending_leave";
    return true;
  };
  // Los contadores son del padrón completo, no del segmento que esté elegido.
  const conteo = (f: string) => padron.filter((m) => enSegmento(m, f)).length;
  const bajasPorConfirmar = padron.filter(
    (m) => (m.status as string) === "pending_leave" && m.leave_initiated_by === "athlete",
  ).length;

  const segmento = padron.filter((m) => enSegmento(m, filtro));
  // Morosos y En riesgo, divididos por los servicios de su plan (`plan_services`).
  // Un plan de dos servicios cuenta en los dos; sin servicios cae en "Sin servicio".
  const porServicio = filtro === "morosos" || filtro === "en_riesgo";
  const gruposServicio = porServicio ? agruparPorServicio(segmento) : [];
  const servicioActivo =
    porServicio && gruposServicio.some((g) => g.value === servicio) ? servicio : "";
  const q = search.trim().toLowerCase();
  const filtered = segmento.filter((m) => {
    if (servicioActivo && !estaEnServicio(m, servicioActivo)) return false;
    if (q && !(m.athlete_name ?? "").toLowerCase().includes(q) && !(m.plan_name ?? "").toLowerCase().includes(q))
      return false;
    return true;
  });
  const rows =
    ordenActivo.accessor === "payment_priority"
      ? [...filtered].sort(
          (a, b) =>
            paymentPriority(a) - paymentPriority(b) ||
            (a.athlete_name ?? "").localeCompare(b.athlete_name ?? ""),
        )
      : sortRecords(filtered, {
          columnAccessor: ordenActivo.accessor,
          direction: ordenActivo.direction,
        });

  const exportar = () =>
    downloadCsv(
      "atletas-nucleo.csv",
      ["atleta", "estado", "plan", "cuota", "pago", "vence_en_dias", "puntos_comunidad"],
      rows.map((m) => [
        m.athlete_name,
        label(MEMBERSHIP_STATUS, m.status),
        m.plan_name ?? "Sin plan",
        m.effective_fee ?? "",
        label(PAYMENT_STATUS, m.payment_status),
        m.days_to_due ?? "",
        m.community_points,
      ]),
    );

  return (
    <div>
      <PageHeader kicker="Usuarios · Padrón" title="Atletas" />

      <GlassCard padding={18} delay={0.6}>
        <Encabezado
          titulo="Padrón"
          avisos={
            esAdmin && bajasPorConfirmar > 0 ? (
              <UnstyledButton onClick={() => setFiltro("bajas")} aria-label="Ver bajas por confirmar">
                <Badge color="yellow" variant="light" style={{ cursor: "pointer" }}>
                  {bajasPorConfirmar} {bajasPorConfirmar === 1 ? "baja" : "bajas"} por confirmar
                </Badge>
              </UnstyledButton>
            ) : null
          }
        >
          <TextInput
            placeholder="Buscar atleta o plan…"
            aria-label="Buscar atleta o plan"
            leftSection={<Search size={15} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setLimite(PASO);
            }}
            w={{ base: "100%", sm: 240 }}
          />
          <Tooltip label="Exportar CSV">
            <ActionIcon variant="default" size="lg" aria-label="Exportar CSV" onClick={exportar}>
              <Download size={16} />
            </ActionIcon>
          </Tooltip>
          {/* Invitar es solo del admin (`GymInvitationView` → GYM_ADMIN). */}
          {esAdmin && (
            <Button leftSection={<UserPlus size={16} />} onClick={() => setInvitando(true)}>
              Invitar atleta
            </Button>
          )}
        </Encabezado>

        <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="sm">
          <Group gap={8} wrap="wrap">
            {filtros.map((f) => {
              // En riesgo sin su lista no tiene número: un 0 diría "nadie en riesgo".
              const n = f.value === "en_riesgo" && atRisk.isError ? null : conteo(f.value);
              if (f.soloSiHay && !n && filtro !== f.value) return null;
              return (
                <FilterChip key={f.value} active={filtro === f.value} onClick={() => setFiltro(f.value)}>
                  {f.label}
                  {n != null && (n > 0 || f.value === "todos") ? (
                    <Badge
                      ml={6}
                      size="sm"
                      variant="light"
                      color={f.pendiente ? "yellow" : "gray"}
                      style={{ verticalAlign: "middle" }}
                    >
                      {n}
                    </Badge>
                  ) : null}
                </FilterChip>
              );
            })}
          </Group>
          <Group gap="xs" wrap="wrap">
            <Select
              aria-label="Ordenar"
              size="xs"
              w={190}
              data={ordenes.map((o) => ({ value: o.value, label: o.label }))}
              value={ordenActivo.value}
              onChange={setOrden}
              allowDeselect={false}
            />
            {/* Riesgo y mora definen QUIÉN cae en esos filtros: se ajustan aquí
                mismo. Solo del admin: el coach no lee ni guarda la config (403). */}
            {esAdmin && (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                leftSection={<Settings2 size={14} />}
                onClick={() => setAjustando(true)}
              >
                Riesgo y mora
              </Button>
            )}
          </Group>
        </Group>

        {gruposServicio.length > 1 && (
          <Group gap={8} wrap="wrap" mb="sm">
            <FilterChip active={!servicioActivo} onClick={() => setServicio("")}>
              Todos los servicios
            </FilterChip>
            {gruposServicio.map((g) => (
              <FilterChip
                key={g.value}
                active={servicioActivo === g.value}
                onClick={() => setServicio(g.value)}
              >
                {g.label} · {g.count}
              </FilterChip>
            ))}
          </Group>
        )}

        {/* Sin la lista de riesgo el filtro "En riesgo" sale vacío y parece que no hay
            nadie en riesgo: hay que decir que es un fallo de carga, no un dato. */}
        {filtro === "en_riesgo" && atRisk.isError ? (
          <PageError
            message="No se pudo cargar la lista de atletas en riesgo."
            onRetry={() => atRisk.refetch()}
          />
        ) : isLoading ? (
          <Text size="sm" c="dimmed">
            Cargando…
          </Text>
        ) : rows.length === 0 ? (
          <Stack gap="xs" align="flex-start">
            <Text size="sm" c="dimmed">
              {padron.length === 0
                ? "Todavía no hay atletas."
                : q
                  ? "Nadie coincide con la búsqueda."
                  : "Ningún atleta en este grupo."}
            </Text>
            {padron.length === 0 && esAdmin && (
              <Button size="xs" variant="light" onClick={() => setInvitando(true)}>
                Invitar al primero
              </Button>
            )}
          </Stack>
        ) : (
          <Stack gap={6}>
            {rows.slice(0, limite).map((m) => (
              <FilaAtleta
                key={m.id}
                m={m}
                enRiesgo={esAdmin && atRiskIds.has(m.id)}
                onOpen={() => setAbierta(m.id)}
              />
            ))}
            {rows.length > limite && (
              <Button variant="subtle" onClick={() => setLimite(limite + PASO)}>
                Ver más ({rows.length - limite})
              </Button>
            )}
          </Stack>
        )}
      </GlassCard>

      <FichaAtleta gymId={gymId} membershipId={abierta} esAdmin={esAdmin} onClose={() => setAbierta("")} />
      {esAdmin && (
        <>
          <InvitarAtletaModal gymId={gymId} opened={invitando} onClose={() => setInvitando(false)} />
          <AjustesRiesgoModal gymId={gymId} opened={ajustando} onClose={() => setAjustando(false)} />
        </>
      )}
    </div>
  );
}
