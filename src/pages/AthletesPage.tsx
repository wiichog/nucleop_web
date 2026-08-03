import { useEffect, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  NumberInput,
  Popover,
  Select,
  SimpleGrid,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Download,
  Eye,
  KeyRound,
  LogOut,
  Mail,
  MoreVertical,
  Pause,
  Play,
  Settings2,
  Smartphone,
  Snowflake,
  TrendingDown,
} from "lucide-react";
import {
  useAtRisk,
  useEditAthleteProfile,
  useGymConfig,
  useGymLeaveDecision,
  useMembershipDetail,
  useMemberships,
  usePauseMembership,
  useResetAthletePassword,
  useResumeMembership,
  useSendReminder,
  useUpdateGymConfig,
  useUpdateMembershipBilling,
} from "../api/hooks";
import { DetailSheet } from "../components/DetailSheet";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PhoneInput } from "../components/PhoneInput";
import { Money, PageHeader, SectionLabel, StatusBadge } from "../components/ui";
import { BigMetric, FilterChip, GlassCard, MetricTile, Stagger } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { errMsg } from "../lib/errors";
import { MEMBERSHIP_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, label } from "../lib/labels";
import { sortRecords } from "../lib/sortRecords";
import type { Membership } from "../api/types";

// Orden por defecto del padrón: morosos arriba, luego por vencer, luego el resto.
const paymentPriority = (m: Membership) =>
  m.payment_status === "overdue" ? 0 : m.payment_status === "due_soon" ? 1 : 2;

// Estados de relación "viva" donde desligar pasa por el handoff de baja (la baja
// queda pendiente hasta que el atleta la confirme). Para invitados/solicitudes la
// baja se maneja en la bandeja de Solicitudes (rechazar), no aquí.
const LEAVE_ELIGIBLE = new Set([
  "active",
  "trial",
  "paused",
  "expired",
  "approved_no_plan",
  "drop_in",
]);

// Segmentos del padrón. Mismos valores que antes (viven en la URL); lo que
// cambia es el material: pastillas de vidrio en vez de un SegmentedControl.
const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "morosos", label: "Morosos" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "en_riesgo", label: "En riesgo" },
  { value: "bajas", label: "Bajas" },
  { value: "pausadas", label: "Congeladas" },
];

function DueBadge({ days, date }: { days?: number | null; date?: string | null }) {
  if (days == null) return <Text c="dimmed">—</Text>;
  const color = days < 0 ? "red" : days <= 7 ? "yellow" : "teal";
  const text = days < 0 ? `Vencido hace ${Math.abs(days)} d` : days === 0 ? "Vence hoy" : `${days} días`;
  return (
    <Badge color={color} variant="light" title={date ? `Vence: ${date}` : undefined}>
      {text}
    </Badge>
  );
}

function EmergencyContact({ value }: { value?: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0)
    return <Text c="dimmed" span>Sin contacto de emergencia</Text>;
  const name = (value.name as string) || "";
  const phone = (value.phone as string) || "";
  const relation = (value.relation as string) || "";
  return (
    <Text span>
      {name || "—"} {relation ? `(${relation})` : ""} {phone ? `· ${phone}` : ""}
    </Text>
  );
}

