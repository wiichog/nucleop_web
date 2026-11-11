import { FormEvent, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ColorInput,
  Divider,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { useNavigate, useSearchParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { AxiosError } from "axios";
import {
  useAccessAdmit,
  useAccessSearch,
  useAddWodResult,
  useCancelClass,
  useClassCheckins,
  useClassQr,
  useCreateDropinProduct,
  useCreateSchedule,
  useCreateServiceType,
  useCreateWod,
  useDeleteClass,
  useDeleteSchedule,
  useDeleteServiceType,
  useGymDropinProducts,
  useDeleteWod,
  useGymCoaches,
  useGymClasses,
  useInviteCoachToClass,
  useGymConfig,
  useGymPastClasses,
  useMaterializeSchedules,
  useMemberships,
  usePendingSummary,
  useSchedules,
  useServiceTypes,
  useUpdateClass,
  useUpdateDropinProduct,
  useUpdateGymConfig,
  useUpdateSchedule,
  useUpdateServiceType,
  useUploadServiceTypePhoto,
  useUpdateWod,
  useWodBoard,
  useWods,
  useWodsRango,
} from "../api/hooks";
import type {
  ClassCoachFields,
  ClassSchedule,
  DropinProduct,
  DropinType,
  GymClass,
  ScoreType,
  ServiceType,
  Wod,
} from "../api/types";
import { notifications } from "@mantine/notifications";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { CountBadge, Money, PageHeader, SectionLabel } from "../components/ui";
import { ClassRequestsTab } from "./classes/ClassRequestsTab";
import { ArmarBloquesDesdeTexto } from "./classes/ArmarBloquesDesdeTexto";
import { WodPartsEditor } from "./classes/WodPartsEditor";
import { SemanaWods } from "./classes/SemanaWods";
import { HorarioSemanal } from "./classes/HorarioSemanal";
import { Encabezado, nombreCorto, PuntoColor, Tarjeta } from "../components/Tarjeta";
import { horaDe, resumenHorario } from "../lib/horarioSemanal";
import { coincideServicio, FiltroServicio, opcionesDeServicio } from "./classes/FiltroServicio";
import {
  deIso,
  diasDeSemana,
  etiquetaColumna,
  fechaLarga,
  isoLocal,
  lunesDe,
  rangoDeSemana,
  sumarDias,
  wodDelDia,
} from "../lib/semanaWod";
import {
  bloquesConScore,
  enteroDe,
  errorDePartes,
  partesParaEditar,
  partesParaGuardar,
  textoRondas,
  tienePartes,
  type ParteBorrador,
} from "../lib/wodPartes";
import { GlassCard, delayVar } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { CHECKIN_METHOD, label } from "../lib/labels";

// Avisos de la página. Varias acciones de esta pantalla (crear servicio, crear el
// horario, regenerar el calendario, asignar coach) se disparaban con `mutateAsync`
// sin catch: si el backend rechazaba, el admin no veía absolutamente nada.
const ok = (message: string) => notifications.show({ color: "teal", message });
const fail = (error: unknown, porDefecto: string) =>
  notifications.show({ color: "red", message: errMsg(error, porDefecto) });

const WEEKDAYS = [
  { value: "0", label: "Lun" },
  { value: "1", label: "Mar" },
  { value: "2", label: "Mié" },
  { value: "3", label: "Jue" },
  { value: "4", label: "Vie" },
  { value: "5", label: "Sáb" },
  { value: "6", label: "Dom" },
];
const weekdayLabel = (w: number) => WEEKDAYS.find((d) => d.value === String(w))?.label ?? "?";

const SCORE_TYPES: { value: ScoreType; label: string }[] = [
  { value: "none", label: "Sin score (clase normal)" },
  { value: "for_time", label: "Por tiempo (menor gana)" },
  { value: "amrap", label: "AMRAP — reps (mayor gana)" },
  { value: "rounds_reps", label: "Rounds + reps (mayor gana)" },
  { value: "load", label: "Carga / peso (mayor gana)" },
  { value: "emom", label: "EMOM" },
  { value: "points", label: "Puntos (mayor gana)" },
];
const scoreLabel = (s: string) => SCORE_TYPES.find((o) => o.value === s)?.label ?? s;
/** La etiqueta corta, para listar los bloques de un workout en una celda. */
const SCORE_CORTO: Record<string, string> = {
  for_time: "Tiempo",
  amrap: "AMRAP",
  rounds_reps: "Rounds + reps",
  load: "Carga",
  emom: "EMOM",
  points: "Puntos",
};
const scoreCorto = (s: string) => SCORE_CORTO[s] ?? scoreLabel(s);

/** Rx+ (Vertikal, 10-nov-2026), Rx y Scaled. Foundations se sigue leyendo en el board. */
const SCALINGS = [
  { value: "rx_plus", label: "Rx+" },
  { value: "rx", label: "Rx" },
  { value: "scaled", label: "Scaled" },
];
const NOMBRE_SCALING: Record<string, string> = { rx_plus: "Rx+", rx: "Rx", scaled: "Scaled", foundations: "Foundations" };

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

/** El filtro por servicio que comparten las pestañas (vive en la URL). */
type FiltroProps = { gymId: string; servicio: string | null; setServicio: (s: string | null) => void };

/** GymClass del schema + los campos del sprint de coaches. */
type ClassRow = GymClass & ClassCoachFields;

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  // El contador va en la pestaña porque la solicitud NO se resuelve sola: hasta
  // que el gym decida, la clase se queda sin coach.
  const pendientes = usePendingSummary(gymId).data?.solicitudes_clase ?? 0;
  // La pestaña vive en la URL (mismo patrón que Inventario): así el pendiente
  // «coaches que piden clase» abre directamente donde se resuelve, en vez de
  // dejar al admin buscando la pestaña que acaba de tocar.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "schedule";
  // El filtro por servicio también vive en la URL y es UNO para todas las
  // pestañas: quien elige «CrossFit» en el horario lo sigue viendo al pasar a
  // Clases o Solicitudes, en vez de volver a filtrar en cada tabla.
  const servicio = searchParams.get("servicio") || null;
  const params = (t: string | null, s: string | null) => {
    const p: Record<string, string> = {};
    if (t && t !== "schedule") p.tab = t;
    if (s) p.servicio = s;
    return p;
  };
  const setServicio = (s: string | null) => setSearchParams(params(tab, s), { replace: true });
  const filtro = { servicio, setServicio };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        kicker="Operación · Programación"
        title="Clases y workouts"
      />
      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(params(v, servicio))}
      >
        {/* Las pestañas entran justo después del hairline del hero. */}
        <Tabs.List mb="lg" className="a-rise" style={delayVar(0.5)}>
          <Tabs.Tab value="services">Servicios</Tabs.Tab>
          <Tabs.Tab value="schedule">Horario semanal</Tabs.Tab>
          <Tabs.Tab value="classes">Clases</Tabs.Tab>
          {/* Junto al calendario y no en Coaches: lo que se decide aquí es QUIÉN
              da una franja concreta, y para decidirlo hay que ver la franja. */}
          <Tabs.Tab value="requests">
            <Group gap={6}>
              Solicitudes
              {pendientes ? <CountBadge count={pendientes} /> : null}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="wod">Workout</Tabs.Tab>
          <Tabs.Tab value="dropins">Drop-ins / Pases</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="services">
          <ServicesTab gymId={gymId} {...filtro} />
        </Tabs.Panel>
        <Tabs.Panel value="schedule">
          <ScheduleTab gymId={gymId} {...filtro} />
        </Tabs.Panel>
        <Tabs.Panel value="classes">
          <ClassesTab gymId={gymId} {...filtro} />
        </Tabs.Panel>
        <Tabs.Panel value="requests">
          <ClassRequestsTab gymId={gymId} {...filtro} />
        </Tabs.Panel>
        <Tabs.Panel value="wod">
          <WodTab gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="dropins">
          <DropinsTab gymId={gymId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drop-ins / Pases (gestionados por el gym)
// ---------------------------------------------------------------------------
const DROPIN_TYPES: { value: DropinType; label: string }[] = [
  { value: "one_class", label: "Una clase" },
  { value: "day", label: "Un día" },
  { value: "week", label: "Una semana" },
  { value: "open_gym", label: "Open gym" },
  { value: "special", label: "Clase especial" },
  { value: "free_trial", label: "Prueba gratuita" },
];
const dropinTypeLabel = (t: string) => DROPIN_TYPES.find((o) => o.value === t)?.label ?? t;

function DropinsTab({ gymId }: { gymId: string }) {
  const products = useGymDropinProducts(gymId);
  const create = useCreateDropinProduct(gymId);
  const update = useUpdateDropinProduct(gymId);
  // null = cerrado · "nuevo" = alta · un pase = edición.
  const [abierto, setAbierto] = useState<DropinProduct | "nuevo" | null>(null);

  if (products.isError) return <PageError onRetry={() => products.refetch()} />;

  const todos = ((products.data ?? []) as DropinProduct[])
    .slice()
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || Number(a.price) - Number(b.price));

  const guardar = async (body: Partial<DropinProduct>) => {
    try {
      if (abierto === "nuevo") {
        await create.mutateAsync(body);
        ok("Pase creado.");
      } else if (abierto) {
        await update.mutateAsync({ id: abierto.id, body });
        ok("Pase actualizado.");
      }
      setAbierto(null);
    } catch (error) {
      fail(error, abierto === "nuevo" ? "No se pudo crear el pase." : "No se pudo actualizar el pase.");
    }
  };

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Pases">
        <Button onClick={() => setAbierto("nuevo")}>Nuevo pase</Button>
      </Encabezado>
      {products.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : todos.length === 0 ? (
        <Text c="dimmed" size="sm">
          Crea tu primer pase: una clase, un día, una semana…
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
          {todos.map((p) => (
            <Tarjeta
              key={p.id}
              etiqueta={`Editar ${p.name || p.type_label || dropinTypeLabel(p.type)}`}
              onClick={() => setAbierto(p)}
              apagada={!p.is_active}
            >
              <Text fw={700} truncate>
                {p.name || p.type_label || dropinTypeLabel(p.type)}
              </Text>
              {p.name && (
                <Text size="xs" c="dimmed" truncate>
                  {p.type_label ?? dropinTypeLabel(p.type)}
                </Text>
              )}
              <Text fz={22} fw={700} mt={6} className="a-tabular">
                <Money value={p.price} decimals={Number(p.price) % 1 ? 2 : 0} />
              </Text>
              <Badge size="xs" mt={6} color={p.is_active ? "teal" : "gray"} variant="light">
                {p.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </Tarjeta>
          ))}
        </SimpleGrid>
      )}
      <PaseModal
        pase={abierto}
        saving={create.isPending || update.isPending}
        onClose={() => setAbierto(null)}
        onSave={guardar}
      />
    </GlassCard>
  );
}

function PaseModal({
  pase,
  saving,
  onClose,
  onSave,
}: {
  pase: DropinProduct | "nuevo" | null;
  saving: boolean;
  onClose: () => void;
  onSave: (body: Partial<DropinProduct>) => Promise<void>;
}) {
  const [type, setType] = useState<DropinType>("one_class");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [activo, setActivo] = useState(true);
  const [hydratedFor, setHydratedFor] = useState<DropinProduct | "nuevo" | null>(null);
  const existente = pase && pase !== "nuevo" ? pase : null;

  // Al cerrar se olvida lo cargado: si no, el segundo "Nuevo pase" salía con lo anterior.
  if (!pase && hydratedFor !== null) setHydratedFor(null);
  if (pase && hydratedFor !== pase) {
    setHydratedFor(pase);
    setType((existente?.type as DropinType) ?? "one_class");
    setName(existente?.name ?? "");
    setPrice(existente ? Number(existente.price) : "");
    setActivo(existente?.is_active ?? true);
  }

  const precioValido = price !== "" && Number(price) >= 0;

  return (
    <Modal opened={!!pase} onClose={onClose} title={existente ? "Editar pase" : "Nuevo pase"} centered>
      <Select
        label="Tipo"
        data={DROPIN_TYPES}
        value={type}
        onChange={(v) => setType((v ?? "one_class") as DropinType)}
        allowDeselect={false}
        mb="sm"
      />
      <TextInput
        label="Nombre (opcional)"
        placeholder="Pase de día"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        mb="sm"
      />
      <NumberInput
        label="Precio (Q)"
        min={0}
        value={price}
        onChange={(v) => setPrice(typeof v === "number" ? v : "")}
        mb="md"
      />
      {existente && <Switch label="Activo" checked={activo} onChange={(e) => setActivo(e.currentTarget.checked)} mb="md" />}
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          loading={saving}
          disabled={!precioValido}
          onClick={() =>
            onSave({
              type,
              name: name.trim(),
              price: String(price),
              ...(existente ? { is_active: activo } : {}),
            })
          }
        >
          {existente ? "Guardar" : "Crear pase"}
        </Button>
      </Group>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Servicios (catálogo)
// ---------------------------------------------------------------------------
function ServicesTab({ gymId, servicio, setServicio }: FiltroProps) {
  const services = useServiceTypes(gymId);
  const create = useCreateServiceType(gymId);
  const update = useUpdateServiceType(gymId);
  const remove = useDeleteServiceType(gymId);
  const uploadPhoto = useUploadServiceTypePhoto(gymId);
  const navigate = useNavigate();
  // null = cerrado · "nuevo" = alta · un servicio = edición.
  const [abierto, setAbierto] = useState<ServiceType | "nuevo" | null>(null);

  if (services.isError) return <PageError onRetry={() => services.refetch()} />;

  const todos = (services.data ?? []) as ServiceType[];
  const rows = todos
    .filter((s) => coincideServicio(s.name, servicio))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "es"));
  const pendientes = todos.filter((s) => s.is_active && s.status !== "active").length;

  const guardar = async (body: Partial<ServiceType>, photo: File | null) => {
    try {
      if (abierto === "nuevo") {
        const created = await create.mutateAsync({ ...body, default_score_type: "none" });
        if (photo) await uploadPhoto.mutateAsync({ id: created.id, file: photo });
        ok(`Servicio "${created.name}" creado.`);
      } else if (abierto) {
        await update.mutateAsync({ id: abierto.id, body });
        if (photo) await uploadPhoto.mutateAsync({ id: abierto.id, file: photo });
        ok("Servicio actualizado.");
      }
      setAbierto(null);
    } catch (error) {
      fail(error, abierto === "nuevo" ? "No se pudo crear el servicio." : "No se pudo actualizar el servicio.");
    }
  };

  const eliminar = (s: ServiceType) => {
    if (!window.confirm(`¿Eliminar el servicio "${s.name}"? Sus horarios quedarán sin servicio.`)) return;
    remove.mutate(s.id, {
      onSuccess: () => {
        ok(`Servicio "${s.name}" eliminado.`);
        setAbierto(null);
      },
      onError: (error) => fail(error, "No se pudo eliminar el servicio."),
    });
  };

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Servicios"
        avisos={
          pendientes > 0 && (
            <Badge color="yellow" variant="light">
              {pendientes} sin plan
            </Badge>
          )
        }
      >
        {todos.length > 6 && (
          <FiltroServicio
            opciones={opcionesDeServicio(todos.map((s) => s.name), servicio)}
            value={servicio}
            onChange={setServicio}
          />
        )}
        <Button onClick={() => setAbierto("nuevo")}>Nuevo servicio</Button>
      </Encabezado>

      {services.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : rows.length === 0 ? (
        <Text c="dimmed" size="sm">
          {todos.length ? "Ningún servicio coincide con el filtro." : "Crea tu primer servicio: CrossFit, Pilates, Open Gym…"}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {rows.map((s) => {
            const sinPlan = s.is_active && s.status !== "active";
            return (
              <Tarjeta
                key={s.id}
                etiqueta={`Editar ${s.name}`}
                onClick={() => setAbierto(s)}
                aviso={sinPlan}
                apagada={!s.is_active}
                color={s.color}
              >
                {s.photo && (
                  <img
                    src={s.photo}
                    alt=""
                    style={{ width: "100%", height: 84, objectFit: "cover", borderRadius: 8, marginBottom: 8, display: "block" }}
                  />
                )}
                <Group gap={8} wrap="nowrap" justify="space-between">
                  <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                    <PuntoColor color={s.color} />
                    <Text fw={700} truncate>
                      {s.name}
                    </Text>
                  </Group>
                  {!s.is_active ? (
                    <Badge size="xs" color="gray" variant="light">Inactivo</Badge>
                  ) : sinPlan ? (
                    <Badge size="xs" color="yellow" variant="light">Pendiente</Badge>
                  ) : (
                    <Badge size="xs" color="teal" variant="light">Activo</Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt={6}>
                  {s.default_duration_min} min · cupo {s.default_capacity} · {s.completion_points ?? 5} pts
                  {s.rating != null ? ` · ★ ${s.rating.toFixed(1)}` : ""}
                </Text>
                {s.requires_wod && (
                  <Badge size="xs" color="flame" variant="light" mt={6}>
                    Con workout
                  </Badge>
                )}
                {sinPlan && (
                  <Text
                    size="xs"
                    mt={6}
                    c="var(--mantine-color-yellow-light-color)"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/panel/planes");
                    }}
                  >
                    Asígnalo a un plan →
                  </Text>
                )}
              </Tarjeta>
            );
          })}
        </SimpleGrid>
      )}

      <ServiceTypeModal
        service={abierto}
        saving={create.isPending || update.isPending || uploadPhoto.isPending}
        removing={remove.isPending}
        onClose={() => setAbierto(null)}
        onSave={guardar}
        onDelete={eliminar}
      />
    </GlassCard>
  );
}

