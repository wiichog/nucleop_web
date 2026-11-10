import { useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Input,
  Modal,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  useCreatePlan,
  useCreatePlanOffer,
  useDeletePlan,
  useDeletePlanOffer,
  usePlanOffers,
  usePlans,
  useServiceTypes,
  useTogglePlanOffer,
  useUpdatePlan,
  useUpdateServiceType,
} from "../api/hooks";
import type { Plan, PlanOffer, ServiceType } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { Encabezado, PuntoColor, Tarjeta } from "../components/Tarjeta";
import { GlassCard } from "../components/aurora";
import { Money, PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";

/**
 * Planes y cuotas, con el mismo criterio que Clases: los planes van al frente como
 * tarjetas con su precio; crear y editar es la misma ventana; tocar un servicio u
 * oferta abre lo que se hace con él, y lo pendiente sale en amarillo con su contador.
 * La explicación de cada campo vive en el manual de la pantalla.
 */

const ok = (message: string) => notifications.show({ color: "teal", message });
const fail = (error: unknown, porDefecto: string) =>
  notifications.show({ color: "red", message: errMsg(error, porDefecto) });

type TipoPlan = "" | "family" | "corporate";
const TIPO_PLAN_OPCIONES = [
  { value: "", label: "Individual" },
  { value: "family", label: "Familiar" },
  { value: "corporate", label: "Empresarial" },
];
const TIPO_PLAN_LABEL: Record<string, string> = { family: "Familiar", corporate: "Empresarial" };
const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);
const hoyIso = () => new Date().toLocaleDateString("en-CA");

/** Puntos de comunidad que hoy resta el plan por no-show (0 = sin penalización). */
export function puntosNoShow(penalizacion: unknown): number {
  const pts = (penalizacion as { community_points?: unknown } | null)?.community_points;
  return typeof pts === "number" && Number.isFinite(pts) ? pts : 0;
}

/**
 * Arma `noshow_penalty` a partir de los puntos del formulario. Al editar, conserva
 * lo demás que ya traía la regla (p. ej. `global_points` o el mensaje): el panel
 * solo maneja los puntos de comunidad y no debe borrar lo que no muestra.
 * 0 o vacío = sin penalización de comunidad.
 */
export function armarPenalizacion(puntos: number | string, previa?: unknown): Record<string, unknown> | null {
  const points = Number(puntos);
  const base: Record<string, unknown> =
    previa && typeof previa === "object" && !Array.isArray(previa)
      ? { ...(previa as Record<string, unknown>) }
      : { notify: true, message: "Penalización por no asistir a clase reservada." };
  if (Number.isFinite(points) && points !== 0) return { ...base, community_points: points };
  delete base.community_points;
  // Sin puntos de comunidad ni globales la regla no hace nada: se manda vacía.
  return base.global_points ? base : null;
}

/** «2026-11-30» → «30 nov 2026», sin pasar por UTC (la fecha es de calendario). */
export function fechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return fecha;
  return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}

/** La vigencia de una oferta en palabras: «Sin fecha», «Desde …», «Hasta …» o «… → …». */
export function vigenciaOferta(o: Pick<PlanOffer, "valid_from" | "valid_to">): string {
  if (o.valid_from && o.valid_to) return `${fechaCorta(o.valid_from)} → ${fechaCorta(o.valid_to)}`;
  if (o.valid_from) return `Desde ${fechaCorta(o.valid_from)}`;
  if (o.valid_to) return `Hasta ${fechaCorta(o.valid_to)}`;
  return "Sin fecha";
}

/** Lo que vale la oferta: «30%» o «2 meses gratis». */
export function valorOferta(o: Pick<PlanOffer, "offer_type" | "value">): string {
  if (o.offer_type === "percent") return `${o.value}%`;
  return Number(o.value) === 1 ? "1 mes gratis" : `${o.value} meses gratis`;
}