export function AthletesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading, isError, refetch } = useMemberships(gymId);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const detail = useMembershipDetail(gymId, selectedMembershipId);
  const resetPassword = useResetAthletePassword(gymId);
  const sendReminder = useSendReminder(gymId);
  const editProfile = useEditAthleteProfile(gymId);
  const updateBilling = useUpdateMembershipBilling(gymId);
  const leaveDecision = useGymLeaveDecision(gymId);
  const atRisk = useAtRisk(gymId);
  const pause = usePauseMembership(gymId);
  const resume = useResumeMembership(gymId);
  const gymConfig = useGymConfig(gymId);
  const updateGymConfig = useUpdateGymConfig(gymId);
  // El filtro vive en la URL: así los pendientes ("bajas por confirmar",
  // "morosos") abren el padrón YA filtrado en vez de dejar al admin buscando.
  const [searchParams, setSearchParams] = useSearchParams();
  const filtro = searchParams.get("filtro") ?? "todos";
  const setFiltro = (v: string) =>
    setSearchParams(v && v !== "todos" ? { filtro: v } : {}, { replace: true });
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Membership>>({
    // Por defecto: morosos primero (orden de prioridad de pago). Al tocar una
    // columna, mantine-datatable cambia el accessor y manda el orden normal.
    columnAccessor: "payment_priority",
    direction: "asc",
  });

  const [edit, setEdit] = useState({ first_name: "", last_name: "", birth_date: "", ec_name: "", ec_phone: "", ec_relation: "" });
  useEffect(() => {
    const a = detail.data?.athlete_profile;
    if (!a) return;
    const ec = (a.emergency_contact ?? {}) as Record<string, string>;
    setEdit({
      first_name: a.first_name ?? "",
      last_name: a.last_name ?? "",
      birth_date: a.birth_date ?? "",
      ec_name: ec.name ?? "",
      ec_phone: ec.phone ?? "",
      ec_relation: ec.relation ?? "",
    });
  }, [detail.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cobro de la relación: el plan trae `auto_renew_default`, pero el gym necesita
  // corregirlo por atleta (el que sí quiere cobro automático, el que paga en caja).
  type MetodoCobro = "card" | "cash" | "bank_transfer";
  const [billing, setBilling] = useState<{ auto_renew: boolean; payment_method_pref: MetodoCobro }>({
    auto_renew: false,
    payment_method_pref: "cash",
  });
  useEffect(() => {
    const m = detail.data;
    if (!m) return;
    setBilling({
      auto_renew: !!m.auto_renew,
      payment_method_pref: (m.payment_method_pref as MetodoCobro) ?? "cash",
    });
  }, [detail.data?.id, detail.data?.auto_renew, detail.data?.payment_method_pref]); // eslint-disable-line react-hooks/exhaustive-deps

  // Congelamiento: el motivo es nota INTERNA del gym (no viaja al atleta) y la
  // fecha de retorno es opcional (muchas veces no se sabe cuándo vuelve).
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseForm, setPauseForm] = useState({ reason: "", return_date: "" });

  // Umbral de riesgo del gym: días sin asistir A ESTE gym para marcar "en riesgo".
  // Vive junto al filtro porque es el número que define quién sale en esa lista.
  const [riesgoOpen, setRiesgoOpen] = useState(false);
  const [riesgoDias, setRiesgoDias] = useState<number | string>(10);
  useEffect(() => {
    if (gymConfig.data?.risk_inactivity_days) setRiesgoDias(gymConfig.data.risk_inactivity_days);
  }, [gymConfig.data?.risk_inactivity_days]);
  // Gracia de morosidad: días de mora que el gym tolera antes del corte. Define
  // quién cae en el filtro "Morosos", así que se configura en el mismo lugar.
  const [graciaDias, setGraciaDias] = useState<number | string>(30);
  useEffect(() => {
    if (gymConfig.data?.overdue_grace_days) setGraciaDias(gymConfig.data.overdue_grace_days);
  }, [gymConfig.data?.overdue_grace_days]);

  const ok = (m: string) => notifications.show({ color: "teal", message: m });
  const fail = (m: string) => notifications.show({ color: "red", message: m });

  /**
   * Congela la relación (viaje, ausencia prolongada). El vencimiento NO se mueve
   * al pausar: el backend lo corre al reanudar por los días exactos que duró la
   * pausa, así el atleta no pierde lo que ya pagó. Solo aplica a membresías
   * ACTIVAS (es la única transición legal hacia "pausada").
   */
  const onPausar = async (nombre: string) => {
    try {
      await pause.mutateAsync({
        membershipId: selectedMembershipId,
        reason: pauseForm.reason.trim(),
        return_date: pauseForm.return_date || null,
      });
      setPauseOpen(false);
      ok(`Membresía de ${nombre} congelada. Al reanudar se le devuelven los días pausados.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo congelar la membresía."));
    }
  };

  const onReanudar = async (nombre: string) => {
    if (
      !window.confirm(
        `¿Reanudar la membresía de ${nombre}? El vencimiento se correrá los días que estuvo congelada.`,
      )
    )
      return;
    try {
      await resume.mutateAsync(selectedMembershipId);
      ok("Membresía reanudada. El vencimiento se corrió los días de la pausa.");
    } catch (error) {
      fail(errMsg(error, "No se pudo reanudar la membresía."));
    }
  };

  /**
   * Guarda el umbral de riesgo y VERIFICA contra la respuesta: si la API no lo
   * aplicó, no se canta éxito (mismo criterio que la preferencia de cobro).
   */
  const onGuardarRiesgo = async () => {
    const dias = Number(riesgoDias);
    if (!Number.isFinite(dias) || dias < 1 || dias > 365) {
      fail("El umbral debe estar entre 1 y 365 días.");
      return;
    }
    try {
      const saved = await updateGymConfig.mutateAsync({ risk_inactivity_days: dias });
      if (saved.risk_inactivity_days !== dias) {
        setRiesgoDias(saved.risk_inactivity_days ?? dias);
        fail("La API no guardó el umbral de riesgo. Avisa a soporte de Nucleo.");
        return;
      }
      setRiesgoOpen(false);
      ok(`Umbral de riesgo actualizado: ${dias} días sin asistir.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo guardar el umbral de riesgo."));
    }
  };

  /**
   * Guarda la gracia de morosidad (días de mora tolerados antes del corte) y
   * VERIFICA contra la respuesta, igual que el umbral de riesgo.
   */
  const onGuardarGracia = async () => {
    const dias = Number(graciaDias);
    if (!Number.isFinite(dias) || dias < 1 || dias > 365) {
      fail("La gracia debe estar entre 1 y 365 días.");
      return;
    }
    try {
      const saved = await updateGymConfig.mutateAsync({ overdue_grace_days: dias });
      if (saved.overdue_grace_days !== dias) {
        setGraciaDias(saved.overdue_grace_days ?? dias);
        fail("La API no guardó la gracia de morosidad. Avisa a soporte de Nucleo.");
        return;
      }
      setRiesgoOpen(false);
      ok(`Gracia de morosidad actualizada: ${dias} días.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo guardar la gracia de morosidad."));
    }
  };

  /**
   * Guarda la preferencia de cobro y VERIFICA contra la respuesta del servidor:
   * si la API ignoró el campo, se revierte el switch en vez de cantar un éxito
   * falso (el error clásico de "parece hecho pero no lo está").
   */
  const onBillingChange = async (patch: Partial<typeof billing>) => {
    const anterior = billing;
    setBilling({ ...billing, ...patch });
    try {
      const saved = await updateBilling.mutateAsync({ membershipId: selectedMembershipId, ...patch });
      const aplicado =
        (patch.auto_renew === undefined || !!saved.auto_renew === patch.auto_renew) &&
        (patch.payment_method_pref === undefined ||
          saved.payment_method_pref === patch.payment_method_pref);
      if (!aplicado) {
        setBilling(anterior);
        fail("La API no guardó la preferencia de cobro. Avisa a soporte de Nucleo.");
        return;
      }
      ok("Preferencia de cobro actualizada.");
    } catch (error) {
      setBilling(anterior);
      fail(errMsg(error, "No se pudo actualizar la preferencia de cobro."));
    }
  };

  const onResetPassword = async (membershipId: string, name: string) => {
    if (!window.confirm(`¿Enviar restablecimiento de contraseña a ${name}? Se le pedirá cambiarla al ingresar.`))
      return;
    try {
      await resetPassword.mutateAsync(membershipId);
      ok(`Se envió el restablecimiento a ${name}.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo enviar el restablecimiento."));
    }
  };

  const onReminder = async (
    membershipId: string,
    name: string,
    channel: "push" | "email" | "both",
  ) => {
    const medio = channel === "email" ? "por correo" : channel === "both" ? "por push y correo" : "por push";
    try {
      await sendReminder.mutateAsync({ membershipId, channel });
      ok(`Recordatorio enviado a ${name} ${medio}.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo enviar el recordatorio."));
    }
  };

  /**
   * Handoff de baja (aprobar / cancelar). Antes se disparaba con `mutate` pelado:
   * si el backend rechazaba la transición, la fila no cambiaba y el admin no veía
   * nada — el clásico "parece hecho pero no lo está".
   */
  const onLeave = (m: Membership, action: "approve" | "cancel") => {
    leaveDecision.mutate(
      { membershipId: m.id, action },
      {
        onSuccess: () =>
          ok(
            action === "approve"
              ? `Baja confirmada. ${m.athlete_name} ya no es miembro del gimnasio.`
              : `Baja cancelada. ${m.athlete_name} sigue siendo miembro.`,
          ),
        onError: (error) =>
          fail(
            errMsg(
              error,
              action === "approve" ? "No se pudo confirmar la baja." : "No se pudo cancelar la baja.",
            ),
          ),
      },
    );
  };

  const onDesligar = (m: Membership) => {
    if (
      !window.confirm(
        `¿Desligar a ${m.athlete_name}? Se enviará una solicitud de baja (handoff) que el atleta debe confirmar en su app antes de cerrar la relación.`,
      )
    )
      return;
    leaveDecision.mutate(
      { membershipId: m.id, action: "request" },
      {
        onSuccess: () => ok(`Baja solicitada a ${m.athlete_name}. Queda pendiente de su confirmación.`),
        onError: (error) => fail(errMsg(error, "No se pudo solicitar la baja.")),
      },
    );
  };

  const onSaveProfile = async () => {
    try {
      await editProfile.mutateAsync({
        membershipId: selectedMembershipId,
        first_name: edit.first_name,
        last_name: edit.last_name,
        birth_date: edit.birth_date || null,
        emergency_contact:
          edit.ec_name || edit.ec_phone || edit.ec_relation
            ? { name: edit.ec_name, phone: edit.ec_phone, relation: edit.ec_relation }
            : null,
      });
      ok("Perfil del atleta actualizado.");
    } catch (error) {
      fail(errMsg(error, "No se pudo actualizar el perfil."));
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  // Retención y morosidad vive aquí: filtra el padrón por estado de pago / riesgo.
  const atRiskIds = new Set((atRisk.data ?? []).map((m) => m.id));
  const q = search.trim().toLowerCase();
  const filtered = (data ?? []).filter((m) => {
    if (filtro === "morosos" && m.payment_status !== "overdue") return false;
    if (filtro === "por_vencer" && m.payment_status !== "due_soon") return false;
    if (filtro === "en_riesgo" && !atRiskIds.has(m.id)) return false;
    if (filtro === "pausadas" && m.status !== "paused") return false;
    // Baja pedida por el atleta: espera que el gym la confirme o la cancele.
    if (filtro === "bajas" && (m.status as string) !== "pending_leave") return false;
    if (q && !(m.athlete_name ?? "").toLowerCase().includes(q) && !(m.plan_name ?? "").toLowerCase().includes(q))
      return false;
    return true;
  });
  // Conteos del encabezado: se derivan de lo que YA está cargado (no hay
  // consultas nuevas) y describen el padrón completo, no el segmento filtrado.
  const padron = data ?? [];
  const activos = padron.filter((m) => m.status === "active").length;
  const morosos = padron.filter((m) => m.payment_status === "overdue").length;
  const porVencer = padron.filter((m) => m.payment_status === "due_soon").length;
  const congeladas = padron.filter((m) => m.status === "paused").length;

  const rows =
    sortStatus.columnAccessor === "payment_priority"
      ? [...filtered].sort(
          (a, b) =>
            paymentPriority(a) - paymentPriority(b) ||
            (a.athlete_name ?? "").localeCompare(b.athlete_name ?? ""),
        )
      : sortRecords(filtered, sortStatus);

  return (
    <div>
      <PageHeader
        kicker="Usuarios · Padrón"
        title="Atletas del gimnasio"
        subtitle="El padrón completo: estado de pago, vencimientos y quién se está enfriando. Solo se muestra la relación con ESTE gym."
        action={
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            onClick={() =>
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
              )
            }
          >
            Exportar CSV
          </Button>
        }
      />

      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
        <Stagger
          from={0.6}
          style={{ display: "flex", flexWrap: "wrap", gap: "calc(9 * var(--u))" }}
        >
          {FILTROS.map((f) => (
            <FilterChip
              key={f.value}
              active={filtro === f.value}
              onClick={() => setFiltro(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </Stagger>
        <Group gap="sm" wrap="wrap">
          {/* Riesgo y mora definen QUIÉN cae en esos filtros: se configuran aquí
              mismo, no en una pantalla aparte donde nadie lo relacionaría. */}
          <Popover opened={riesgoOpen} onChange={setRiesgoOpen} position="bottom-start" withArrow withinPortal>
            <Popover.Target>
              <Button
                variant="default"
                size="sm"
                leftSection={<Settings2 size={15} />}
                onClick={() => setRiesgoOpen((v) => !v)}
              >
                Riesgo {gymConfig.data?.risk_inactivity_days ?? 10} d · mora{" "}
                {gymConfig.data?.overdue_grace_days ?? 30} d
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Text size="sm" fw={600} mb={4}>
                Umbral de riesgo del gimnasio
              </Text>
              <Text size="xs" c="dimmed" mb="sm" maw={280}>
                Días sin asistir <strong>a este gimnasio</strong> para marcar a un atleta activo
                como “en riesgo”. Un box diario detecta la fuga antes que un estudio de dos
                sesiones por semana.
              </Text>
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <NumberInput
                  label="Días"
                  min={1}
                  max={365}
                  clampBehavior="strict"
                  value={riesgoDias}
                  onChange={setRiesgoDias}
                  disabled={gymConfig.isLoading || updateGymConfig.isPending}
                  w={110}
                />
                <Button loading={updateGymConfig.isPending} onClick={onGuardarRiesgo}>
                  Guardar
                </Button>
              </Group>

              {/* La otra política que define una de estas listas: cuántos días de
                  mora se toleran antes de que la membresía quede morosa. */}
              <Text size="sm" fw={600} mt="lg" mb={4}>
                Gracia de morosidad
              </Text>
              <Text size="xs" c="dimmed" mb="sm" maw={280}>
                Días de atraso que tolera el gimnasio antes de cortar el acceso y marcar la
                membresía como morosa.
              </Text>
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <NumberInput
                  label="Días"
                  min={1}
                  max={365}
                  clampBehavior="strict"
                  value={graciaDias}
                  onChange={setGraciaDias}
                  disabled={gymConfig.isLoading || updateGymConfig.isPending}
                  w={110}
                />
                <Button
                  variant="default"
                  loading={updateGymConfig.isPending}
                  onClick={onGuardarGracia}
                >
                  Guardar
                </Button>
              </Group>
              {gymConfig.isError && (
                <Text size="xs" c="red" mt="xs" maw={280}>
                  No se pudo leer la configuración del gimnasio; se muestran los valores por
                  defecto.
                </Text>
              )}
            </Popover.Dropdown>
          </Popover>
          <TextInput
            placeholder="Buscar atleta o plan…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={{ base: "100%", sm: 240 }}
          />
        </Group>
      </Group>

      {/* Cifra protagonista del padrón + estado de la cartera. Los conteos son
          del gimnasio completo, no del segmento que esté filtrado. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(calc(290 * var(--u)), 1fr))",
          gap: "calc(16 * var(--u))",
          marginBottom: "calc(20 * var(--u))",
        }}
      >
        {/* La tarjeta se estira a la altura de la retícula de tiles: el bloque
            va centrado para que el aire quede repartido, no colgando abajo. */}
        <GlassCard
          variant="core"
          sheen
          padding={24}
          delay={0.7}
          style={{ display: "flex", alignItems: "center" }}
        >
          <BigMetric
            label="Atletas activos"
            value={activos}
            hint={`${padron.length} ${padron.length === 1 ? "relación" : "relaciones"} en el padrón de este gimnasio.`}
            delay={1.02}
          />
        </GlassCard>

        <Stagger
          from={0.92}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(calc(150 * var(--u)), 1fr))",
            gap: "calc(14 * var(--u))",
            alignContent: "start",
          }}
        >
          <MetricTile
            label="Morosos"
            value={morosos}
            icon={<AlertTriangle size={16} strokeWidth={1.8} />}
            tone="var(--nucleo-danger)"
          />
          <MetricTile
            label="Por vencer"
            value={porVencer}
            icon={<CalendarClock size={16} strokeWidth={1.8} />}
            tone="var(--nucleo-warning)"
          />
          <MetricTile
            label="En riesgo"
            /* Si la lista de riesgo no cargó se muestra un guion: un 0 aquí
               diría "nadie en riesgo", que es justo lo contrario del dato. */
            value={atRisk.isError ? "—" : atRiskIds.size}
            icon={<TrendingDown size={16} strokeWidth={1.8} />}
            tone="var(--nucleo-accent)"
          />
          <MetricTile
            label="Congeladas"
            value={congeladas}
            icon={<Snowflake size={16} strokeWidth={1.8} />}
          />
        </Stagger>
      </div>

      {/* Sin la lista de riesgo el filtro "En riesgo" sale vacío y parece que no hay
          nadie en riesgo: hay que decir que es un fallo de carga, no un dato. */}
      {filtro === "en_riesgo" && atRisk.isError && (
        <GlassCard padding={16} style={{ marginBottom: "calc(16 * var(--u))" }}>
          <PageError
            message="No se pudo cargar la lista de atletas en riesgo."
            onRetry={() => atRisk.refetch()}
          />
        </GlassCard>
      )}

      <SectionLabel mb="xs" as="h2">
        Padrón · {rows.length} {rows.length === 1 ? "atleta" : "atletas"}
      </SectionLabel>
      <GlassCard padding={8} delay={1.05} style={{ overflow: "hidden" }}>
        <DataTable<Membership>
          minHeight={180}
          highlightOnHover
          striped
          records={rows}
          fetching={isLoading}
          idAccessor="id"
          noRecordsText={
            filtro === "todos" ? "Aprueba solicitudes o invita atletas al gym." : "Ningún atleta en este segmento. 💪"
          }
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            {
              accessor: "athlete_name",
              title: "Atleta",
              sortable: true,
              render: (m) => (
                <Group gap="sm" wrap="nowrap">
                  <Avatar src={m.athlete_photo} color="flame" radius="xl" size={36}>
                    {m.athlete_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Text size="sm">{m.athlete_name}</Text>
                </Group>
              ),
            },
            {
              accessor: "status",
              title: "Estado",
              sortable: true,
              render: (m) => <StatusBadge kind="membership" status={m.status} />,
            },
            { accessor: "plan_name", title: "Plan", sortable: true, render: (m) => m.plan_name ?? "—" },
            {
              accessor: "start_date",
              title: "Miembro desde",
              sortable: true,
              render: (m) => (m.start_date ? new Date(m.start_date).toLocaleDateString("es-GT") : "—"),
            },
            {
              accessor: "days_to_due",
              title: "Vencimiento",
              sortable: true,
              render: (m) => <DueBadge days={m.days_to_due} date={m.renewal_date} />,
            },
            { accessor: "community_points", title: "Puntos", sortable: true, render: (m) => m.community_points },
            {
              accessor: "actions",
              title: "Acciones",
              render: (m) => {
                const pendingLeave = (m.status as string) === "pending_leave";
                const fromAthlete = m.leave_initiated_by === "athlete";
                return (
                  <>
                    {/* Desktop: acciones en línea con submenú de recordatorio */}
                    <Group gap="xs" wrap="nowrap" visibleFrom="sm">
                      <Button variant="default" size="xs" onClick={() => setSelectedMembershipId(m.id)}>
                        Ver detalle
                      </Button>
                      <Menu shadow="md" position="bottom-start" withinPortal>
                        <Menu.Target>
                          <Button variant="light" size="xs" leftSection={<Bell size={14} />} loading={sendReminder.isPending}>
                            Recordatorio
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>Enviar por</Menu.Label>
                          <Menu.Item leftSection={<Smartphone size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "push")}>
                            Notificación push
                          </Menu.Item>
                          <Menu.Item leftSection={<Mail size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "email")}>
                            Correo
                          </Menu.Item>
                          <Menu.Item leftSection={<Bell size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "both")}>
                            Ambos
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                      {LEAVE_ELIGIBLE.has(m.status as string) && !pendingLeave && (
                        <Button
                          size="xs"
                          variant="default"
                          color="red"
                          loading={leaveDecision.isPending}
                          onClick={() => onDesligar(m)}
                        >
                          Desligar
                        </Button>
                      )}
                      {pendingLeave &&
                        (fromAthlete ? (
                          <>
                            <Button size="xs" color="red" loading={leaveDecision.isPending} onClick={() => onLeave(m, "approve")}>
                              Confirmar baja
                            </Button>
                            <Button size="xs" variant="default" onClick={() => onLeave(m, "cancel")}>
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button size="xs" variant="default" onClick={() => onLeave(m, "cancel")}>
                            Cancelar baja propuesta
                          </Button>
                        ))}
                    </Group>

                    {/* Móvil: un solo kebab con las mismas acciones */}
                    <Menu shadow="md" position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label="Acciones" hiddenFrom="sm">
                          <MoreVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Eye size={14} />} onClick={() => setSelectedMembershipId(m.id)}>
                          Ver detalle
                        </Menu.Item>
                        <Menu.Label>Recordatorio</Menu.Label>
                        <Menu.Item leftSection={<Smartphone size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "push")}>
                          Push
                        </Menu.Item>
                        <Menu.Item leftSection={<Mail size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "email")}>
                          Correo
                        </Menu.Item>
                        <Menu.Item leftSection={<Bell size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "both")}>
                          Ambos
                        </Menu.Item>
                        {LEAVE_ELIGIBLE.has(m.status as string) && !pendingLeave && (
                          <>
                            <Menu.Divider />
                            <Menu.Item color="red" leftSection={<LogOut size={14} />} onClick={() => onDesligar(m)}>
                              Desligar atleta
                            </Menu.Item>
                          </>
                        )}
                        {pendingLeave && <Menu.Divider />}
                        {pendingLeave &&
                          (fromAthlete ? (
                            <>
                              <Menu.Item color="red" onClick={() => onLeave(m, "approve")}>
                                Confirmar baja
                              </Menu.Item>
                              <Menu.Item onClick={() => onLeave(m, "cancel")}>
                                Cancelar baja
                              </Menu.Item>
                            </>
                          ) : (
                            <Menu.Item onClick={() => onLeave(m, "cancel")}>
                              Cancelar baja propuesta
                            </Menu.Item>
                          ))}
                      </Menu.Dropdown>
                    </Menu>
                  </>
                );
              },
            },
          ]}
        />
      </GlassCard>

      <DetailSheet
        opened={!!selectedMembershipId}
        onClose={() => setSelectedMembershipId("")}
        title="Ficha del atleta"
        size={580}
      >
        {detail.isError ? (
          // Antes un fallo de la ficha dejaba el loader girando para siempre.
          <PageError
            message={errMsg(detail.error, "No se pudo cargar la ficha del atleta.")}
            onRetry={() => detail.refetch()}
          />
        ) : !detail.data ? (
          <PageLoading label="Cargando ficha…" />
        ) : (
        <>
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group>
              <Avatar src={detail.data.athlete_profile.photo} color="flame" radius="xl" size={56}>
                {detail.data.athlete_name?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <Title order={3}>
                  {detail.data.athlete_profile.full_name ?? detail.data.athlete_name}
                </Title>
                <Group gap="xs">
                  <Text c="dimmed" size="sm">
                    {detail.data.plan_name ?? "Sin plan"} · {label(MEMBERSHIP_STATUS, detail.data.status)}
                  </Text>
                  {detail.data.renewal_date && (
                    <>
                      <Text c="dimmed" size="sm">
                        · vence {detail.data.renewal_date}
                      </Text>
                      <DueBadge days={detail.data.days_to_due} date={detail.data.renewal_date} />
                    </>
                  )}
                </Group>
              </div>
            </Group>
            <Group gap="xs">
              <Menu shadow="md" position="bottom-start" withinPortal>
                <Menu.Target>
                  <Button variant="light" leftSection={<Bell size={16} />} loading={sendReminder.isPending}>
                    Recordatorio
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Enviar por</Menu.Label>
                  <Menu.Item leftSection={<Smartphone size={14} />} onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name, "push")}>
                    Notificación push
                  </Menu.Item>
                  <Menu.Item leftSection={<Mail size={14} />} onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name, "email")}>
                    Correo
                  </Menu.Item>
                  <Menu.Item leftSection={<Bell size={14} />} onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name, "both")}>
                    Ambos
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Button
                variant="default"
                leftSection={<KeyRound size={16} />}
                loading={resetPassword.isPending}
                onClick={() => onResetPassword(selectedMembershipId, detail.data!.athlete_name)}
              >
                Restablecer contraseña
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="md">
            <Text size="sm">
              <strong>Cumpleaños:</strong>{" "}
              {detail.data.athlete_profile.birth_date || <Text c="dimmed" span>Sin registrar</Text>}
            </Text>
            <Text size="sm">
              <strong>Contacto de emergencia:</strong>{" "}
              <EmergencyContact value={detail.data.athlete_profile.emergency_contact} />
            </Text>
            <Text size="sm">
              <strong>Nivel / objetivos:</strong>{" "}
              {detail.data.athlete_profile.sport_level || "Nivel sin registrar"} ·{" "}
              {detail.data.athlete_profile.goals || "Objetivos sin registrar"}
            </Text>
            <Text size="sm">
              <strong>Notas internas:</strong> {detail.data.internal_notes || "Sin notas"}
            </Text>
          </SimpleGrid>

          <SectionLabel mt="lg" as="h2">Cobro y renovación</SectionLabel>
          {/* El vidrio lo pone el tema (`Card` → `.a-glass-card`): sin `withBorder`,
              que duplicaría el hairline del material. */}
          <Card padding="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Switch
                label="Renovación automática"
                description={
                  billing.auto_renew
                    ? "Genera el cobro del siguiente ciclo 3 días antes de vencer."
                    : "Al vencer no se genera cobro: hay que registrarlo a mano."
                }
                checked={billing.auto_renew}
                disabled={updateBilling.isPending}
                onChange={(e) => onBillingChange({ auto_renew: e.currentTarget.checked })}
              />
              <Select
                label="Método de cobro preferido"
                description="Con tarjeta el cobro va por Pagalo: el atleta paga la cuota + el recargo."
                value={billing.payment_method_pref}
                disabled={updateBilling.isPending}
                onChange={(v) =>
                  v && onBillingChange({ payment_method_pref: v as typeof billing.payment_method_pref })
                }
                data={[
                  { value: "card", label: "Tarjeta" },
                  { value: "cash", label: "Efectivo" },
                  { value: "bank_transfer", label: "Transferencia" },
                ]}
                comboboxProps={{ withinPortal: true }}
              />
            </SimpleGrid>
          </Card>

          <SectionLabel mt="lg" as="h2">Congelamiento</SectionLabel>
          <Card padding="sm">
            {detail.data.status === "paused" ? (
              <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                <div style={{ flex: 1, minWidth: 220 }}>
                  <Text size="sm" fw={600}>
                    Congelada
                    {detail.data.paused_at ? ` desde el ${detail.data.paused_at}` : ""}.
                  </Text>
                  <Text size="sm" c="dimmed">
                    {detail.data.pause_until
                      ? `Retorno previsto: ${detail.data.pause_until}.`
                      : "Sin fecha de retorno prevista."}{" "}
                    {detail.data.pause_reason
                      ? `Motivo: ${detail.data.pause_reason}`
                      : "Sin motivo registrado."}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Congelada no reserva clases ni genera cobros. Al reanudar, el vencimiento se
                    corre los días que duró la pausa.
                  </Text>
                </div>
                <Button
                  leftSection={<Play size={16} />}
                  loading={resume.isPending}
                  onClick={() => onReanudar(detail.data!.athlete_name)}
                >
                  Reanudar membresía
                </Button>
              </Group>
            ) : detail.data.status === "active" ? (
              <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 220 }}>
                  Congela la relación por viaje o ausencia prolongada: deja de reservar clases y de
                  generar cobros, y al reanudar recupera exactamente los días de plan que le
                  quedaban.
                </Text>
                <Button
                  variant="default"
                  leftSection={<Pause size={16} />}
                  onClick={() => {
                    setPauseForm({ reason: "", return_date: "" });
                    setPauseOpen(true);
                  }}
                >
                  Congelar membresía
                </Button>
              </Group>
            ) : (
              <Text size="sm" c="dimmed">
                Solo se puede congelar una membresía activa. Esta está{" "}
                {label(MEMBERSHIP_STATUS, detail.data.status).toLowerCase()}.
              </Text>
            )}
          </Card>

          <Accordion variant="separated" mt="md">
            <Accordion.Item value="edit">
              <Accordion.Control>Editar datos del atleta</Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  <TextInput label="Nombre" value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.currentTarget.value })} />
                  <TextInput label="Apellido" value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.currentTarget.value })} />
                  <DateInput
                    label="Cumpleaños"
                    valueFormat="YYYY-MM-DD"
                    value={edit.birth_date ? new Date(edit.birth_date) : null}
                    onChange={(d) => setEdit({ ...edit, birth_date: d ? d.toLocaleDateString("en-CA") : "" })}
                  />
                  <TextInput label="Contacto (nombre)" value={edit.ec_name} onChange={(e) => setEdit({ ...edit, ec_name: e.currentTarget.value })} />
                  <PhoneInput label="Contacto (teléfono)" value={edit.ec_phone} onChange={(ec_phone) => setEdit({ ...edit, ec_phone })} />
                  <TextInput label="Parentesco" value={edit.ec_relation} onChange={(e) => setEdit({ ...edit, ec_relation: e.currentTarget.value })} />
                </SimpleGrid>
                <Button mt="sm" loading={editProfile.isPending} onClick={onSaveProfile}>
                  Guardar cambios
                </Button>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <SectionLabel mt="lg" mb="xs" as="h2">
            Pagos en este gimnasio
          </SectionLabel>
          {detail.data.payments.length === 0 ? (
            <Text c="dimmed" size="sm">Sin pagos registrados.</Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Método</Table.Th>
                  <Table.Th ta="right">Monto</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.data.payments.map((payment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>{new Date(payment.created_at).toLocaleDateString("es-GT")}</Table.Td>
                    <Table.Td>{label(PAYMENT_METHOD, payment.method)}</Table.Td>
                    <Table.Td ta="right">
                      <Money value={payment.amount} decimals={2} />
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge kind="paymentTx" status={payment.status} size="sm" />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          <SectionLabel mt="lg" mb="xs" as="h2">
            Asistencia en este gimnasio
          </SectionLabel>
          {detail.data.checkins.length === 0 ? (
            <Text c="dimmed" size="sm">Sin check-ins registrados.</Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Clase</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Método</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.data.checkins.map((checkin) => (
                  <Table.Tr key={checkin.id}>
                    <Table.Td>{checkin.class_type}</Table.Td>
                    <Table.Td>{new Date(checkin.starts_at).toLocaleString("es-GT")}</Table.Td>
                    <Table.Td>{checkin.method}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </>
        )}
      </DetailSheet>

      {/* Congelar: motivo + retorno previsto y confirmación explícita. Vive fuera
          del sheet para que el modal quede por encima del drawer. */}
      <Modal
        opened={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title={`Congelar la membresía de ${detail.data?.athlete_name ?? "este atleta"}`}
        centered
        /* Por encima del drawer de la ficha (z-index 200 por defecto). */
        zIndex={400}
      >
        <Text size="sm" c="dimmed" mb="md">
          Mientras esté congelada no podrá reservar clases ni se le generarán cobros. Al reanudar,
          el vencimiento se corre exactamente los días que duró la pausa: no pierde lo que ya pagó.
        </Text>
        <Textarea
          label="Motivo (nota interna)"
          description="Solo lo ve tu equipo: no se le muestra al atleta."
          placeholder="Viaje de dos semanas, acuerdo con el atleta…"
          maxLength={200}
          autosize
          minRows={2}
          value={pauseForm.reason}
          onChange={(e) => setPauseForm({ ...pauseForm, reason: e.currentTarget.value })}
          mb="sm"
        />
        <DateInput
          label="Retorno previsto (opcional)"
          description="Debe ser posterior a hoy. Déjalo vacío si aún no se sabe."
          valueFormat="YYYY-MM-DD"
          clearable
          minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
          value={pauseForm.return_date ? new Date(`${pauseForm.return_date}T00:00:00`) : null}
          onChange={(d) =>
            setPauseForm({ ...pauseForm, return_date: d ? d.toLocaleDateString("en-CA") : "" })
          }
          popoverProps={{ withinPortal: true }}
          mb="lg"
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setPauseOpen(false)}>
            Cancelar
          </Button>
          <Button
            color="flame"
            leftSection={<Pause size={16} />}
            loading={pause.isPending}
            onClick={() => onPausar(detail.data?.athlete_name ?? "el atleta")}
          >
            Congelar membresía
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