/** Crear o editar un servicio. En edición trae también «Activo» y «Eliminar». */
function ServiceTypeModal({
  service,
  saving,
  removing,
  onClose,
  onSave,
  onDelete,
}: {
  service: ServiceType | "nuevo" | null;
  saving: boolean;
  removing: boolean;
  onClose: () => void;
  onSave: (body: Partial<ServiceType>, photo: File | null) => Promise<void>;
  onDelete: (s: ServiceType) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1B7FA6");
  const [requiresWod, setRequiresWod] = useState(false);
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [points, setPoints] = useState<number | string>(5);
  const [description, setDescription] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [activo, setActivo] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [hydratedFor, setHydratedFor] = useState<ServiceType | "nuevo" | null>(null);

  const existente = service && service !== "nuevo" ? service : null;
  // Al cerrar se olvida lo cargado: sin esto, abrir "Nuevo servicio" otra vez
  // ("nuevo" === "nuevo") no se reiniciaba y salía con los datos del anterior.
  if (!service && hydratedFor !== null) setHydratedFor(null);
  if (service && hydratedFor !== service) {
    setHydratedFor(service);
    setName(existente?.name ?? "");
    setColor(existente?.color || "#1B7FA6");
    setRequiresWod(existente?.requires_wod ?? false);
    setDuration(existente?.default_duration_min ?? 60);
    setCapacity(existente?.default_capacity ?? 20);
    setPoints(existente?.completion_points ?? 5);
    setDescription(existente?.description ?? "");
    setHowItWorks(existente?.how_it_works ?? "");
    setActivo(existente?.is_active ?? true);
    setPhoto(null);
  }

  return (
    <Modal opened={!!service} onClose={onClose} title={existente ? existente.name : "Nuevo servicio"} centered size="lg">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput label="Nombre" placeholder="CrossFit" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
        <ColorInput label="Color" value={color} onChange={setColor} format="hex" />
      </SimpleGrid>
      <SimpleGrid cols={3} spacing="sm" mt="sm">
        <NumberInput label="Minutos" value={duration} onChange={setDuration} min={15} max={300} />
        <NumberInput label="Cupo" value={capacity} onChange={setCapacity} min={1} max={200} />
        <NumberInput label="Puntos" value={points} onChange={setPoints} min={0} max={1000} />
      </SimpleGrid>
      <Textarea
        label="Descripción (la ven los atletas)"
        placeholder="Entrenamiento funcional de alta intensidad en grupo"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        autosize
        minRows={2}
        mt="sm"
      />
      <Textarea
        label="Cómo funciona"
        placeholder="Reserva tu cupo, asiste y escanea el QR al terminar"
        value={howItWorks}
        onChange={(e) => setHowItWorks(e.currentTarget.value)}
        autosize
        minRows={2}
        mt="sm"
      />
      <Group align="flex-end" gap="sm" mt="sm" wrap="nowrap">
        {existente?.photo && !photo && (
          <img
            src={existente.photo}
            alt=""
            style={{ width: 64, height: 42, objectFit: "cover", borderRadius: 8, border: "1px solid var(--a-line)" }}
          />
        )}
        <FileInput
          label="Foto"
          placeholder={existente?.photo ? "Cambiar foto" : "Subir imagen"}
          accept="image/*"
          value={photo}
          onChange={setPhoto}
          clearable
          style={{ flex: 1 }}
        />
      </Group>
      <Group mt="md" gap="lg">
        <Switch label="Lleva workout" checked={requiresWod} onChange={(e) => setRequiresWod(e.currentTarget.checked)} />
        {existente && <Switch label="Activo" checked={activo} onChange={(e) => setActivo(e.currentTarget.checked)} />}
      </Group>
      <Group justify="space-between" mt="lg">
        {existente ? (
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
            disabled={!name.trim()}
            loading={saving}
            onClick={() =>
              onSave(
                {
                  name: name.trim(),
                  color,
                  requires_wod: requiresWod,
                  default_duration_min: Number(duration),
                  default_capacity: Number(capacity),
                  completion_points: Number(points),
                  description: description.trim(),
                  how_it_works: howItWorks.trim(),
                  ...(existente ? { is_active: activo } : {}),
                },
                photo,
              )
            }
          >
            {existente ? "Guardar" : "Crear servicio"}
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Horario semanal (plantillas)
// ---------------------------------------------------------------------------
/** Lo que trae el alta al abrirse: vacío, desde un hueco (día + hora) o copiando una clase. */
type BorradorFranja = {
  serviceId: string | null;
  startTime: string;
  duration: number;
  capacity: number;
  coachId: string | null;
  weekdays: string[];
};

function ScheduleTab({ gymId, servicio, setServicio }: FiltroProps) {
  const services = useServiceTypes(gymId);
  const schedules = useSchedules(gymId);
  const coaches = useGymCoaches(gymId);
  const update = useUpdateSchedule(gymId);
  const remove = useDeleteSchedule(gymId);
  const materialize = useMaterializeSchedules(gymId);
  const [editing, setEditing] = useState<ClassSchedule | null>(null);
  const [nueva, setNueva] = useState<BorradorFranja | null>(null);
  const [materialized, setMaterialized] = useState<number | null>(null);

  const serviceList = (services.data ?? []) as ServiceType[];
  const serviceOptions = useMemo(
    () => ((services.data ?? []) as ServiceType[]).map((s) => ({ value: s.id, label: s.name })),
    [services.data],
  );
  const coachOptions = useMemo(
    () => (coaches.data ?? []).map((c) => ({ value: c.staff_role, label: c.name || c.email })),
    [coaches.data],
  );

  if (schedules.isError) return <PageError onRetry={() => schedules.refetch()} />;

  const todas = (schedules.data ?? []) as ClassSchedule[];
  const rows = todas.filter((s) => coincideServicio(s.service_type_name, servicio));
  const resumen = resumenHorario(rows);
  const conServicio = new Set(rows.map((s) => s.service_type)).size > 1;
  /** En la celda cabe un nombre, no un correo: sin nombre, va lo que está antes de la @. */
  const coachDe = (s: ClassSchedule) => {
    if (!s.default_coach) return null;
    const c = (coaches.data ?? []).find((x) => x.staff_role === s.default_coach);
    return nombreCorto(c?.name || c?.email) ?? "Coach";
  };

  /** El alta arranca con los valores del servicio filtrado, si hay uno. */
  const abrirNueva = (extra: Partial<BorradorFranja> = {}) => {
    const filtrado = servicio ? serviceList.find((s) => coincideServicio(s.name, servicio)) : undefined;
    setNueva({
      serviceId: filtrado?.id ?? null,
      startTime: "06:00",
      duration: filtrado?.default_duration_min ?? 60,
      capacity: filtrado?.default_capacity ?? 20,
      coachId: null,
      weekdays: ["0", "1", "2", "3", "4"],
      ...extra,
    });
  };

  return (
    <>
      <GlassCard delay={0.6} padding={18}>
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm" align="flex-end">
          <div>
            <SectionLabel mb={4}>Plantilla semanal</SectionLabel>
            <Title order={3}>Horario semanal</Title>
            <Group gap="xs" mt={4}>
              <Text size="sm" c="dimmed">
                {resumen.clases} {resumen.clases === 1 ? "clase" : "clases"} por semana
              </Text>
              {resumen.sinCoach > 0 && (
                <Badge color="yellow" variant="light">
                  {resumen.sinCoach} sin coach
                </Badge>
              )}
            </Group>
          </div>
          <Group gap="sm" wrap="wrap">
            <FiltroServicio
              opciones={opcionesDeServicio(todas.map((s) => s.service_type_name), servicio)}
              value={servicio}
              onChange={setServicio}
            />
            <Tooltip label="Reconstruye el calendario futuro desde los horarios activos (quita clases sobrantes sin reservas y regenera las próximas semanas)">
              <Button
                variant="default"
                loading={materialize.isPending}
                onClick={async () => {
                  try {
                    const res = await materialize.mutateAsync();
                    setMaterialized(res.materialized);
                  } catch (error) {
                    fail(error, "No se pudo regenerar el calendario.");
                  }
                }}
              >
                Regenerar calendario
              </Button>
            </Tooltip>
            <Button onClick={() => abrirNueva()} disabled={!serviceOptions.length}>
              Agregar clase
            </Button>
          </Group>
        </Group>
        {materialized !== null && (
          <Text c="flame" size="sm" mb="sm">
            Calendario regenerado: {materialized} clases en el horizonte.
          </Text>
        )}

        {schedules.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : rows.length ? (
          <>
            <HorarioSemanal
              franjas={rows}
              coachDe={coachDe}
              conServicio={conServicio}
              onAbrir={setEditing}
              onNueva={(dia, hora) => abrirNueva({ startTime: hora, weekdays: [String(dia)] })}
            />
            <Text size="xs" c="dimmed" mt="sm">
              Toca una clase para cambiarla o quitarla. Toca un espacio vacío (+) para agregar una clase ahí.
            </Text>
          </>
        ) : (
          <Stack align="flex-start" gap="xs" py="md">
            <Text c="dimmed">
              {todas.length
                ? "Este servicio todavía no tiene clases en el horario."
                : serviceOptions.length
                  ? "Agrega la primera clase del horario semanal."
                  : "Crea un servicio en la pestaña «Servicios» para poder armar el horario."}
            </Text>
            {serviceOptions.length > 0 && (
              <Button variant="light" onClick={() => abrirNueva()}>
                Agregar clase
              </Button>
            )}
          </Stack>
        )}
      </GlassCard>

      <NuevaFranjaModal
        gymId={gymId}
        borrador={nueva}
        serviceOptions={serviceOptions}
        coachOptions={coachOptions}
        onClose={() => setNueva(null)}
      />

      <EditScheduleModal
        schedule={editing}
        coachOptions={coachOptions}
        saving={update.isPending}
        removing={remove.isPending}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await update.mutateAsync({ id: editing.id, body });
            ok("Horario actualizado.");
            setEditing(null);
          } catch (error) {
            fail(error, "No se pudo actualizar el horario.");
          }
        }}
        onRemove={() => {
          if (!editing) return;
          remove.mutate(editing.id, {
            onSuccess: () => {
              ok("Clase quitada del horario.");
              setEditing(null);
            },
            onError: (error) => fail(error, "No se pudo quitar la clase."),
          });
        }}
        onCopy={(s) => {
          setEditing(null);
          abrirNueva({
            serviceId: s.service_type,
            startTime: horaDe(s),
            duration: s.duration_min,
            capacity: s.capacity,
            coachId: s.default_coach,
            // Los días que ya tienen esta clase no se vuelven a marcar: duplicaría.
            weekdays: [],
          });
        }}
      />
    </>
  );
}

/** El alta de una clase al horario: un `ClassSchedule` por cada día marcado. */
function NuevaFranjaModal({
  gymId,
  borrador,
  serviceOptions,
  coachOptions,
  onClose,
}: {
  gymId: string;
  borrador: BorradorFranja | null;
  serviceOptions: { value: string; label: string }[];
  coachOptions: { value: string; label: string }[];
  onClose: () => void;
}) {
  const create = useCreateSchedule(gymId);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [openEnded, setOpenEnded] = useState(true);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [hydratedFor, setHydratedFor] = useState<BorradorFranja | null>(null);

  if (borrador && hydratedFor !== borrador) {
    setHydratedFor(borrador);
    setServiceId(borrador.serviceId);
    setStartTime(borrador.startTime);
    setDuration(borrador.duration);
    setCapacity(borrador.capacity);
    setCoachId(borrador.coachId);
    setWeekdays(borrador.weekdays);
    setFromDate(new Date());
    setOpenEnded(true);
    setToDate(null);
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!serviceId || !weekdays.length) return;
    // Una fila por día seleccionado: cada celda de la cuadrícula es su propio horario.
    const creados: string[] = [];
    try {
      for (const w of [...weekdays].sort()) {
        await create.mutateAsync({
          service_type: serviceId,
          weekday: Number(w),
          start_time: startTime,
          duration_min: Number(duration),
          capacity: Number(capacity),
          default_coach: coachId,
          valid_from: iso(fromDate),
          valid_until: openEnded ? null : iso(toDate),
        } as Partial<ClassSchedule>);
        creados.push(w);
      }
      ok(`${creados.length} ${creados.length === 1 ? "clase agregada" : "clases agregadas"} al horario.`);
      onClose();
    } catch (error) {
      // El alta es día por día. Si falla a mitad hay que (1) decir cuántos entraron —
      // NO como texto por defecto, porque el mensaje del backend lo taparía — y
      // (2) sacar de la selección los días ya creados: `ClassSchedule` no tiene
      // unicidad, así que reenviar el formulario completo crearía filas repetidas y
      // el materializador genera una `GymClass` por horario ⇒ clases duplicadas.
      if (creados.length) {
        const dias = creados.map((w) => WEEKDAYS.find((d) => d.value === w)?.label ?? w);
        setWeekdays(weekdays.filter((w) => !creados.includes(w)));
        notifications.show({
          color: "red",
          message: `Se crearon ${creados.length} (${dias.join(", ")}) y el siguiente falló: ${errMsg(
            error,
            "error desconocido",
          )} · Los días ya creados se quitaron de la selección para no duplicarlos.`,
        });
        return;
      }
      fail(error, "No se pudo agregar la clase.");
    }
  };

  return (
    <Modal opened={!!borrador} onClose={onClose} title="Agregar al horario" centered size="lg">
      <form onSubmit={submit}>
        <Text c="dimmed" size="sm" mb="md">
          Marca los días en que se repite. Las clases de las próximas semanas se generan solas.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Select
            label="Servicio"
            placeholder="Selecciona"
            data={serviceOptions}
            value={serviceId}
            onChange={setServiceId}
            searchable
            required
          />
          <Select
            label="Coach"
            placeholder="Sin asignar"
            clearable
            searchable
            value={coachId}
            onChange={setCoachId}
            data={coachOptions}
          />
          <TimeInput label="Hora" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} />
          <Group grow>
            <NumberInput label="Minutos" value={duration} onChange={setDuration} min={15} max={300} />
            <NumberInput label="Cupo" value={capacity} onChange={setCapacity} min={1} max={200} />
          </Group>
        </SimpleGrid>

        <Text size="sm" fw={500} mt="md" mb={6}>
          Días
        </Text>
        <Group gap="xs" grow>
          {WEEKDAYS.map((d) => {
            const active = weekdays.includes(d.value);
            return (
              <Button
                key={d.value}
                px={0}
                variant={active ? "filled" : "default"}
                color="flame"
                onClick={() =>
                  setWeekdays((cur) => (active ? cur.filter((x) => x !== d.value) : [...cur, d.value]))
                }
              >
                {d.label}
              </Button>
            );
          })}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
          <DateInput label="Desde" value={fromDate} onChange={setFromDate} valueFormat="YYYY-MM-DD" popoverProps={{ withinPortal: true }} clearable />
          <DateInput label="Hasta" value={toDate} onChange={setToDate} valueFormat="YYYY-MM-DD" disabled={openEnded} popoverProps={{ withinPortal: true }} clearable />
        </SimpleGrid>
        <Switch mt="sm" label="Sin fecha de fin" checked={openEnded} onChange={(e) => setOpenEnded(e.currentTarget.checked)} />

        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!serviceId || !weekdays.length}>
            {weekdays.length > 1 ? `Agregar ${weekdays.length} clases` : "Agregar"}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Clases (listado + asistencia) — flujo existente
// ---------------------------------------------------------------------------
function ClassesTab({ gymId, servicio, setServicio }: FiltroProps) {
  const classes = useGymClasses(gymId);
  const pastClasses = useGymPastClasses(gymId);
  const coaches = useGymCoaches(gymId);
  const updateClass = useUpdateClass(gymId);
  const cancelClass = useCancelClass(gymId);
  const deleteClass = useDeleteClass(gymId);
  const config = useGymConfig(gymId);
  const updateConfig = useUpdateGymConfig(gymId);
  const hoy = isoLocal(new Date());
  const wodsToday = useWods(gymId, hoy);
  const allowFuture = config.data?.allow_future_reservations ?? true;

  // El día que se mira y la semana de la tira. Arranca en hoy.
  const [dia, setDia] = useState(hoy);
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const checkins = useClassCheckins(gymId, selectedClassId);
  // Visitantes: check-ins sin membresía, o sea los que entraron con un pase drop-in.
  const visitantes = useMemo(
    () => (checkins.data ?? []).filter((c) => !c.membership).length,
    [checkins.data],
  );
  const coachName = (staffId: string | null) => {
    const c = (coaches.data ?? []).find((x) => x.staff_role === staffId);
    return c ? nombreCorto(c.name || c.email) : null;
  };

  // Pasado y futuro juntos, sin repetir: la tira cuenta todos los días de la semana.
  const todas = useMemoClases(classes.data as ClassRow[] | undefined, pastClasses.data as ClassRow[] | undefined);

  const source = dia < hoy ? pastClasses : classes;
  if (source.isError) return <PageError onRetry={() => source.refetch()} />;

  const diaDe = (c: ClassRow) => isoLocal(new Date(c.starts_at));
  const delServicio = todas.filter((c) => coincideServicio(c.class_type, servicio));
  const delDia = delServicio
    .filter((c) => diaDe(c) === dia)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Ventana de asistencia (espejo del backend): 30 min antes del inicio hasta
  // una hora después del fin. Fuera de ella solo se CONSULTA lo registrado.
  const now = Date.now();
  const startMs = (c: ClassRow) => new Date(c.starts_at).getTime();
  const endMs = (c: ClassRow) => startMs(c) + (c.duration_min ?? 60) * 60 * 1000;
  const yaInicio = (c: ClassRow) => now >= startMs(c);
  const enVentanaAsistencia = (c: ClassRow) =>
    now >= startMs(c) - 30 * 60 * 1000 && now <= endMs(c) + 60 * 60 * 1000;

  // Lo que pide atención en el día que se mira: sin coach (solo lo que aún no
  // empieza) y, hoy, clases con workout cuyo workout no está publicado.
  const activasDelDia = delDia.filter((c) => c.status !== "cancelled");
  const sinCoach = activasDelDia.filter((c) => !c.coach && !yaInicio(c));
  const faltaWorkout = (c: ClassRow) =>
    diaDe(c) === hoy &&
    c.needs_wod &&
    !(wodsToday.data ?? []).some((w) => w.published && (!w.service_type || w.service_type === c.service_type));
  const sinWorkout = activasDelDia.filter(faltaWorkout);

  const hora = (c: ClassRow) =>
    new Date(c.starts_at).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  const selectedClass = todas.find((c) => c.id === selectedClassId) ?? null;
  const asistenciaAbierta = !!selectedClass && enVentanaAsistencia(selectedClass);
  const iniciada = !!selectedClass && yaInicio(selectedClass);

  const irA = (d: Date) => {
    setDia(isoLocal(d));
    setLunes(lunesDe(d));
  };

  const onDeleteClass = (gymClass: ClassRow) => {
    if (!window.confirm(`¿Eliminar la clase ${gymClass.class_type} del ${new Date(gymClass.starts_at).toLocaleString("es-GT")}?`))
      return;
    deleteClass.mutate(gymClass.id, {
      onSuccess: () => {
        ok("Clase eliminada.");
        setSelectedClassId("");
      },
      onError: (error) => fail(error, "No se pudo eliminar la clase."),
    });
  };

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Clases"
        avisos={
          <>
            {sinCoach.length > 0 && (
              <Badge color="yellow" variant="light">
                {sinCoach.length} sin coach
              </Badge>
            )}
            {sinWorkout.length > 0 && (
              <Badge color="yellow" variant="light">
                {sinWorkout.length} sin workout
              </Badge>
            )}
          </>
        }
      >
        <FiltroServicio
          opciones={opcionesDeServicio(todas.map((c) => c.class_type), servicio)}
          value={servicio}
          onChange={setServicio}
        />
        <Tooltip label="Si está apagado, los atletas solo pueden reservar las clases de hoy">
          <div>
            <Switch
              label="Reservar días futuros"
              checked={allowFuture}
              disabled={config.isLoading || updateConfig.isPending}
              onChange={(e) => {
                const permitir = e.currentTarget.checked;
                updateConfig.mutate(
                  { allow_future_reservations: permitir },
                  {
                    onSuccess: () =>
                      ok(permitir ? "Los atletas ya pueden reservar días futuros." : "Los atletas solo reservan las clases de hoy."),
                    onError: (error) => fail(error, "No se pudo guardar la configuración de reservas."),
                  },
                );
              }}
            />
          </div>
        </Tooltip>
      </Encabezado>

      {/* La tira de días: una semana, con cuántas clases tiene cada día. */}
      <Group gap={6} mb="md" wrap="nowrap" style={{ overflowX: "auto" }}>
        <Button variant="default" size="xs" px={8} onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior">
          ‹
        </Button>
        {diasDeSemana(lunes).map((d) => {
          const f = isoLocal(d);
          const n = delServicio.filter((c) => diaDe(c) === f && c.status !== "cancelled").length;
          const activo = f === dia;
          return (
            <Button
              key={f}
              size="xs"
              variant={activo ? "filled" : "default"}
              color="flame"
              onClick={() => setDia(f)}
              style={{ flex: "1 0 auto", minWidth: 64 }}
            >
              {f === hoy ? "Hoy" : etiquetaColumna(d)}
              {n > 0 && (
                <Text span size="xs" ml={6} c={activo ? undefined : "dimmed"}>
                  {n}
                </Text>
              )}
            </Button>
          );
        })}
        <Button variant="default" size="xs" px={8} onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente">
          ›
        </Button>
        {dia !== hoy && (
          <Button variant="subtle" size="xs" onClick={() => irA(new Date())}>
            Ir a hoy
          </Button>
        )}
      </Group>

      <Text fw={700} size="sm" mb="xs">
        {mayuscula(fechaLarga(deIso(dia)))}
      </Text>

      {source.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : delDia.length === 0 ? (
        <Text c="dimmed" size="sm" py="md">
          {servicio ? `Sin clases de ${servicio} este día.` : "Sin clases este día."}
        </Text>
      ) : (
        <Stack gap={6}>
          {delDia.map((c) => {
            const cancelada = c.status === "cancelled";
            const falta = !cancelada && !c.coach && !yaInicio(c);
            const coach = c.coach ? (nombreCorto(c.coach_name) ?? coachName(c.coach)) : null;
            const pct = c.capacity ? Math.min(100, Math.round((c.reserved_count / c.capacity) * 100)) : 0;
            return (
              <Tarjeta
                key={c.id}
                etiqueta={`${c.class_type} ${hora(c)}, ${coach ?? "sin coach"}`}
                onClick={() => setSelectedClassId(c.id)}
                aviso={falta}
                apagada={cancelada}
              >
                <Group gap="sm" wrap="nowrap">
                  <Text fw={700} w={52} className="a-tabular">
                    {hora(c)}
                  </Text>
                  <PuntoColor color={c.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {c.class_type}
                      <Text span c={falta ? "var(--mantine-color-yellow-light-color)" : "dimmed"} fw={falta ? 700 : 400}>
                        {" · "}
                        {coach ?? (falta && c.is_past_assignment_deadline ? "Sin coach · urge" : "Sin coach")}
                      </Text>
                    </Text>
                  </div>
                  {cancelada && <Badge size="xs" color="gray" variant="light">Cancelada</Badge>}
                  {faltaWorkout(c) && !cancelada && <Badge size="xs" color="yellow" variant="light">Sin workout</Badge>}
                  {c.rating != null && (
                    <Text size="xs" c="dimmed" visibleFrom="sm">
                      ★ {c.rating.toFixed(1)}
                    </Text>
                  )}
                  <Progress value={pct} color="flame" size="sm" w={80} visibleFrom="xs" />
                  <Text size="sm" c="dimmed" w={48} ta="right" className="a-tabular">
                    {c.reserved_count}/{c.capacity}
                  </Text>
                </Group>
              </Tarjeta>
            );
          })}
        </Stack>
      )}

      <AssignCoachModal
        gymClass={editing}
        gymId={gymId}
        coaches={coaches.data ?? []}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await updateClass.mutateAsync({ classId: editing.id, body });
            ok("Clase actualizada.");
            setEditing(null);
          } catch (error) {
            fail(error, "No se pudo actualizar la clase.");
          }
        }}
        saving={updateClass.isPending}
      />

      <Modal
        opened={!!selectedClassId && !editing}
        onClose={() => setSelectedClassId("")}
        title={selectedClass ? `${selectedClass.class_type} · ${hora(selectedClass)}` : "Clase"}
        size="lg"
        centered
      >
        {selectedClass && (
          <>
            <Text size="sm" c="dimmed" mb="sm">
              {mayuscula(fechaLarga(new Date(selectedClass.starts_at)))} ·{" "}
              {selectedClass.coach ? (nombreCorto(selectedClass.coach_name) ?? coachName(selectedClass.coach)) : "sin coach"} ·{" "}
              <strong>
                {selectedClass.reserved_count}/{selectedClass.capacity} reservados
              </strong>
              {" · "}
              {(checkins.data ?? []).length} presentes
            </Text>
            {/* Una clase que ya inició es de solo asistencia: no se le cambia el
                coach, no se cancela ni se elimina. */}
            {!iniciada && selectedClass.status !== "cancelled" && (
              <Group gap="xs" mb="md">
                <Button size="xs" variant="light" onClick={() => setEditing(selectedClass)}>
                  {selectedClass.coach ? "Cambiar coach" : "Asignar coach"}
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="orange"
                  loading={cancelClass.isPending}
                  onClick={() =>
                    cancelClass.mutate(selectedClass.id, {
                      onSuccess: () => ok("Clase cancelada. Se avisó a los atletas reservados."),
                      onError: (error) => fail(error, "No se pudo cancelar la clase."),
                    })
                  }
                >
                  Cancelar clase
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  loading={deleteClass.isPending}
                  onClick={() => onDeleteClass(selectedClass)}
                >
                  Eliminar
                </Button>
              </Group>
            )}
          </>
        )}
        {/* Registrar asistencia SOLO dentro de la ventana (ni pasadas ni futuras). */}
        {asistenciaAbierta ? (
          <>
            {selectedClassId && <ClassQrBlock gymId={gymId} classId={selectedClassId} />}
            <Title order={5} mt="md" mb="xs">
              Marcar presente
            </Title>
            {selectedClassId && <RecepcionBuscador gymId={gymId} classId={selectedClassId} />}
          </>
        ) : (
          <Text size="sm" c="dimmed">
            {selectedClass && now < startMs(selectedClass) - 30 * 60 * 1000
              ? "La asistencia abre 30 min antes de la clase."
              : "La asistencia de esta clase ya cerró."}
          </Text>
        )}
        <Group mt="md" mb="xs" gap="xs" align="baseline" wrap="wrap">
          <Title order={5}>Presentes ({(checkins.data ?? []).length})</Title>
          {visitantes > 0 && (
            <Badge color="cyan" variant="light">
              {visitantes} con drop-in
            </Badge>
          )}
        </Group>
        {/* Un fallo de carga decía "sin check-ins": el gym asumía ausencias que sí
            estaban registradas. */}
        {checkins.isError ? (
          <PageError
            message="No se pudo cargar la asistencia de esta clase."
            onRetry={() => checkins.refetch()}
          />
        ) : (checkins.data ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">
            Nadie todavía.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Atleta</Table.Th>
                <Table.Th>Acceso</Table.Th>
                <Table.Th>Hora</Table.Th>
                <Table.Th>Método</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(checkins.data ?? []).map((checkin) => (
                <Table.Tr key={checkin.id}>
                  <Table.Td>{checkin.athlete_name}</Table.Td>
                  <Table.Td>
                    {/* Sin membresía en el check-in = entró con un pase drop-in. */}
                    {checkin.membership ? (
                      <Badge color="gray" variant="light">
                        Socio
                      </Badge>
                    ) : (
                      <Badge color="cyan" variant="light">
                        Drop-in
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {new Date(checkin.checked_in_at).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}
                  </Table.Td>
                  <Table.Td>{label(CHECKIN_METHOD, checkin.method)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>
    </GlassCard>
  );
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Próximas + pasadas en una sola lista, sin repetir una clase que venga en las dos. */
function useMemoClases(proximas: ClassRow[] | undefined, pasadas: ClassRow[] | undefined): ClassRow[] {
  return useMemo(() => {
    const porId = new Map<string, ClassRow>();
    for (const c of [...(pasadas ?? []), ...(proximas ?? [])]) porId.set(c.id, c);
    return [...porId.values()];
  }, [proximas, pasadas]);
}

/**
 * Recepción: buscar a la persona y marcarla presente sin salir de la clase.
 *
 * Sustituye al selector que listaba TODO el padrón activo, que tenía dos huecos
 * de operación: no incluía al visitante con pase drop-in (el gym le cobraba y no
 * le quedaba registro de que entró) y no decía nada de la persona — ni si ya
 * había reservado esta clase, ni si ya estaba marcada, ni por qué el backend le
 * iba a negar el acceso. Se enteraba después de apretar el botón.
 *
 * Va contra `/gym/{id}/access/search`, la misma puerta que lee el QR, así que la
 * ficha y las reglas son idénticas a las del escaneo: el botón habilitado no
 * miente porque el backend calcula el permiso con `validar_acceso`, el mismo que
 * usa la escritura. El panel no elige qué pase se consume — eso sería mover una
 * regla de negocio al cliente.
 *
 * Se exporta para poder probarlo suelto: vive dentro del modal de asistencia, al
 * que sólo se llega por una celda de `mantine-datatable`, y esas no se pintan
 * bajo jsdom.
 */
export function RecepcionBuscador({ gymId, classId }: { gymId: string; classId: string }) {
  const [texto, setTexto] = useState("");
  const busqueda = useAccessSearch(gymId, texto, classId);
  const admitir = useAccessAdmit(gymId, classId);
  const [admitiendo, setAdmitiendo] = useState("");

  const onAdmitir = async (athleteId: string, nombre: string) => {
    setAdmitiendo(athleteId);
    try {
      const r = await admitir.mutateAsync({ athleteId });
      // El backend contesta 201 también cuando el pase ya se había consumido:
      // decir "listo" a secas haría creer que se le gastó una entrada de más.
      ok(
        r.already_registered
          ? `${nombre} ya estaba marcado presente.`
          : `${nombre}: asistencia registrada.`,
      );
    } catch (error) {
      // Marcar dos veces al mismo es 400 `checkin_duplicate`, y NO es un fallo:
      // la persona está adentro, que es lo que recepción quería. Pintarlo en rojo
      // haría que el operador lo reintentara buscando un error que no existe.
      const code = (error as AxiosError<{ code?: string }>)?.response?.data?.code;
      if (code === "checkin_duplicate") ok(`${nombre} ya estaba marcado presente.`);
      else fail(error, `No se pudo marcar presente a ${nombre}.`);
    } finally {
      setAdmitiendo("");
    }
  };

  const resultados = busqueda.data?.results ?? [];
  const corto = texto.trim().length > 0 && texto.trim().length < 2;

  return (
    <>
      <TextInput
        label="Buscar a quien llegó"
        placeholder="Nombre o últimos dígitos del teléfono"
        value={texto}
        onChange={(e) => setTexto(e.currentTarget.value)}
      />
      {corto && (
        <Text size="xs" c="dimmed" mt={6}>
          Escribe al menos dos letras.
        </Text>
      )}
      {busqueda.isError && (
        <Text size="sm" c="red" mt="xs">
          {/* Sin esto una búsqueda caída se ve idéntica a "no existe esa persona"
              y recepción concluye que el atleta no es del gimnasio. */}
          No se pudo buscar. Reintenta o usa el QR de la clase.
        </Text>
      )}
      {!busqueda.isError && !corto && texto.trim().length >= 2 && (
        <Stack gap="xs" mt="sm">
          {busqueda.isFetching && resultados.length === 0 && (
            <Text size="sm" c="dimmed">
              Buscando…
            </Text>
          )}
          {!busqueda.isFetching && resultados.length === 0 && (
            <Text size="sm" c="dimmed">
              Nadie con ese nombre tiene relación con este gimnasio. Si viene de otro box, véndele
              un pase drop-in.
            </Text>
          )}
          {resultados.map((r) => {
            const atleta = r.athlete;
            if (!atleta) return null;
            const accion = r.actions.find((a) => a.action === "class_checkin" && a.via === "admit");
            const vender = r.actions.find((a) => a.action === "sell_dropin");
            const yaPresente = r.gym_class?.already_checked_in === true;
            const reservo = r.gym_class?.reserved_by_athlete === true;
            return (
              <Card key={atleta.id} padding="sm">
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Avatar src={atleta.photo} color="flame" radius="xl" size={38}>
                      {atleta.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600}>
                        {atleta.name}
                      </Text>
                      <Group gap={6} wrap="wrap" mt={2}>
                        <Badge size="xs" variant="light" color={r.relationship?.is_member ? "gray" : "cyan"}>
                          {r.relationship?.label ?? "Sin relación"}
                        </Badge>
                        {reservo && (
                          <Badge size="xs" variant="light" color="teal">
                            Reservó
                          </Badge>
                        )}
                        {yaPresente && (
                          <Badge size="xs" variant="light" color="teal">
                            Ya presente
                          </Badge>
                        )}
                        {r.phone_hint && (
                          <Text size="xs" c="dimmed">
                            {r.phone_hint}
                          </Text>
                        )}
                      </Group>
                      {/* El motivo del rechazo lo redacta el backend: repetirlo
                          aquí en otras palabras las desincronizaría. */}
                      {accion && !accion.enabled && accion.reason_message && (
                        <Text size="xs" c="dimmed" mt={4}>
                          {accion.reason_message}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <Group gap="xs">
                    {vender && (
                      <Tooltip label="No es socio: necesita comprar un pase drop-in desde el app de Nucleo." withinPortal>
                        <Badge variant="light" color="orange">
                          Requiere pase
                        </Badge>
                      </Tooltip>
                    )}
                    <Button
                      size="xs"
                      disabled={!accion?.enabled || yaPresente}
                      loading={admitir.isPending && admitiendo === atleta.id}
                      onClick={() => onAdmitir(atleta.id, atleta.name)}
                    >
                      {yaPresente ? "Presente" : "Marcar presente"}
                    </Button>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </>
  );
}

/** QR único de la clase: el coach lo muestra y los atletas lo escanean para su check-in. */
function ClassQrBlock({ gymId, classId }: { gymId: string; classId: string }) {
  const qr = useClassQr(gymId, classId);
  if (qr.isLoading) return <Text c="dimmed" size="sm">Generando QR…</Text>;
  if (!qr.data) return <Text c="dimmed" size="sm">No se pudo generar el QR.</Text>;
  return (
    <Group align="center" gap="lg">
      {/* Única superficie opaca de la pantalla: el QR necesita blanco para que
          la cámara del atleta lo lea. */}
      <div
        style={{
          background: "#fff",
          padding: "calc(14 * var(--u))",
          borderRadius: "var(--a-r-control)",
        }}
      >
        <QRCode value={qr.data.qr_token} size={140} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SectionLabel mb={4}>Check-in</SectionLabel>
        <Text fw={600}>QR de asistencia</Text>
        <Text c="dimmed" size="sm">
          Los atletas lo escanean desde su app para registrar su asistencia. El código pertenece a esta clase.
        </Text>
        <Text c="dimmed" size="xs" mt={6} style={{ wordBreak: "break-all" }}>
          Token: {qr.data.qr_token}
        </Text>
      </div>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// WOD del día + board
// ---------------------------------------------------------------------------
function EditScheduleModal({
  schedule,
  coachOptions,
  saving,
  removing,
  onClose,
  onSave,
  onRemove,
  onCopy,
}: {
  schedule: ClassSchedule | null;
  coachOptions: { value: string; label: string }[];
  saving: boolean;
  removing: boolean;
  onClose: () => void;
  onSave: (body: Partial<ClassSchedule>) => Promise<void>;
  onRemove: () => void;
  onCopy: (s: ClassSchedule) => void;
}) {
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (schedule && hydratedFor !== schedule.id) {
    setHydratedFor(schedule.id);
    setStartTime(schedule.start_time.slice(0, 5));
    setDuration(schedule.duration_min);
    setCapacity(schedule.capacity);
    setCoachId(schedule.default_coach ?? null);
  }

  const titulo = schedule
    ? `${schedule.service_type_name} · ${weekdayLabel(schedule.weekday)} ${schedule.start_time.slice(0, 5)}`
    : "";

  return (
    <Modal opened={!!schedule} onClose={onClose} title={titulo} centered>
      {schedule && (
        <Text size="sm" c="dimmed" mb="md">
          {schedule.is_open_ended ? "Se repite cada semana, sin fecha de fin." : `Se repite cada semana hasta el ${schedule.valid_until}.`}
        </Text>
      )}
      <Select
        label="Coach"
        placeholder="Sin asignar"
        clearable
        searchable
        value={coachId}
        onChange={setCoachId}
        data={coachOptions}
        mb="sm"
      />
      <TimeInput label="Hora" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} mb="sm" />
      <Group grow mb="lg">
        <NumberInput label="Minutos" value={duration} onChange={setDuration} min={15} max={300} />
        <NumberInput label="Cupo" value={capacity} onChange={setCapacity} min={1} max={200} />
      </Group>
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="xs">
          <Button variant="subtle" color="red" loading={removing} onClick={onRemove}>
            Quitar del horario
          </Button>
          {schedule && (
            <Button variant="subtle" onClick={() => onCopy(schedule)}>
              Copiar a otros días
            </Button>
          )}
        </Group>
        <Group gap="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={() =>
              onSave({
                start_time: startTime,
                duration_min: Number(duration),
                capacity: Number(capacity),
                default_coach: coachId,
              } as Partial<ClassSchedule>)
            }
          >
            Guardar
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}

function WodTab({ gymId }: { gymId: string }) {
  const hoy = iso(new Date());
  const services = useServiceTypes(gymId);
  const update = useUpdateWod(gymId);
  const remove = useDeleteWod(gymId);
  const [openBoard, setOpenBoard] = useState<Wod | null>(null);
  const [editing, setEditing] = useState<Wod | null>(null);
  // La fecha que se está programando (abre el editor); null = cerrado.
  const [programando, setProgramando] = useState<string | null>(null);

  const [lunes, setLunes] = useState<Date>(() => lunesDe(new Date()));
  const desde = isoLocal(lunes);
  const hasta = isoLocal(sumarDias(lunes, 6));
  const semana = useWodsRango(gymId, desde, hasta);

  const wodServices = useMemo(
    () => ((services.data ?? []) as ServiceType[]).filter((s) => s.requires_wod),
    [services.data],
  );
  // Programa elegido; "" = General. Mientras no se elija, el primero con workout.
  const [elegido, setElegido] = useState<string | null>(null);
  const programa = elegido ?? wodServices[0]?.id ?? "";

  if (semana.isError) return <PageError onRetry={() => semana.refetch()} />;

  const onPublicar = (w: Wod) => {
    // Despublicar esconde el workout a todo el box: se confirma (Vertikal lo
    // «pausó» sin querer al ir a editarlo).
    if (
      w.published &&
      !window.confirm(
        "¿Despublicar este workout? Los atletas dejan de verlo y no pueden subir su score hasta que lo vuelvas a publicar.",
      )
    )
      return;
    update.mutate(
      { id: w.id, body: { published: !w.published } },
      {
        // Publicar es lo que la hace visible en el app: si fallaba en silencio,
        // el gym creía haberla publicado.
        onSuccess: () => ok(w.published ? "Workout despublicado." : "Workout publicado."),
        onError: (error) => fail(error, "No se pudo cambiar la publicación."),
      },
    );
  };

  const onEliminar = (w: Wod) => {
    const cuando = fechaLarga(deIso(w.date));
    if (!window.confirm(`¿Eliminar el workout del ${cuando}?`)) return;
    remove.mutate(w.id, {
      onSuccess: () => ok(`Workout del ${cuando} eliminado.`),
      onError: (error) => fail(error, "No se pudo eliminar el workout."),
    });
  };

  const opcionesPrograma = [
    ...wodServices.map((s) => ({ value: s.id, label: s.name })),
    { value: "", label: "General (todo el gimnasio)" },
  ];
  const semanaRows = (semana.data ?? []) as Wod[];
  // De hoy en adelante, lunes a sábado: los días que todavía se pueden programar.
  const porProgramar = diasDeSemana(lunes)
    .slice(0, 6)
    .map(isoLocal)
    .filter((f) => f >= hoy && !wodDelDia(semanaRows, f, programa));
  const esEstaSemana = desde === isoLocal(lunesDe(new Date()));

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Workout"
        avisos={
          !semana.isLoading &&
          porProgramar.length > 0 && (
            <Badge color="yellow" variant="light">
              {porProgramar.length} {porProgramar.length === 1 ? "día sin workout" : "días sin workout"}
            </Badge>
          )
        }
      >
        <Select
          aria-label="Programa"
          data={opcionesPrograma}
          value={programa}
          onChange={(v) => setElegido(v ?? "")}
          allowDeselect={false}
          w={{ base: "100%", sm: 200 }}
        />
        <Group gap={4} wrap="nowrap">
          <Button variant="default" size="xs" px={8} onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior">
            ‹
          </Button>
          <Button variant="default" size="xs" onClick={() => setLunes(lunesDe(new Date()))} disabled={esEstaSemana}>
            {esEstaSemana ? rangoDeSemana(lunes) : "Esta semana"}
          </Button>
          <Button variant="default" size="xs" px={8} onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente">
            ›
          </Button>
        </Group>
        <Button onClick={() => setProgramando(porProgramar[0] ?? hoy)}>Programar</Button>
      </Encabezado>
      {!esEstaSemana && (
        <Text size="sm" c="dimmed" mb="sm">
          Semana del {rangoDeSemana(lunes)}
        </Text>
      )}

      <SemanaWods
        wods={semanaRows}
        lunes={lunes}
        programa={programa}
        hoy={hoy}
        cargando={semana.isLoading}
        ocupado={update.isPending || remove.isPending}
        etiquetaScore={scoreCorto}
        onProgramar={setProgramando}
        onEditar={setEditing}
        onBoard={setOpenBoard}
        onPublicar={onPublicar}
        onEliminar={onEliminar}
      />

      <NuevoWodModal
        gymId={gymId}
        fecha={programando}
        programa={programa}
        opcionesPrograma={opcionesPrograma}
        onClose={() => setProgramando(null)}
        onCreado={(fecha) => setLunes(lunesDe(deIso(fecha)))}
        onEditar={(w) => {
          setProgramando(null);
          setEditing(w);
        }}
      />
      <BoardModal gymId={gymId} wod={openBoard} onClose={() => setOpenBoard(null)} />
      {/* De la lista viva, no de la foto que se tomó al tocar «Editar»: así el
          conteo de scores de cada bloque (que bloquea quitarlo) está al día. */}
      <EditWodModal
        gymId={gymId}
        wod={editing ? (semanaRows.find((r) => r.id === editing.id) ?? editing) : null}
        onClose={() => setEditing(null)}
      />
    </GlassCard>
  );
}

/** Programar el workout de un día: se arma por bloques, a mano o pegando el texto. */
function NuevoWodModal({
  gymId,
  fecha,
  programa: programaInicial,
  opcionesPrograma,
  onClose,
  onCreado,
  onEditar,
}: {
  gymId: string;
  fecha: string | null;
  programa: string;
  opcionesPrograma: { value: string; label: string }[];
  onClose: () => void;
  onCreado: (fecha: string) => void;
  onEditar: (w: Wod) => void;
}) {
  const create = useCreateWod(gymId);
  const [date, setDate] = useState<Date | null>(null);
  const [programa, setPrograma] = useState("");
  const [texto, setTexto] = useState("");
  const [partes, setPartes] = useState<ParteBorrador[]>([]);
  const [published, setPublished] = useState(true);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const dateStr = iso(date);
  // El del día elegido, para no ofrecer crear uno que ya existe.
  const delDia = useWods(gymId, dateStr);

  if (fecha && hydratedFor !== fecha) {
    setHydratedFor(fecha);
    setDate(deIso(fecha));
    setPrograma(programaInicial);
    setTexto("");
    setPartes([]);
    setPublished(true);
  }
  if (!fecha && hydratedFor) setHydratedFor(null);

  const existente = date && dateStr ? wodDelDia((delDia.data ?? []) as Wod[], dateStr, programa) : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || partes.length === 0) return;
    const errorBloques = errorDePartes(partes);
    if (errorBloques) {
      notifications.show({ color: "red", message: errorBloques });
      return;
    }
    try {
      // Sin título ni descripción: cada bloque trae los suyos y el backend le
      // pone al workout el nombre de su día. El score lo da el bloque principal.
      await create.mutateAsync({
        service_type: programa || null,
        date: dateStr,
        published,
        parts: partesParaGuardar(partes, false),
      });
      ok(published ? "Workout publicado." : "Workout guardado como borrador.");
      onCreado(dateStr);
      onClose();
    } catch (error) {
      fail(error, "No se pudo crear el workout.");
    }
  };

  return (
    <Modal opened={!!fecha} onClose={onClose} title={date ? `Workout · ${fechaLarga(date)}` : "Workout"} size="xl" centered>
      <form onSubmit={submit}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <DateInput
            label="Fecha"
            value={date}
            onChange={setDate}
            valueFormat="YYYY-MM-DD"
            popoverProps={{ withinPortal: true }}
          />
          <Select
            label="Programa"
            data={opcionesPrograma}
            value={programa}
            onChange={(v) => setPrograma(v ?? "")}
            allowDeselect={false}
          />
        </SimpleGrid>

        {existente ? (
          <Alert color="blue" variant="light" mt="md">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Text size="sm">Este día ya tiene workout.</Text>
              <Button size="xs" onClick={() => onEditar(existente)}>
                Editar
              </Button>
            </Group>
          </Alert>
        ) : (
          <>
            <Textarea
              label="Pega el workout (opcional)"
              placeholder={"Warmup\n3 Sets\n200M Jog\n\nCustom Metcon (Tiempo)\nFor Time\n100 Ring Rows"}
              value={texto}
              onChange={(e) => setTexto(e.currentTarget.value)}
              mt="md"
              autosize
              minRows={3}
              maxRows={12}
            />
            <ArmarBloquesDesdeTexto
              gymId={gymId}
              description={texto}
              partes={partes}
              onAplicar={(d, p) => {
                setTexto(d);
                setPartes(p);
              }}
            />
            <Divider my="md" label="Bloques" labelPosition="left" />
            <WodPartsEditor partes={partes} onChange={setPartes} scoreTypes={SCORE_TYPES} />
            <Group justify="space-between" mt="md" wrap="wrap" gap="sm">
              <Switch label="Publicar ya" checked={published} onChange={(e) => setPublished(e.currentTarget.checked)} />
              <Group gap="sm">
                <Button variant="default" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" loading={create.isPending} disabled={!date || partes.length === 0}>
                  {published ? "Publicar workout" : "Guardar borrador"}
                </Button>
              </Group>
            </Group>
          </>
        )}
      </form>
    </Modal>
  );
}

/**
 * Editar un workout ya creado: sus bloques. Es donde un workout de antes (un
 * solo texto, un solo score) se parte en Warmup / Weightlifting / Metcon.
 */
function EditWodModal({ gymId, wod, onClose }: { gymId: string; wod: Wod | null; onClose: () => void }) {
  const titulo = wod
    ? `Editar · ${wod.service_type_name || "General"} · ${fechaLarga(deIso(wod.date))}`
    : "";
  return (
    <Modal opened={!!wod} onClose={onClose} title={titulo} size="xl" centered>
      {/* `key`: el formulario renace con cada workout en vez de arrastrar el anterior. */}
      {wod ? <EditWodForm key={wod.id} gymId={gymId} wod={wod} onClose={onClose} /> : null}
    </Modal>
  );
}

function EditWodForm({ gymId, wod, onClose }: { gymId: string; wod: Wod; onClose: () => void }) {
  const update = useUpdateWod(gymId);
  // Un workout de antes de los bloques trae todo en su descripción: se ofrece en
  // la caja para armar los bloques desde ahí, y lo que quede en ella se guarda
  // como su descripción (para que el app no repita el texto encima de los bloques).
  const teniaDescripcion = !!wod.description?.trim();
  const [texto, setTexto] = useState(wod.description ?? "");
  const [partes, setPartes] = useState<ParteBorrador[]>(() => partesParaEditar(wod));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const errorBloques = errorDePartes(partes);
    if (errorBloques) {
      notifications.show({ color: "red", message: errorBloques });
      return;
    }
    const parts = partesParaGuardar(partes, tienePartes(wod));
    try {
      await update.mutateAsync({
        id: wod.id,
        body: { ...(teniaDescripcion ? { description: texto } : {}), ...(parts ? { parts } : {}) },
      });
      ok("Workout actualizado.");
      onClose();
    } catch (error) {
      fail(error, "No se pudo guardar el workout.");
    }
  };

  return (
    <form onSubmit={guardar}>
      <Textarea
        label={teniaDescripcion ? "Texto del workout" : "Pega el workout"}
        description={
          teniaDescripcion
            ? "Este workout es de antes de los bloques. Presiona «Armar bloques desde el texto» para pasarlo a bloques."
            : "Opcional. Pega la rutina y presiona «Armar bloques desde el texto» para reemplazar los bloques."
        }
        value={texto}
        onChange={(e) => setTexto(e.currentTarget.value)}
        autosize
        minRows={2}
        maxRows={14}
      />
      <ArmarBloquesDesdeTexto
        gymId={gymId}
        description={texto}
        partes={partes}
        onAplicar={(d, p) => {
          setTexto(d);
          setPartes(p);
        }}
      />
      {!tienePartes(wod) && wod.results_count > 0 ? (
        <Alert color="yellow" mt="sm">
          Este workout ya tiene {wod.results_count} scores. Si lo partes en bloques, esos scores quedan en el
          bloque principal.
        </Alert>
      ) : null}
      <Divider my="md" label="Bloques del día" labelPosition="left" />
      <WodPartsEditor partes={partes} onChange={setPartes} scoreTypes={SCORE_TYPES} />
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={update.isPending}>
          Guardar
        </Button>
      </Group>
    </form>
  );
}

function BoardModal({ gymId, wod, onClose }: { gymId: string; wod: Wod | null; onClose: () => void }) {
  const memberships = useMemberships(gymId);
  const classes = useGymClasses(gymId);
  const [classId, setClassId] = useState<string | null>(null);
  // Con bloques, cada uno con score tiene su board: se elige cuál se mira y a cuál
  // va el resultado. Sin bloques hay uno solo y el selector no aparece.
  const bloques = wod ? bloquesConScore(wod) : [];
  const [partKey, setPartKey] = useState<string | null>(null);
  const bloque = bloques.find((b) => b.key === partKey) ?? bloques[0];
  const board = useWodBoard(gymId, wod?.id ?? "", classId ?? undefined, bloque?.partId);
  const addResult = useAddWodResult(gymId, wod?.id ?? "");
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [scaling, setScaling] = useState("rx");
  const [sets, setSets] = useState<number | string>("");
  const [reps, setReps] = useState<number | string>("");
  const [error, setError] = useState("");
  // En la fuerza el peso solo no decía qué se hizo: «105 · 5×2». No rankean.
  const esCarga = (bloque?.scoreType ?? wod?.score_type) === "load";

  const athleteOptions = (memberships.data ?? [])
    .filter((m) => !!m.status && ["active", "trial"].includes(m.status))
    .map((m) => ({ value: m.athlete, label: m.athlete_name }));

  // Clases del mismo día y servicio que el WOD: permiten ver el board por clase.
  const classOptions = ((classes.data ?? []) as (GymClass & ClassCoachFields)[])
    .filter(
      (c) =>
        wod &&
        c.starts_at.slice(0, 10) === wod.date &&
        (!wod.service_type || c.service_type === wod.service_type),
    )
    .map((c) => ({
      value: c.id,
      label: new Date(c.starts_at).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
    }));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!athleteId || !score.trim()) return;
    try {
      await addResult.mutateAsync({
        athlete_id: athleteId,
        raw_score: score.trim(),
        scaling,
        gym_class_id: classId,
        ...(bloque?.partId ? { part_id: bloque.partId } : {}),
        ...(esCarga ? { sets: enteroDe(sets), reps: enteroDe(reps) } : {}),
      });
      setScore("");
      setSets("");
      setReps("");
    } catch (err) {
      const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
      setError(detail ?? "No se pudo registrar el resultado.");
    }
  };

  return (
    <Modal opened={!!wod} onClose={onClose} title={wod ? `Board · ${wod.title}` : ""} size="lg" centered>
      {bloques.length > 1 ? (
        <SegmentedControl
          fullWidth
          mb="md"
          value={bloque?.key ?? ""}
          onChange={setPartKey}
          data={bloques.map((b) => ({ value: b.key, label: b.titulo }))}
        />
      ) : null}
      <Group align="flex-end" gap="sm" component="form" onSubmit={add} mb="md">
        <Select
          label="Atleta"
          placeholder="Selecciona"
          data={athleteOptions}
          value={athleteId}
          onChange={setAthleteId}
          searchable
          w={{ base: "100%", sm: 220 }}
        />
        <TextInput
          label="Score"
          placeholder={(bloque?.scoreType ?? wod?.score_type) === "for_time" ? "3:21" : "120"}
          value={score}
          onChange={(e) => setScore(e.currentTarget.value)}
          w={{ base: "100%", sm: 120 }}
        />
        {esCarga ? (
          <>
            <NumberInput
              label="Rondas"
              placeholder="5"
              value={sets}
              onChange={setSets}
              min={1}
              max={99}
              allowDecimal={false}
              w={{ base: "48%", sm: 80 }}
            />
            <NumberInput
              label="Reps"
              placeholder="2"
              value={reps}
              onChange={setReps}
              min={1}
              max={99}
              allowDecimal={false}
              w={{ base: "48%", sm: 80 }}
            />
          </>
        ) : null}
        <Select label="Modalidad" data={SCALINGS} value={scaling} onChange={(v) => setScaling(v ?? "rx")} w={{ base: "100%", sm: 140 }} />
        <Button type="submit" loading={addResult.isPending} disabled={!athleteId || !score.trim()}>
          Registrar
        </Button>
      </Group>
      {error && (
        <Text c="red" size="sm" mb="sm">
          {error}
        </Text>
      )}
      {classOptions.length > 1 && (
        <Select
          label="Board por clase"
          placeholder="Todas las clases del día"
          clearable
          data={classOptions}
          value={classId}
          onChange={setClassId}
          w={{ base: "100%", sm: 240 }}
          mb="sm"
        />
      )}
      {board.isLoading ? (
        <PageLoading />
      ) : !(board.data ?? []).length ? (
        <Text c="dimmed" size="sm">
          Aún no hay resultados en el board.
        </Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={50}>#</Table.Th>
              <Table.Th>Atleta</Table.Th>
              <Table.Th>Score</Table.Th>
              <Table.Th>Modalidad</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(board.data ?? []).map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  {/* Podio con medallas: el emoji comunica el rango de un vistazo. */}
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </Table.Td>
                <Table.Td>{r.athlete_name}</Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Text fw={600}>{r.raw_score}</Text>
                    {textoRondas(r) ? (
                      <Text size="sm" c="dimmed">
                        {textoRondas(r)}
                      </Text>
                    ) : null}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={r.scaling === "rx" || r.scaling === "rx_plus" ? "flame" : "gray"}>
                    {NOMBRE_SCALING[r.scaling] ?? r.scaling}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Modal>
  );
}

type CoachOpt = { staff_role: string; name: string; email: string; pay_type: "per_class" | "fixed" };

function AssignCoachModal({
  gymClass,
  gymId,
  coaches,
  onClose,
  onSave,
  saving,
}: {
  gymClass: ClassRow | null;
  gymId: string;
  coaches: CoachOpt[];
  onClose: () => void;
  onSave: (body: {
    coach: string | null;
    assignment_lead_min: number;
    pay_extra: boolean;
    extra_amount: string | number;
  }) => Promise<void>;
  saving: boolean;
}) {
  const [coach, setCoach] = useState<string | null>(null);
  const [lead, setLead] = useState<number | string>(60);
  const [payExtra, setPayExtra] = useState(false);
  const [extra, setExtra] = useState<number | string>(0);
  const [recado, setRecado] = useState("");
  const [error, setError] = useState("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const invitar = useInviteCoachToClass(gymId);

  // Prefill cuando se abre con una clase distinta.
  if (gymClass && hydratedFor !== gymClass.id) {
    setHydratedFor(gymClass.id);
    setCoach(gymClass.coach ?? null);
    setLead(gymClass.assignment_lead_min ?? 60);
    setPayExtra(gymClass.pay_extra ?? false);
    setExtra(gymClass.extra_amount ?? 0);
    setRecado("");
    setError("");
  }

  const selectedFixed = coaches.find((c) => c.staff_role === coach)?.pay_type === "fixed";
  // Ofrecer sólo tiene sentido si la clase está libre y hay alguien elegido: con
  // coach puesto, cambiarlo es asignar, no preguntar.
  const puedeInvitar = !!gymClass && !gymClass.coach && !!coach;

  const save = async () => {
    setError("");
    try {
      await onSave({
        coach,
        assignment_lead_min: Number(lead),
        pay_extra: selectedFixed ? payExtra : false,
        extra_amount: selectedFixed && payExtra ? extra : 0,
      });
    } catch (e) {
      const detail = (e as AxiosError<{ detail?: string }>).response?.data?.detail;
      setError(detail ?? "No se pudo guardar.");
    }
  };

  const ofrecer = async () => {
    if (!gymClass || !coach) return;
    setError("");
    try {
      await invitar.mutateAsync({ classId: gymClass.id, coachId: coach, message: recado });
      notifications.show({
        color: "teal",
        message: "Invitación enviada. La clase queda libre hasta que el coach acepte.",
      });
      onClose();
    } catch (e) {
      const detail = (e as AxiosError<{ detail?: string }>).response?.data?.detail;
      setError(detail ?? "No se pudo enviar la invitación.");
    }
  };

  return (
    <Modal opened={!!gymClass} onClose={onClose} title="Coach de la clase" centered>
      <Select
        label="Coach asignado"
        placeholder="Sin asignar"
        clearable
        searchable
        value={coach}
        onChange={setCoach}
        data={coaches.map((c) => ({ value: c.staff_role, label: c.name || c.email }))}
        mb="sm"
      />
      <NumberInput
        label="Tiempo límite de asignación (min antes del inicio)"
        value={lead}
        onChange={setLead}
        min={0}
        max={1440}
        mb="sm"
      />
      {selectedFixed && (
        <>
          <Switch
            label="Pagar esta clase como extra (coach de salario fijo)"
            checked={payExtra}
            onChange={(e) => setPayExtra(e.currentTarget.checked)}
            mb="sm"
          />
          {payExtra && (
            <NumberInput label="Monto extra" prefix="Q" value={extra} onChange={setExtra} min={0} decimalScale={2} mb="sm" />
          )}
        </>
      )}
      {/* Preguntar en vez de imponer. Poner a alguien en el horario no es lo
          mismo que acordarlo con él: el coach puede no poder ese día, y que se
          entere cuando la clase ya está en su agenda es como se quedan las
          clases sin dar. Ofrecer la deja libre hasta que él acepte, y si dice
          que no, te llega el aviso a tiempo de repartirla. */}
      {puedeInvitar && (
        <>
          <Divider my="sm" label="o pregúntale primero" labelPosition="center" />
          <TextInput
            label="Recado para el coach (opcional)"
            placeholder="¿Puedes con esta?"
            value={recado}
            onChange={(e) => setRecado(e.currentTarget.value)}
            mb="sm"
          />
          <Button
            variant="light"
            fullWidth
            loading={invitar.isPending}
            onClick={ofrecer}
            mb="sm"
          >
            Ofrecerle la clase (decide él)
          </Button>
        </>
      )}
      {error && (
        <Text c="red" size="sm" mb="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} loading={saving}>
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}