export function PlansPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const plansQuery = usePlans(gymId);
  const serviceTypes = useServiceTypes(gymId);
  const offers = usePlanOffers(gymId);
  const createPlan = useCreatePlan(gymId);
  const updatePlan = useUpdatePlan(gymId);
  const deletePlan = useDeletePlan(gymId);
  const updateService = useUpdateServiceType(gymId);
  const createOffer = useCreatePlanOffer(gymId);
  const deleteOffer = useDeletePlanOffer(gymId);
  const serviciosRef = useRef<HTMLDivElement>(null);

  // null = cerrado · "nuevo" = alta · una cosa = su ventana.
  const [planAbierto, setPlanAbierto] = useState<Plan | "nuevo" | null>(null);
  const [servicioAbiertoId, setServicioAbiertoId] = useState<string | null>(null);
  const [ofertaAbierta, setOfertaAbierta] = useState<PlanOffer | "nuevo" | null>(null);

  const planes = (plansQuery.data ?? []) as Plan[];
  const servicios = (serviceTypes.data ?? []) as ServiceType[];
  const ofertas = (offers.data ?? []) as PlanOffer[];

  const serviceOptions = useMemo(() => servicios.map((s) => ({ value: s.id, label: s.name })), [servicios]);
  const planOptions = useMemo(() => planes.map((p) => ({ value: p.id, label: p.name })), [planes]);

  // Activos primero y, dentro, de más barato a más caro: se lee como una lista de precios.
  const planesOrdenados = [...planes].sort(
    (a, b) =>
      Number(b.is_active ?? true) - Number(a.is_active ?? true) ||
      Number(a.price) - Number(b.price) ||
      a.name.localeCompare(b.name, "es"),
  );
  // Pendientes primero: son los que hay que resolver para poder agendarlos.
  const serviciosOrdenados = [...servicios].sort(
    (a, b) =>
      Number(a.status === "active") - Number(b.status === "active") ||
      Number(b.is_active ?? true) - Number(a.is_active ?? true) ||
      a.name.localeCompare(b.name, "es"),
  );
  const pendientes = servicios.filter((s) => (s.is_active ?? true) && s.status !== "active").length;
  const ofertasOrdenadas = [...ofertas].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "es"),
  );
  // Se busca por id para que la ventana muestre el servicio recién guardado.
  const servicioAbierto = servicios.find((s) => s.id === servicioAbiertoId) ?? null;
  // La oferta abierta también se toma de la lista: su interruptor refleja el cambio.
  const ofertaVigente =
    ofertaAbierta && ofertaAbierta !== "nuevo"
      ? (ofertas.find((o) => o.id === ofertaAbierta.id) ?? ofertaAbierta)
      : ofertaAbierta;

  const guardarPlan = async (body: PlanBody) => {
    const nuevo = planAbierto === "nuevo";
    try {
      if (nuevo) {
        await createPlan.mutateAsync(body);
        ok(`Plan "${body.name}" creado.`);
      } else if (planAbierto) {
        await updatePlan.mutateAsync({ id: planAbierto.id, body });
        ok(
          body.is_active === undefined
            ? "Plan actualizado."
            : body.is_active
              ? `Plan "${body.name}" activado.`
              : `Plan "${body.name}" desactivado.`,
        );
      }
      setPlanAbierto(null);
    } catch (error) {
      fail(error, nuevo ? "No se pudo crear el plan." : "No se pudo actualizar el plan.");
    }
  };

  const eliminarPlan = async (p: Plan) => {
    if (!window.confirm(`¿Eliminar el plan "${p.name}"? Las membresías con este plan quedarán sin plan.`)) return;
    try {
      await deletePlan.mutateAsync(p.id);
      ok("Plan eliminado.");
      setPlanAbierto(null);
    } catch (error) {
      fail(error, "No se pudo eliminar el plan.");
    }
  };

  const guardarServicio = async (s: ServiceType, body: Partial<ServiceType>) => {
    try {
      await updateService.mutateAsync({ id: s.id, body });
      ok(s.status !== "active" ? "Servicio activado." : "Servicio actualizado.");
      setServicioAbiertoId(null);
    } catch (e: unknown) {
      const detail =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
          : undefined;
      notifications.show({
        color: "red",
        message:
          typeof detail === "string"
            ? detail
            : "Revisa el precio (si es pago extra) o asígnalo a un plan (si es incluido).",
      });
    }
  };

  const crearOferta = async (body: OfertaBody) => {
    try {
      await createOffer.mutateAsync(body);
      ok(`Oferta "${body.name}" creada.`);
      setOfertaAbierta(null);
    } catch (error) {
      fail(error, "No se pudo crear la oferta.");
    }
  };

  const eliminarOferta = async (o: PlanOffer) => {
    if (!window.confirm(`¿Eliminar la oferta "${o.name}"?`)) return;
    try {
      await deleteOffer.mutateAsync(o.id);
      ok("Oferta eliminada.");
      setOfertaAbierta(null);
    } catch (error) {
      fail(error, "No se pudo eliminar la oferta.");
    }
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader kicker="Usuarios · Cobro" title="Planes y cuotas" />

      <GlassCard delay={0.6} padding={18} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <Encabezado
          titulo="Planes"
          avisos={
            pendientes > 0 && (
              <Badge
                component="button"
                type="button"
                color="yellow"
                variant="light"
                style={{ cursor: "pointer" }}
                onClick={() => serviciosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {pendientes === 1 ? "1 servicio pendiente" : `${pendientes} servicios pendientes`}
              </Badge>
            )
          }
        >
          <Button onClick={() => setPlanAbierto("nuevo")}>Nuevo plan</Button>
        </Encabezado>

        {/* Sin esto, un fallo de carga se veía igual que "todavía no tienes planes"
            y el gym creaba duplicados encima de los que ya existían. */}
        {plansQuery.isError ? (
          <PageError message="No se pudieron cargar los planes del gimnasio." onRetry={() => plansQuery.refetch()} />
        ) : plansQuery.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : planesOrdenados.length === 0 ? (
          <Text c="dimmed" size="sm">
            Crea tu primer plan: mensual, trimestral, por clases…
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
            {planesOrdenados.map((p) => (
              <TarjetaPlan key={p.id} plan={p} onClick={() => setPlanAbierto(p)} />
            ))}
          </SimpleGrid>
        )}
      </GlassCard>

      <GlassCard ref={serviciosRef} delay={0.7} padding={18} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <Encabezado
          titulo="Servicios y su cobro"
          avisos={
            pendientes > 0 && (
              <Badge color="yellow" variant="light">
                {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
              </Badge>
            )
          }
        />
        {serviceTypes.isError ? (
          <PageError
            message="No se pudieron cargar los servicios del catálogo."
            onRetry={() => serviceTypes.refetch()}
          />
        ) : serviceTypes.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : serviciosOrdenados.length === 0 ? (
          <Text c="dimmed" size="sm">
            Aún no hay servicios. Créalos en Clases → Servicios.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
            {serviciosOrdenados.map((s) => (
              <TarjetaServicio
                key={s.id}
                servicio={s}
                planes={planes}
                onClick={() => setServicioAbiertoId(s.id)}
              />
            ))}
          </SimpleGrid>
        )}
      </GlassCard>

      <GlassCard delay={0.8} padding={18}>
        <Encabezado titulo="Ofertas">
          <Button onClick={() => setOfertaAbierta("nuevo")}>Nueva oferta</Button>
        </Encabezado>
        {offers.isError ? (
          <PageError message="No se pudieron cargar las ofertas." onRetry={() => offers.refetch()} />
        ) : offers.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : ofertasOrdenadas.length === 0 ? (
          <Text c="dimmed" size="sm">
            Crea promociones para tus planes: un descuento o meses gratis.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
            {ofertasOrdenadas.map((o) => (
              <TarjetaOferta key={o.id} oferta={o} onClick={() => setOfertaAbierta(o)} />
            ))}
          </SimpleGrid>
        )}
      </GlassCard>

      <PlanModal
        plan={planAbierto}
        serviceOptions={serviceOptions}
        saving={createPlan.isPending || updatePlan.isPending}
        removing={deletePlan.isPending}
        onClose={() => setPlanAbierto(null)}
        onSave={guardarPlan}
        onDelete={eliminarPlan}
      />
      <ServicioCobroModal
        servicio={servicioAbierto}
        planOptions={planOptions}
        saving={updateService.isPending}
        onClose={() => setServicioAbiertoId(null)}
        onSave={guardarServicio}
      />
      <OfertaModal
        gymId={gymId}
        oferta={ofertaVigente}
        planOptions={planOptions}
        saving={createOffer.isPending}
        removing={deleteOffer.isPending}
        onClose={() => setOfertaAbierta(null)}
        onCreate={crearOferta}
        onDelete={eliminarOferta}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

function TarjetaPlan({ plan: p, onClick }: { plan: Plan; onClick: () => void }) {
  const activo = p.is_active ?? true;
  const servicios = p.service_type_names ?? [];
  const extras = [
    p.open_gym_access && "Open gym",
    p.special_classes_access && "Clases especiales",
    p.auto_renew_default === false && "Renovación manual",
  ].filter(Boolean);
  return (
    <Tarjeta etiqueta={`Editar ${p.name}`} onClick={onClick} apagada={!activo}>
      <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          {p.name}
        </Text>
        {!activo && (
          <Badge size="xs" color="gray" variant="light" style={{ flex: "0 0 auto" }}>
            Inactivo
          </Badge>
        )}
      </Group>
      {p.group_kind && (
        <Badge size="xs" color="grape" variant="light" mt={4}>
          {TIPO_PLAN_LABEL[p.group_kind] ?? p.group_kind} · {p.max_members} personas
        </Badge>
      )}
      <Text fz={22} fw={700} mt={6} className="a-tabular">
        <Money value={p.price} />
        {p.group_kind && (
          <Text span size="xs" c="dimmed" fw={400}>
            {" "}
            el paquete
          </Text>
        )}
      </Text>
      <Text size="xs" c="dimmed" mt={2}>
        {p.duration_days ?? 30} días · {p.class_limit ? `${p.class_limit} clases` : "clases sin límite"}
      </Text>
      {servicios.length > 0 && (
        <Text size="xs" mt={6} lineClamp={2}>
          {servicios.join(" · ")}
        </Text>
      )}
      {extras.length > 0 && (
        <Text size="xs" c="dimmed" mt={4}>
          {extras.join(" · ")}
        </Text>
      )}
    </Tarjeta>
  );
}

function TarjetaServicio({
  servicio: s,
  planes,
  onClick,
}: {
  servicio: ServiceType;
  planes: Plan[];
  onClick: () => void;
}) {
  const activo = s.is_active ?? true;
  const pendiente = activo && s.status !== "active";
  const enPlanes = planes.filter((p) => (s.plans ?? []).includes(p.id)).map((p) => p.name);
  return (
    <Tarjeta
      etiqueta={pendiente ? `Activar ${s.name}` : `Editar el cobro de ${s.name}`}
      onClick={onClick}
      aviso={pendiente}
      apagada={!activo}
      color={pendiente ? null : s.color}
    >
      <Group gap={8} wrap="nowrap" justify="space-between">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <PuntoColor color={s.color} />
          <Text fw={700} truncate>
            {s.name}
          </Text>
        </Group>
        {!activo ? (
          <Badge size="xs" color="gray" variant="light">Inactivo</Badge>
        ) : pendiente ? (
          <Badge size="xs" color="yellow" variant="light">Pendiente</Badge>
        ) : (
          <Badge size="xs" color="teal" variant="light">Activo</Badge>
        )}
      </Group>
      {s.access_type === "extra" ? (
        <Text size="sm" mt={6}>
          <Money value={s.price} /> ·{" "}
          {s.charge_type === "one_time" ? "pase único" : "recurrente"} · {s.duration_days ?? 30} días
        </Text>
      ) : (
        <Text size="sm" mt={6}>
          Incluido en la membresía
        </Text>
      )}
      <Text size="xs" c="dimmed" mt={2} lineClamp={2}>
        {enPlanes.length ? enPlanes.join(" · ") : "En ningún plan"}
      </Text>
    </Tarjeta>
  );
}

function TarjetaOferta({ oferta: o, onClick }: { oferta: PlanOffer; onClick: () => void }) {
  const vencida = !!o.valid_to && o.valid_to < hoyIso();
  return (
    <Tarjeta etiqueta={`Abrir la oferta ${o.name}`} onClick={onClick} apagada={!o.is_active || vencida}>
      <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          {o.name}
        </Text>
        {!o.is_active ? (
          <Badge size="xs" color="gray" variant="light" style={{ flex: "0 0 auto" }}>
            Inactiva
          </Badge>
        ) : vencida ? (
          <Badge size="xs" color="gray" variant="light" style={{ flex: "0 0 auto" }}>
            Vencida
          </Badge>
        ) : null}
      </Group>
      <Text fz={22} fw={700} mt={6} className="a-tabular">
        {valorOferta(o)}
      </Text>
      <Text size="xs" mt={2}>
        {o.plan_name ?? "Cualquier plan"}
      </Text>
      <Text size="xs" c="dimmed" mt={2}>
        {vigenciaOferta(o)}
      </Text>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Plan: alta y edición en la misma ventana
// ---------------------------------------------------------------------------

export type PlanBody = {
  name: string;
  price: string;
  duration_days: number;
  class_limit: number | null;
  service_types: string[];
  special_classes_access: boolean;
  open_gym_access: boolean;
  auto_renew_default: boolean;
  noshow_penalty: Record<string, unknown> | null;
  /** Solo en el alta: el tipo no se cambia después. */
  group_kind?: TipoPlan;
  max_members?: number | null;
  /** Solo en la edición, y solo si cambió. */
  is_active?: boolean;
};

/**
 * Crear o editar un plan. En la edición trae también «Activo» y «Eliminar»; el tipo
 * (individual, familiar o empresarial) se elige al crearlo y ya no cambia.
 */
export function PlanModal({
  plan,
  serviceOptions,
  saving,
  removing = false,
  onClose,
  onSave,
  onDelete,
}: {
  plan: Plan | "nuevo" | null;
  serviceOptions: { value: string; label: string }[];
  saving: boolean;
  removing?: boolean;
  onClose: () => void;
  onSave: (body: PlanBody) => Promise<void>;
  onDelete?: (plan: Plan) => void;
}) {
  const [kind, setKind] = useState<TipoPlan>("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | string>("");
  const [duration, setDuration] = useState<number | string>(30);
  const [classLimit, setClassLimit] = useState<number | string>("");
  const [services, setServices] = useState<string[]>([]);
  const [specialAccess, setSpecialAccess] = useState(false);
  const [openGym, setOpenGym] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [noshowPoints, setNoshowPoints] = useState<number | string>(-10);
  const [seats, setSeats] = useState<number | string>(4);
  const [activo, setActivo] = useState(true);
  // Por id y no por objeto: así un refresco de la lista no borra lo que se está
  // escribiendo, y al cerrar se olvida para que «Nuevo plan» abra siempre vacío.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const existente = plan && plan !== "nuevo" ? plan : null;
  const llave = plan === "nuevo" ? "nuevo" : (existente?.id ?? null);
  if (llave !== hydratedFor) {
    setHydratedFor(llave);
    if (llave) {
      setKind((existente?.group_kind ?? "") as TipoPlan);
      setName(existente?.name ?? "");
      setPrice(existente ? String(existente.price ?? "") : "");
      setDuration(existente?.duration_days ?? 30);
      setClassLimit(existente?.class_limit ?? "");
      setServices(existente?.service_types ?? []);
      setSpecialAccess(!!existente?.special_classes_access);
      setOpenGym(!!existente?.open_gym_access);
      setAutoRenew(existente?.auto_renew_default ?? true);
      setNoshowPoints(existente ? puntosNoShow(existente.noshow_penalty) : -10);
      setSeats(existente ? (existente.max_members ?? "") : 4);
      setActivo(existente?.is_active ?? true);
    }
  }
  const grupal = !!kind;

  const guardar = () => {
    const comun = {
      name,
      price: String(price),
      duration_days: Number(duration) || 30,
      class_limit: classLimit === "" ? null : Number(classLimit),
      service_types: services,
      special_classes_access: specialAccess,
      open_gym_access: openGym,
      auto_renew_default: autoRenew,
    };
    if (!existente) {
      return onSave({
        ...comun,
        group_kind: kind,
        max_members: grupal ? Number(seats) || null : null,
        noshow_penalty: armarPenalizacion(noshowPoints),
      });
    }
    return onSave({
      ...comun,
      noshow_penalty: armarPenalizacion(noshowPoints, existente.noshow_penalty),
      ...(grupal ? { max_members: Number(seats) } : {}),
      ...(activo !== (existente.is_active ?? true) ? { is_active: activo } : {}),
    });
  };

  return (
    <Modal opened={!!plan} onClose={onClose} title={existente ? existente.name : "Nuevo plan"} centered size="lg">
      {existente ? (
        grupal && (
          <Badge color="grape" variant="light" mb="sm">
            Plan {TIPO_PLAN_LABEL[kind]?.toLowerCase() ?? kind}
          </Badge>
        )
      ) : (
        <Input.Wrapper label="Tipo de plan" mb="sm">
          <SegmentedControl
            fullWidth
            aria-label="Tipo de plan"
            data={TIPO_PLAN_OPCIONES}
            value={kind}
            onChange={(v) => setKind(v as TipoPlan)}
          />
        </Input.Wrapper>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Nombre"
          placeholder={grupal ? "Familiar x4" : "Mensual CrossFit"}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {/* Numérico y con la moneda a la vista: antes era texto libre y "Q350" o
            "350 al mes" llegaban al backend. */}
        <NumberInput
          label={grupal ? "Precio del paquete (Q)" : "Precio (Q)"}
          placeholder={grupal ? "1200" : "350"}
          prefix="Q"
          min={0}
          decimalScale={2}
          allowNegative={false}
          thousandSeparator=","
          value={price}
          onChange={setPrice}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: grupal ? 3 : 2 }} spacing="sm" mt="sm">
        {grupal && <NumberInput label="Personas que cubre" value={seats} onChange={setSeats} min={2} />}
        <NumberInput label="Duración (días)" value={duration} onChange={setDuration} min={1} />
        <NumberInput
          label="Límite de clases"
          placeholder="Sin límite"
          value={classLimit}
          onChange={setClassLimit}
          min={0}
        />
      </SimpleGrid>
      <MultiSelect
        mt="sm"
        label="Servicios incluidos"
        placeholder={serviceOptions.length ? "Selecciona servicios" : "Crea servicios en Clases → Servicios"}
        data={serviceOptions}
        value={services}
        onChange={setServices}
        searchable
        clearable
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="md">
        <Stack gap="xs">
          <Checkbox
            label="Acceso a clases especiales"
            checked={specialAccess}
            onChange={(e) => setSpecialAccess(e.currentTarget.checked)}
          />
          <Checkbox label="Open gym" checked={openGym} onChange={(e) => setOpenGym(e.currentTarget.checked)} />
          <Checkbox
            label="Renovación automática"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.currentTarget.checked)}
          />
        </Stack>
        <NumberInput label="Penalización no-show (pts)" value={noshowPoints} onChange={setNoshowPoints} />
      </SimpleGrid>
      {existente && (
        <Switch
          mt="md"
          label="Activo"
          color="flame"
          checked={activo}
          onChange={(e) => setActivo(e.currentTarget.checked)}
        />
      )}
      <Group justify="space-between" mt="lg">
        {existente && onDelete ? (
          <Button variant="subtle" color="red" loading={removing} onClick={() => onDelete(existente)}>
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Group gap="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim() || price === "" || (grupal && Number(seats) < 2)}
            loading={saving}
            onClick={guardar}
          >
            {existente ? "Guardar" : "Crear plan"}
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Servicio: su cobro y los planes que lo incluyen
// ---------------------------------------------------------------------------

/** Cobro de un servicio del catálogo. Pendiente → se activa al definir su cobro y asignarlo a un plan. */
export function ServicioCobroModal({
  servicio,
  planOptions,
  saving,
  onClose,
  onSave,
}: {
  servicio: ServiceType | null;
  planOptions: { value: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (s: ServiceType, body: Partial<ServiceType>) => Promise<void>;
}) {
  const [access, setAccess] = useState<"included" | "extra">("included");
  const [charge, setCharge] = useState<"recurring" | "one_time">("recurring");
  const [price, setPrice] = useState<string>("0");
  const [days, setDays] = useState<number | string>(30);
  const [plans, setPlans] = useState<string[]>([]);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const llave = servicio?.id ?? null;
  if (llave !== hydratedFor) {
    setHydratedFor(llave);
    if (servicio) {
      setAccess(servicio.access_type ?? "included");
      setCharge(servicio.charge_type ?? "recurring");
      setPrice(String(servicio.price ?? "0"));
      setDays(servicio.duration_days ?? 30);
      setPlans(servicio.plans ?? []);
    }
  }
  const pendiente = !!servicio && servicio.status !== "active";

  return (
    <Modal opened={!!servicio} onClose={onClose} title={servicio?.name ?? ""} centered>
      <Input.Wrapper label="Cobro" mb="sm">
        <SegmentedControl
          fullWidth
          aria-label="Cobro"
          value={access}
          onChange={(v) => setAccess(v as "included" | "extra")}
          data={[
            { value: "included", label: "Incluido" },
            { value: "extra", label: "Pago extra" },
          ]}
        />
      </Input.Wrapper>
      {access === "extra" && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="sm">
          <Select
            label="Tipo"
            value={charge}
            onChange={(v) => setCharge((v as "recurring" | "one_time") ?? "recurring")}
            data={[
              { value: "recurring", label: "Recurrente" },
              { value: "one_time", label: "Pase único" },
            ]}
            allowDeselect={false}
          />
          <NumberInput label="Precio (Q)" prefix="Q" value={price} onChange={(v) => setPrice(String(v))} min={0} />
          <NumberInput label="Vigencia (días)" value={days} onChange={setDays} min={1} />
        </SimpleGrid>
      )}
      <MultiSelect
        label={access === "included" ? "Planes que lo incluyen" : "Planes que lo incluyen (opcional)"}
        placeholder={planOptions.length ? "Selecciona planes" : "Crea un plan primero"}
        data={planOptions}
        value={plans}
        onChange={setPlans}
        searchable
        clearable
      />
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          loading={saving}
          onClick={() =>
            servicio &&
            onSave(servicio, {
              access_type: access,
              charge_type: charge,
              price: access === "extra" ? price || "0" : "0",
              duration_days: Number(days) || 30,
              plans,
              status: "active",
            })
          }
        >
          {pendiente ? "Activar servicio" : "Guardar cambios"}
        </Button>
      </Group>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

export type OfertaBody = {
  name: string;
  offer_type: "percent" | "free_months";
  value: string;
  plan: string | null;
  valid_from: string | null;
  valid_to: string | null;
};

/**
 * Una oferta: al crearla, el formulario; ya creada, lo que se puede hacer con ella
 * (prenderla, apagarla o eliminarla). El servidor no deja editar una oferta: para
 * cambiarla se crea otra.
 */
export function OfertaModal({
  gymId,
  oferta,
  planOptions,
  saving,
  removing,
  onClose,
  onCreate,
  onDelete,
}: {
  gymId: string;
  oferta: PlanOffer | "nuevo" | null;
  planOptions: { value: string; label: string }[];
  saving: boolean;
  removing: boolean;
  onClose: () => void;
  onCreate: (body: OfertaBody) => Promise<void>;
  onDelete: (o: PlanOffer) => void;
}) {
  const existente = oferta && oferta !== "nuevo" ? oferta : null;
  return (
    <Modal opened={!!oferta} onClose={onClose} title={existente ? existente.name : "Nueva oferta"} centered>
      {existente ? (
        <Stack gap="sm">
          <Text fz={22} fw={700} className="a-tabular">
            {valorOferta(existente)}
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Text size="sm" c="dimmed">Plan</Text>
            <Text size="sm">{existente.plan_name ?? "Cualquier plan"}</Text>
            <Text size="sm" c="dimmed">Vigencia</Text>
            <Text size="sm">{vigenciaOferta(existente)}</Text>
          </SimpleGrid>
          <InterruptorOferta gymId={gymId} oferta={existente} />
          <Group justify="space-between" mt="sm">
            <Button variant="subtle" color="red" loading={removing} onClick={() => onDelete(existente)}>
              Eliminar
            </Button>
            <Button variant="default" onClick={onClose}>
              Cerrar
            </Button>
          </Group>
        </Stack>
      ) : (
        <NuevaOfertaForm planOptions={planOptions} saving={saving} onClose={onClose} onCreate={onCreate} />
      )}
    </Modal>
  );
}

/** Se monta al abrir «Nueva oferta»: cada vez empieza vacío. */
function NuevaOfertaForm({
  planOptions,
  saving,
  onClose,
  onCreate,
}: {
  planOptions: { value: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onCreate: (body: OfertaBody) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"percent" | "free_months">("percent");
  const [value, setValue] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  return (
    <>
      <TextInput
        label="Nombre de la oferta"
        placeholder="Promo verano"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        mb="sm"
      />
      <Input.Wrapper label="Tipo" mb="sm">
        <SegmentedControl
          fullWidth
          aria-label="Tipo"
          value={type}
          onChange={(v) => setType(v as "percent" | "free_months")}
          data={[
            { value: "percent", label: "Descuento %" },
            { value: "free_months", label: "Meses gratis" },
          ]}
        />
      </Input.Wrapper>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label={type === "percent" ? "Porcentaje (0-100)" : "Meses gratis"}
          placeholder={type === "percent" ? "30" : "2"}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
        <Select
          label="Plan"
          placeholder="Cualquier plan"
          value={plan}
          onChange={setPlan}
          clearable
          data={planOptions}
        />
        <DateInput label="Válida desde" value={from} onChange={setFrom} valueFormat="YYYY-MM-DD" clearable />
        <DateInput label="Válida hasta" value={to} onChange={setTo} valueFormat="YYYY-MM-DD" clearable />
      </SimpleGrid>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          loading={saving}
          disabled={!name.trim() || !value.trim()}
          onClick={() =>
            onCreate({
              name,
              offer_type: type,
              value,
              plan: plan || null,
              valid_from: iso(from),
              valid_to: iso(to),
            })
          }
        >
          Crear oferta
        </Button>
      </Group>
    </>
  );
}

/** Interruptor «Activa» de una oferta: avisa en verde si quedó y en rojo con el motivo si no. */
export function InterruptorOferta({ gymId, oferta }: { gymId: string; oferta: PlanOffer }) {
  const toggleOffer = useTogglePlanOffer(gymId);
  const cambiar = () => {
    const activar = !oferta.is_active;
    toggleOffer.mutate(
      { offerId: oferta.id, is_active: activar },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: activar ? `Oferta "${oferta.name}" activada.` : `Oferta "${oferta.name}" desactivada.`,
          }),
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, activar ? "No se pudo activar la oferta." : "No se pudo desactivar la oferta."),
          }),
      },
    );
  };
  return (
    <Switch
      label="Activa"
      checked={oferta.is_active}
      onChange={cambiar}
      disabled={toggleOffer.isPending}
      color="flame"
      aria-label={`Activa: ${oferta.name}`}
    />
  );
}
