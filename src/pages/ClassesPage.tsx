import { FormEvent, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  ColorInput,
  FileInput,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
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
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import QRCode from "react-qr-code";
import { AxiosError } from "axios";
import {
  useAddWodResult,
  useCancelClass,
  useClassCheckins,
  useClassQr,
  useCreateDropinProduct,
  useCreateSchedule,
  useCreateServiceType,
  useCreateWod,
  useDeactivateDropinProduct,
  useDeleteClass,
  useDeleteSchedule,
  useDeleteServiceType,
  useGymDropinProducts,
  useDeleteWod,
  useGymCoaches,
  useGymClasses,
  useGymConfig,
  useGymPastClasses,
  useMaterializeSchedules,
  useMemberships,
  useReceptionCheckin,
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
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { Money, PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { CLASS_STATUS, label } from "../lib/labels";
import { sortRecords } from "../lib/sortRecords";

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

const SCALINGS = [
  { value: "rx", label: "RX" },
  { value: "scaled", label: "Scaled" },
  { value: "foundations", label: "Foundations" },
];

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

/** GymClass del schema + los campos del sprint de coaches. */
type ClassRow = GymClass & ClassCoachFields;

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        kicker="Operación · Programación"
        title="Clases y rutinas"
        subtitle="Define servicios, arma el horario semanal, registra asistencia y publica la rutina del día."
      />
      <Tabs defaultValue="schedule">
        <Tabs.List mb="lg">
          <Tabs.Tab value="services">Servicios</Tabs.Tab>
          <Tabs.Tab value="schedule">Horario semanal</Tabs.Tab>
          <Tabs.Tab value="classes">Clases</Tabs.Tab>
          <Tabs.Tab value="wod">Rutina</Tabs.Tab>
          <Tabs.Tab value="dropins">Drop-ins / Pases</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="services">
          <ServicesTab gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="schedule">
          <ScheduleTab gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="classes">
          <ClassesTab gymId={gymId} />
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
  const deactivate = useDeactivateDropinProduct(gymId);

  const [type, setType] = useState<DropinType>("one_class");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [error, setError] = useState("");

  const rows = (products.data ?? []) as DropinProduct[];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (price === "" || Number(price) < 0) {
      setError("Ingresa un precio válido.");
      return;
    }
    try {
      await create.mutateAsync({ type, name: name.trim(), price: String(price) });
      setName("");
      setPrice("");
    } catch {
      setError("No se pudo crear el pase.");
    }
  };

  if (products.isLoading) return <PageLoading />;
  if (products.isError) return <PageError onRetry={() => products.refetch()} />;

  return (
    <div>
      <Card withBorder mb="lg">
        <Title order={4} mb={4}>
          Nuevo pase
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Define los pases que ofreces. El acceso es de una entrada dentro de su ventana
          (una clase ≈ 24 h, un día, una semana). Nucleo suma su recargo al precio en el cobro.
        </Text>
        <form onSubmit={submit}>
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Select
              label="Tipo"
              data={DROPIN_TYPES}
              value={type}
              onChange={(v) => setType((v ?? "one_class") as DropinType)}
              allowDeselect={false}
            />
            <TextInput
              label="Nombre (opcional)"
              placeholder="Pase de día"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <NumberInput
              label="Precio (Q)"
              min={0}
              value={price}
              onChange={(v) => setPrice(typeof v === "number" ? v : "")}
            />
            <Button type="submit" mt={{ base: 0, sm: 25 }} loading={create.isPending}>
              Agregar
            </Button>
          </SimpleGrid>
          {error ? (
            <Alert color="red" mt="sm">
              {error}
            </Alert>
          ) : null}
        </form>
      </Card>

      {rows.length === 0 ? (
        <Text c="dimmed">Aún no ofreces pases drop-in. Crea uno arriba.</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th ta="right">Precio</Table.Th>
              <Table.Th>Activo</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>{p.type_label ?? dropinTypeLabel(p.type)}</Table.Td>
                <Table.Td>{p.name || "—"}</Table.Td>
                <Table.Td ta="right"><Money value={p.price} decimals={2} /></Table.Td>
                <Table.Td>
                  <Switch
                    checked={p.is_active}
                    onChange={(e) =>
                      update.mutate({ id: p.id, body: { is_active: e.currentTarget.checked } })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  {p.is_active ? (
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => deactivate.mutate(p.id)}
                      loading={deactivate.isPending}
                    >
                      Desactivar
                    </Button>
                  ) : null}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Servicios (catálogo)
// ---------------------------------------------------------------------------
function ServicesTab({ gymId }: { gymId: string }) {
  const services = useServiceTypes(gymId);
  const create = useCreateServiceType(gymId);
  const update = useUpdateServiceType(gymId);
  const remove = useDeleteServiceType(gymId);
  const uploadPhoto = useUploadServiceTypePhoto(gymId);
  const [editing, setEditing] = useState<ServiceType | null>(null);

  const onDelete = (id: string, sname: string) => {
    if (!window.confirm(`¿Eliminar el servicio "${sname}"? Sus horarios quedarán sin servicio.`)) return;
    remove.mutate(id);
  };

  const [name, setName] = useState("");
  const [color, setColor] = useState("#1B7FA6");
  const [requiresWod, setRequiresWod] = useState(false);
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [points, setPoints] = useState<number | string>(5);
  const [description, setDescription] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ServiceType>>({
    columnAccessor: "name",
    direction: "asc",
  });

  if (services.isError) return <PageError onRetry={() => services.refetch()} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const created = await create.mutateAsync({
      name: name.trim(),
      color,
      requires_wod: requiresWod,
      description: description.trim(),
      how_it_works: howItWorks.trim(),
      // El tipo de score se elige al publicar cada rutina, no por servicio.
      default_score_type: "none",
      default_duration_min: Number(duration),
      default_capacity: Number(capacity),
      completion_points: Number(points),
    });
    if (photoFile) await uploadPhoto.mutateAsync({ id: created.id, file: photoFile });
    setName("");
    setDescription("");
    setHowItWorks("");
    setPhotoFile(null);
  };

  const rows = (services.data ?? []) as ServiceType[];

  return (
    <>
      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb={4}>
          Nuevo servicio
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Ej.: CrossFit, Functional, Hybrid, Open Gym. Define una vez y reutilízalo en el horario.
          El servicio queda <b>pendiente</b> hasta que le pongas precio/inclusión y lo asignes a un
          plan en <b>Planes y cuotas</b>; recién ahí podrás agendarlo y se mostrará a tus atletas.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
          <ColorInput label="Color" value={color} onChange={setColor} format="hex" />
          <NumberInput label="Min. por defecto" value={duration} onChange={setDuration} min={15} max={300} />
          <NumberInput label="Cupo por defecto" value={capacity} onChange={setCapacity} min={1} max={200} />
          <NumberInput
            label="Puntos al completar"
            description="Gamificación"
            value={points}
            onChange={setPoints}
            min={0}
            max={1000}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
          <Textarea
            label="Descripción"
            description="Qué es el servicio; se muestra a los atletas en la app."
            placeholder="Entrenamiento funcional de alta intensidad en grupo…"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Textarea
            label="Cómo funciona"
            description="Onboarding del servicio en la app (si lo dejas vacío, se usa el texto estándar)."
            placeholder="Reserva tu cupo, asiste y escanea el QR al finalizar para ganar puntos…"
            value={howItWorks}
            onChange={(e) => setHowItWorks(e.currentTarget.value)}
            autosize
            minRows={2}
          />
        </SimpleGrid>
        <Group align="flex-end" gap="md" mt="md">
          <FileInput
            label="Foto del servicio"
            placeholder="Subir imagen"
            accept="image/*"
            value={photoFile}
            onChange={setPhotoFile}
            clearable
            w={{ base: "100%", sm: 260 }}
          />
          <Switch
            label="Requiere rutina"
            description="Las clases de este servicio llevan rutina del día y tablero."
            checked={requiresWod}
            onChange={(e) => setRequiresWod(e.currentTarget.checked)}
          />
          <Button type="submit" loading={create.isPending || uploadPhoto.isPending} ml="auto">
            Crear servicio
          </Button>
        </Group>
      </Card>

      <Card>
        <DataTable<ServiceType>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(rows, sortStatus)}
          fetching={services.isLoading}
          noRecordsText="Crea el primer servicio del gym."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            {
              accessor: "name",
              title: "Servicio",
              sortable: true,
              render: (s) => (
                <Group gap="sm" wrap="nowrap">
                  {s.photo ? (
                    <img
                      src={s.photo}
                      alt={s.name}
                      style={{ width: 46, height: 34, objectFit: "cover", borderRadius: 6 }}
                    />
                  ) : (
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color || "#888" }} />
                  )}
                  <div>
                    <Text fw={600}>{s.name}</Text>
                    {s.description && (
                      <Text c="dimmed" size="xs" lineClamp={1} maw={280}>
                        {s.description}
                      </Text>
                    )}
                  </div>
                </Group>
              ),
            },
            {
              accessor: "requires_wod",
              title: "Rutina",
              sortable: true,
              render: (s) =>
                s.requires_wod ? <Badge color="flame">Rutina</Badge> : <Text c="dimmed" size="sm">—</Text>,
            },
            { accessor: "default_capacity", title: "Cupo", sortable: true },
            {
              accessor: "completion_points",
              title: "Puntos",
              sortable: true,
              render: (s) => `${s.completion_points ?? 5} pts`,
            },
            {
              accessor: "rating",
              title: "Calificación",
              sortable: true,
              render: (s) =>
                s.rating != null ? (
                  <Text size="sm">⭐ {s.rating.toFixed(1)} <Text span c="dimmed" size="xs">({s.rating_count})</Text></Text>
                ) : (
                  <Text c="dimmed" size="sm">—</Text>
                ),
            },
            {
              accessor: "status",
              title: "Publicación",
              sortable: true,
              render: (s) =>
                s.status === "active" ? (
                  <Badge color="teal" variant="light">Activo</Badge>
                ) : (
                  <Badge color="yellow" variant="light" title="Ponle precio y asígnalo a un plan en Membresías">
                    Pendiente · configúralo en Membresías
                  </Badge>
                ),
            },
            {
              accessor: "is_active",
              title: "Estado",
              sortable: true,
              render: (s) => (
                <Switch
                  checked={s.is_active}
                  onChange={(e) => update.mutate({ id: s.id, body: { is_active: e.currentTarget.checked } })}
                  size="sm"
                />
              ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (s) => (
                <RowActions
                  actions={[
                    { label: "Editar", onClick: () => setEditing(s) },
                    { label: "Eliminar", color: "red", variant: "light", onClick: () => onDelete(s.id, s.name) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <EditServiceTypeModal
        service={editing}
        saving={update.isPending || uploadPhoto.isPending}
        onClose={() => setEditing(null)}
        onSave={async (body, photo) => {
          if (!editing) return;
          await update.mutateAsync({ id: editing.id, body });
          if (photo) await uploadPhoto.mutateAsync({ id: editing.id, file: photo });
          setEditing(null);
        }}
      />
    </>
  );
}

function EditServiceTypeModal({
  service,
  saving,
  onClose,
  onSave,
}: {
  service: ServiceType | null;
  saving: boolean;
  onClose: () => void;
  onSave: (body: Partial<ServiceType>, photo: File | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1B7FA6");
  const [requiresWod, setRequiresWod] = useState(false);
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [points, setPoints] = useState<number | string>(5);
  const [description, setDescription] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (service && hydratedFor !== service.id) {
    setHydratedFor(service.id);
    setName(service.name);
    setColor(service.color || "#1B7FA6");
    setRequiresWod(service.requires_wod);
    setDuration(service.default_duration_min ?? 60);
    setCapacity(service.default_capacity ?? 20);
    setPoints(service.completion_points ?? 5);
    setDescription(service.description ?? "");
    setHowItWorks(service.how_it_works ?? "");
    setPhoto(null);
  }

  return (
    <Modal opened={!!service} onClose={onClose} title="Editar servicio" centered size="lg">
      <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
      <ColorInput label="Color" value={color} onChange={setColor} format="hex" mb="sm" />
      <Group grow mb="sm">
        <NumberInput label="Min. por defecto" value={duration} onChange={setDuration} min={15} max={300} />
        <NumberInput label="Cupo por defecto" value={capacity} onChange={setCapacity} min={1} max={200} />
      </Group>
      <NumberInput
        label="Puntos al completar (gamificación)"
        value={points}
        onChange={setPoints}
        min={0}
        max={1000}
        mb="sm"
      />
      <Textarea
        label="Descripción"
        description="Qué es el servicio; los atletas la ven en la app."
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        autosize
        minRows={2}
        mb="sm"
      />
      <Textarea
        label="Cómo funciona"
        description="Onboarding que ve el atleta. Vacío = texto estándar (reserva → QR al cierre → puntos)."
        value={howItWorks}
        onChange={(e) => setHowItWorks(e.currentTarget.value)}
        autosize
        minRows={2}
        mb="sm"
      />
      {service?.photo && !photo && (
        <Group gap="sm" mb="xs">
          <img
            src={service.photo}
            alt={service.name}
            style={{ width: 86, height: 56, objectFit: "cover", borderRadius: 8 }}
          />
          <Text c="dimmed" size="xs">
            Foto actual — sube otra para reemplazarla.
          </Text>
        </Group>
      )}
      <FileInput
        label="Foto del servicio"
        placeholder="Subir imagen"
        accept="image/*"
        value={photo}
        onChange={setPhoto}
        clearable
        mb="sm"
      />
      <Switch
        label="Requiere rutina"
        checked={requiresWod}
        onChange={(e) => setRequiresWod(e.currentTarget.checked)}
        mb="md"
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!name}
          loading={saving}
          onClick={() =>
            onSave(
              {
                name,
                color,
                requires_wod: requiresWod,
                default_duration_min: Number(duration),
                default_capacity: Number(capacity),
                completion_points: Number(points),
                description,
                how_it_works: howItWorks,
              },
              photo,
            )
          }
        >
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Horario semanal (plantillas)
// ---------------------------------------------------------------------------
function ScheduleTab({ gymId }: { gymId: string }) {
  const services = useServiceTypes(gymId);
  const schedules = useSchedules(gymId);
  const coaches = useGymCoaches(gymId);
  const create = useCreateSchedule(gymId);
  const update = useUpdateSchedule(gymId);
  const remove = useDeleteSchedule(gymId);
  const materialize = useMaterializeSchedules(gymId);
  const [editing, setEditing] = useState<ClassSchedule | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [weekdays, setWeekdays] = useState<string[]>(["0", "1", "2", "3", "4"]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [openEnded, setOpenEnded] = useState(true);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [materialized, setMaterialized] = useState<number | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ClassSchedule>>({
    columnAccessor: "start_time",
    direction: "asc",
  });

  const serviceOptions = useMemo(
    () => ((services.data ?? []) as ServiceType[]).map((s) => ({ value: s.id, label: s.name })),
    [services.data],
  );
  const coachOptions = useMemo(
    () => (coaches.data ?? []).map((c) => ({ value: c.staff_role, label: c.name || c.email })),
    [coaches.data],
  );

  if (schedules.isError) return <PageError onRetry={() => schedules.refetch()} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!serviceId || !weekdays.length) return;
    // Una fila por día seleccionado: cada celda de la cuadrícula es su propio horario.
    for (const w of weekdays) {
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
    }
  };

  const rows = ((schedules.data ?? []) as ClassSchedule[]).slice().sort((a, b) =>
    a.start_time === b.start_time ? a.weekday - b.weekday : a.start_time.localeCompare(b.start_time),
  );

  return (
    <>
      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb={4}>
          Agregar al horario
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Ej.: CrossFit 6:00 lun–vie. Se materializan las próximas semanas automáticamente; sin fecha de fin se repite siempre.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          <Select
            label="Servicio"
            placeholder={serviceOptions.length ? "Selecciona" : "Crea un servicio primero"}
            data={serviceOptions}
            value={serviceId}
            onChange={setServiceId}
            searchable
            required
          />
          <TimeInput label="Hora" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} />
          <NumberInput label="Minutos" value={duration} onChange={setDuration} min={15} max={300} />
          <NumberInput label="Cupo" value={capacity} onChange={setCapacity} min={1} max={200} />
          <Select label="Coach" placeholder="Sin asignar" clearable searchable value={coachId} onChange={setCoachId} data={coachOptions} />
        </SimpleGrid>

        <Group gap="xs" my="md" grow>
          {WEEKDAYS.map((d) => {
            const active = weekdays.includes(d.value);
            return (
              <Button
                key={d.value}
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

        <Group align="flex-end" gap="md">
          <DateInput label="Desde" value={fromDate} onChange={setFromDate} valueFormat="YYYY-MM-DD" popoverProps={{ withinPortal: true }} clearable style={{ flex: 1 }} />
          <DateInput label="Hasta" value={toDate} onChange={setToDate} valueFormat="YYYY-MM-DD" disabled={openEnded} popoverProps={{ withinPortal: true }} clearable style={{ flex: 1 }} />
          <Switch label="Sin fecha de fin" checked={openEnded} onChange={(e) => setOpenEnded(e.currentTarget.checked)} />
          <Button type="submit" loading={create.isPending} disabled={!serviceId || !weekdays.length} ml="auto">
            Agregar
          </Button>
        </Group>
      </Card>

      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={3}>Horario actual</Title>
          <Tooltip label="Reconstruye el calendario futuro desde los horarios activos (quita clases sobrantes sin reservas y regenera las próximas semanas)">
            <Button
              variant="light"
              loading={materialize.isPending}
              onClick={async () => {
                const res = await materialize.mutateAsync();
                setMaterialized(res.materialized);
              }}
            >
              Regenerar calendario
            </Button>
          </Tooltip>
        </Group>
        {materialized !== null && (
          <Text c="flame" size="sm" mb="sm">
            Calendario regenerado: {materialized} clases en el horizonte.
          </Text>
        )}
        <DataTable<ClassSchedule>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(rows, sortStatus)}
          fetching={schedules.isLoading}
          noRecordsText="Agrega la primera franja del horario semanal."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "start_time", title: "Hora", sortable: true, render: (s) => s.start_time.slice(0, 5) },
            { accessor: "weekday", title: "Día", sortable: true, render: (s) => weekdayLabel(s.weekday) },
            {
              accessor: "service_type_name",
              title: "Servicio",
              sortable: true,
              render: (s) => (
                <Group gap="xs">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color || "#888" }} />
                  {s.service_type_name}
                  {s.requires_wod && <Badge size="xs" color="flame">Rutina</Badge>}
                </Group>
              ),
            },
            { accessor: "capacity", title: "Cupo", sortable: true },
            {
              accessor: "valid_until",
              title: "Vigencia",
              render: (s) => (s.is_open_ended ? <Badge variant="light">Sin fin</Badge> : `hasta ${s.valid_until}`),
            },
            {
              accessor: "actions",
              title: "",
              render: (s) => (
                <RowActions
                  actions={[
                    { label: "Editar", onClick: () => setEditing(s) },
                    { label: "Quitar del horario", color: "red", variant: "subtle", loading: remove.isPending, onClick: () => remove.mutate(s.id) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <EditScheduleModal
        schedule={editing}
        coachOptions={coachOptions}
        saving={update.isPending}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          await update.mutateAsync({ id: editing.id, body });
          setEditing(null);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Clases (listado + asistencia) — flujo existente
// ---------------------------------------------------------------------------
function ClassesTab({ gymId }: { gymId: string }) {
  const classes = useGymClasses(gymId);
  const pastClasses = useGymPastClasses(gymId);
  const memberships = useMemberships(gymId);
  const coaches = useGymCoaches(gymId);
  const updateClass = useUpdateClass(gymId);
  const cancelClass = useCancelClass(gymId);
  const deleteClass = useDeleteClass(gymId);
  const config = useGymConfig(gymId);
  const wodsToday = useWods(gymId, new Date().toLocaleDateString("en-CA"));

  const onDeleteClass = (gymClass: ClassRow) => {
    if (!window.confirm(`¿Eliminar la clase "${gymClass.class_type}" del ${new Date(gymClass.starts_at).toLocaleString("es-GT")}?`))
      return;
    deleteClass.mutate(gymClass.id);
  };
  const updateConfig = useUpdateGymConfig(gymId);
  const allowFuture = config.data?.allow_future_reservations ?? true;
  const [selectedClassId, setSelectedClassId] = useState("");
  const [membershipId, setMembershipId] = useState<string | null>("");
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const checkins = useClassCheckins(gymId, selectedClassId);
  const reception = useReceptionCheckin(gymId, selectedClassId);

  const coachOptions = useMemo(
    () => (coaches.data ?? []).map((c) => ({ value: c.staff_role, label: c.name || c.email })),
    [coaches.data],
  );
  const coachName = (staffId: string | null) =>
    coachOptions.find((o) => o.value === staffId)?.label ?? null;

  const [search, setSearch] = useState("");
  // Igual que la app móvil: las clases se separan en Pasado / Hoy / Próximas.
  const [timeTab, setTimeTab] = useState<"pasado" | "hoy" | "proximas">("hoy");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ClassRow>>({
    columnAccessor: "starts_at",
    direction: "asc",
  });

  const source = timeTab === "pasado" ? pastClasses : classes;
  if (source.isError) return <PageError onRetry={() => source.refetch()} />;

  const todayStr = new Date().toLocaleDateString("en-CA");
  const dayOf = (c: ClassRow) => new Date(c.starts_at).toLocaleDateString("en-CA");
  const upcoming = (classes.data ?? []) as ClassRow[];

  // Ventana de asistencia (espejo del backend): 30 min antes del inicio hasta
  // una hora después del fin. Fuera de ella solo se CONSULTA lo registrado.
  const now = Date.now();
  const startMs = (c: ClassRow) => new Date(c.starts_at).getTime();
  const endMs = (c: ClassRow) => startMs(c) + (c.duration_min ?? 60) * 60 * 1000;
  const yaInicio = (c: ClassRow) => now >= startMs(c);
  const enVentanaAsistencia = (c: ClassRow) =>
    now >= startMs(c) - 30 * 60 * 1000 && now <= endMs(c) + 60 * 60 * 1000;
  const all =
    timeTab === "pasado"
      ? ((pastClasses.data ?? []) as ClassRow[])
      : upcoming.filter((c) => (timeTab === "hoy" ? dayOf(c) === todayStr : dayOf(c) > todayStr));
  const q = search.trim().toLowerCase();
  const filtered = q
    ? all.filter(
        (c) =>
          c.class_type.toLowerCase().includes(q) ||
          (c.coach_name ?? coachName(c.coach ?? null) ?? "").toLowerCase().includes(q) ||
          label(CLASS_STATUS, c.status).toLowerCase().includes(q),
      )
    : all;
  const rows = sortRecords(filtered, sortStatus);

  const countHoy = upcoming.filter((c) => dayOf(c) === todayStr).length;
  const countProximas = upcoming.filter((c) => dayOf(c) > todayStr).length;
  const countPasado = (pastClasses.data ?? []).length;

  // Pendientes de HOY que necesitan atención: clases sin coach y clases con
  // rutina requerida cuyo WOD del día aún no está publicado.
  const hoyActivas = upcoming.filter((c) => dayOf(c) === todayStr && c.status !== "cancelled");
  const hoySinCoach = hoyActivas.filter((c) => !c.coach);
  const hoySinRutina = hoyActivas.filter(
    (c) =>
      c.needs_wod &&
      !(wodsToday.data ?? []).some(
        (w) => w.published && (!w.service_type || w.service_type === c.service_type),
      ),
  );
  const hora = (c: ClassRow) =>
    new Date(c.starts_at).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

  // La clase del modal de asistencia (puede venir de hoy/próximas o del pasado).
  const selectedClass =
    [...upcoming, ...((pastClasses.data ?? []) as ClassRow[])].find((c) => c.id === selectedClassId) ??
    null;
  const asistenciaAbierta = !!selectedClass && enVentanaAsistencia(selectedClass);

  return (
    <>
      {(hoySinCoach.length > 0 || hoySinRutina.length > 0) && (
        <Alert color="yellow" variant="light" mb="lg" title="Atención para hoy">
          {hoySinCoach.length > 0 && (
            <Text size="sm">
              🧑‍🏫 {hoySinCoach.length === 1 ? "1 clase sin coach asignado" : `${hoySinCoach.length} clases sin coach asignado`}:{" "}
              {hoySinCoach.map((c) => `${c.class_type} ${hora(c)}`).join(", ")}
            </Text>
          )}
          {hoySinRutina.length > 0 && (
            <Text size="sm" mt={hoySinCoach.length ? 4 : 0}>
              📋 {hoySinRutina.length === 1 ? "1 clase requiere rutina y aún no está publicada" : `${hoySinRutina.length} clases requieren rutina y aún no está publicada`}:{" "}
              {hoySinRutina.map((c) => `${c.class_type} ${hora(c)}`).join(", ")} — publícala en la pestaña Rutina.
            </Text>
          )}
        </Alert>
      )}

      <Card mb="lg">
        <Title order={3} mb={4}>
          Reservas de clases
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Controla si los atletas pueden reservar con anticipación o solo las clases de hoy.
        </Text>
        <Switch
          label="Permitir que los atletas reserven clases futuras"
          checked={allowFuture}
          disabled={config.isLoading || updateConfig.isPending}
          onChange={(e) =>
            updateConfig.mutate({ allow_future_reservations: e.currentTarget.checked })
          }
        />
        {!allowFuture && (
          <Text c="dimmed" size="xs" mt="xs">
            Los atletas solo verán habilitada la reserva de las clases del día.
          </Text>
        )}
      </Card>

      <Card>
        <Group justify="space-between" mb="md">
          <SegmentedControl
            value={timeTab}
            onChange={(v) => {
              const tab = v as "pasado" | "hoy" | "proximas";
              setTimeTab(tab);
              // Pasado: lo más reciente primero; Hoy/Próximas: lo más cercano primero.
              setSortStatus({
                columnAccessor: "starts_at",
                direction: tab === "pasado" ? "desc" : "asc",
              });
            }}
            data={[
              { value: "pasado", label: `Pasado (${countPasado})` },
              { value: "hoy", label: `Hoy (${countHoy})` },
              { value: "proximas", label: `Próximas (${countProximas})` },
            ]}
          />
          <TextInput
            placeholder="Buscar por clase, coach o estado…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={{ base: "100%", sm: 320 }}
          />
        </Group>
        <DataTable<ClassRow>
          minHeight={160}
          highlightOnHover
          striped
          records={rows}
          fetching={source.isLoading}
          noRecordsText={
            timeTab === "pasado"
              ? "Sin clases pasadas en los últimos 60 días."
              : timeTab === "hoy"
                ? "Sin clases hoy. Arma el horario y genera las clases del calendario."
                : "Sin clases próximas. Arma el horario y genera las clases del calendario."
          }
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          idAccessor="id"
          columns={[
            {
              accessor: "class_type",
              title: "Clase",
              sortable: true,
              render: (gymClass) => (
                <Group gap="xs">
                  {gymClass.color && (
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: gymClass.color }} />
                  )}
                  {gymClass.class_type}
                  {gymClass.needs_wod && <Badge size="xs" color="flame">Rutina</Badge>}
                </Group>
              ),
            },
            {
              accessor: "starts_at",
              title: "Fecha",
              sortable: true,
              render: (gymClass) => new Date(gymClass.starts_at).toLocaleString("es-GT"),
            },
            {
              accessor: "coach",
              title: "Coach",
              render: (gymClass) =>
                gymClass.coach ? (
                  <Text size="sm">{gymClass.coach_name ?? coachName(gymClass.coach)}</Text>
                ) : (
                  <Badge color={gymClass.is_past_assignment_deadline ? "red" : "yellow"} variant="light">
                    {gymClass.is_past_assignment_deadline ? "Sin coach · urge" : "Sin asignar"}
                  </Badge>
                ),
            },
            {
              accessor: "capacity",
              title: "Cupo",
              sortable: true,
              render: (gymClass) => `${gymClass.reserved_count}/${gymClass.capacity}`,
            },
            {
              accessor: "rating",
              title: "Calificación",
              render: (gymClass) =>
                gymClass.rating != null ? (
                  <Text size="sm">⭐ {gymClass.rating.toFixed(1)} <Text span c="dimmed" size="xs">({gymClass.rating_count})</Text></Text>
                ) : (
                  <Text c="dimmed" size="sm">—</Text>
                ),
            },
            {
              accessor: "status",
              title: "Estado",
              sortable: true,
              render: (gymClass) => label(CLASS_STATUS, gymClass.status),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (gymClass) => {
                // Una clase que ya inició (o está en Pasado) es de solo asistencia:
                // no se le cambia el coach, no se cancela ni se elimina.
                const iniciada = timeTab === "pasado" || yaInicio(gymClass);
                return (
                  <RowActions
                    actions={[
                      !iniciada && { label: "Coach", variant: "light", onClick: () => setEditing(gymClass) },
                      { label: "Asistencia", onClick: () => setSelectedClassId(gymClass.id) },
                      gymClass.status !== "cancelled" && !iniciada && {
                        label: "Cancelar",
                        variant: "subtle",
                        color: "orange",
                        loading: cancelClass.isPending && cancelClass.variables === gymClass.id,
                        onClick: () => cancelClass.mutate(gymClass.id),
                      },
                      !iniciada && {
                        label: "Eliminar",
                        variant: "subtle",
                        color: "red",
                        loading: deleteClass.isPending && deleteClass.variables === gymClass.id,
                        onClick: () => onDeleteClass(gymClass),
                      },
                    ]}
                  />
                );
              },
            },
          ]}
        />
      </Card>

      <AssignCoachModal
        gymClass={editing}
        coaches={coaches.data ?? []}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          await updateClass.mutateAsync({ classId: editing.id, body });
          setEditing(null);
        }}
        saving={updateClass.isPending}
      />

      <Modal
        opened={!!selectedClassId}
        onClose={() => setSelectedClassId("")}
        title="Asistencia de la clase"
        size="lg"
        centered
      >
        {/* Registrar asistencia SOLO dentro de la ventana (ni pasadas ni futuras). */}
        {asistenciaAbierta ? (
          <>
            {selectedClassId && <ClassQrBlock gymId={gymId} classId={selectedClassId} />}
            <Title order={4} mt="md" mb="xs">
              Check-in desde recepción
            </Title>
            <Group
              align="flex-end"
              component="form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault();
                if (membershipId) await reception.mutateAsync(membershipId);
                setMembershipId("");
              }}
            >
              <Select
                label="Atleta activo"
                placeholder="Selecciona un atleta"
                value={membershipId}
                onChange={setMembershipId}
                searchable
                style={{ flex: 1 }}
                data={(memberships.data ?? [])
                  .filter((m) => !!m.status && ["active", "trial"].includes(m.status))
                  .map((m) => ({ value: m.id, label: m.athlete_name }))}
              />
              <Button type="submit" disabled={!membershipId} loading={reception.isPending}>
                Registrar check-in
              </Button>
            </Group>
          </>
        ) : (
          <Alert color="gray" variant="light">
            {selectedClass && now < startMs(selectedClass) - 30 * 60 * 1000
              ? "El registro de asistencia abre 30 minutos antes de la clase."
              : "La ventana de asistencia de esta clase ya cerró; solo se muestra lo registrado."}
          </Alert>
        )}
        <Title order={5} mt="md" mb="xs">
          Asistencia registrada ({(checkins.data ?? []).length})
        </Title>
        {(checkins.data ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">
            Sin check-ins registrados.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Atleta</Table.Th>
                <Table.Th>Hora</Table.Th>
                <Table.Th>Método</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(checkins.data ?? []).map((checkin) => (
                <Table.Tr key={checkin.id}>
                  <Table.Td>{checkin.athlete_name}</Table.Td>
                  <Table.Td>{new Date(checkin.checked_in_at).toLocaleString("es-GT")}</Table.Td>
                  <Table.Td>{checkin.method}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>
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
      <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
        <QRCode value={qr.data.qr_token} size={140} />
      </div>
      <div style={{ flex: 1 }}>
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
  onClose,
  onSave,
}: {
  schedule: ClassSchedule | null;
  coachOptions: { value: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (body: Partial<ClassSchedule>) => Promise<void>;
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

  return (
    <Modal opened={!!schedule} onClose={onClose} title="Editar horario" centered>
      <TimeInput label="Hora" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} mb="sm" />
      <Group grow mb="sm">
        <NumberInput label="Minutos" value={duration} onChange={setDuration} min={15} max={300} />
        <NumberInput label="Cupo" value={capacity} onChange={setCapacity} min={1} max={200} />
      </Group>
      <Select
        label="Coach"
        placeholder="Sin asignar"
        clearable
        searchable
        value={coachId}
        onChange={setCoachId}
        data={coachOptions}
        mb="md"
      />
      <Group justify="flex-end">
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
    </Modal>
  );
}

function WodTab({ gymId }: { gymId: string }) {
  const [date, setDate] = useState<Date | null>(new Date());
  const dateStr = iso(date);
  const services = useServiceTypes(gymId);
  const wods = useWods(gymId, dateStr);
  const create = useCreateWod(gymId);
  const update = useUpdateWod(gymId);
  const remove = useDeleteWod(gymId);
  const [openBoard, setOpenBoard] = useState<Wod | null>(null);

  const onDeleteWod = (id: string, wtitle: string) => {
    if (!window.confirm(`¿Eliminar la rutina "${wtitle}"?`)) return;
    remove.mutate(id);
  };

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [scoreType, setScoreType] = useState<ScoreType>("for_time");
  const [description, setDescription] = useState("");
  const [isBenchmark, setIsBenchmark] = useState(false);
  const [published, setPublished] = useState(true);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Wod>>({
    columnAccessor: "title",
    direction: "asc",
  });

  const wodServices = useMemo(
    () => ((services.data ?? []) as ServiceType[]).filter((s) => s.requires_wod),
    [services.data],
  );

  if (wods.isError) return <PageError onRetry={() => wods.refetch()} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      service_type: serviceId,
      date: dateStr,
      title: title.trim(),
      score_type: scoreType,
      description,
      is_benchmark: isBenchmark,
      published,
    });
    setTitle("");
    setDescription("");
    setIsBenchmark(false);
    setPublished(true);
  };

  const rows = (wods.data ?? []) as Wod[];

  return (
    <>
      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb={4}>
          Rutina del día
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Una rutina por servicio y fecha; la comparten todas las clases de ese día. Se crea
          publicada (visible para los atletas); desactiva el switch si la quieres dejar como borrador.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <DateInput label="Fecha" value={date} onChange={setDate} valueFormat="YYYY-MM-DD" popoverProps={{ withinPortal: true }} />
          <Select
            label="Servicio (track)"
            placeholder="General"
            clearable
            data={wodServices.map((s) => ({ value: s.id, label: s.name }))}
            value={serviceId}
            onChange={(v) => {
              setServiceId(v);
              const svc = wodServices.find((s) => s.id === v);
              if (svc && svc.default_score_type !== "none") setScoreType(svc.default_score_type);
            }}
          />
          <TextInput label="Título" placeholder="Fran" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required />
          <Select
            label="Tipo de score"
            data={SCORE_TYPES.filter((s) => s.value !== "none")}
            value={scoreType}
            onChange={(v) => setScoreType((v as ScoreType) ?? "for_time")}
          />
        </SimpleGrid>
        <Textarea
          label="Descripción"
          placeholder="21-15-9 thrusters + pull-ups"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          mt="md"
          autosize
          minRows={2}
        />
        <Group justify="space-between" mt="md">
          <Group gap="lg">
            <Switch
              label="Publicar al crear"
              checked={published}
              onChange={(e) => setPublished(e.currentTarget.checked)}
            />
            <Switch
              label="Benchmark (mejorar la marca genera un PR al feed)"
              checked={isBenchmark}
              onChange={(e) => setIsBenchmark(e.currentTarget.checked)}
            />
          </Group>
          <Button type="submit" loading={create.isPending}>
            Crear rutina
          </Button>
        </Group>
      </Card>

      <Card>
        <Title order={3} mb="sm">
          Rutinas del {dateStr}
        </Title>
        <DataTable<Wod>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(rows, sortStatus)}
          fetching={wods.isLoading}
          noRecordsText="Crea la rutina del día para este servicio."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            {
              accessor: "title",
              title: "Rutina",
              sortable: true,
              render: (w) => (
                <>
                  <Group gap="xs">
                    <Text fw={600}>{w.title}</Text>
                    {w.is_benchmark && <Badge size="xs" color="grape">Benchmark</Badge>}
                  </Group>
                  {w.description && (
                    <Text c="dimmed" size="xs" lineClamp={1}>
                      {w.description}
                    </Text>
                  )}
                </>
              ),
            },
            { accessor: "service_type_name", title: "Track", sortable: true, render: (w) => w.service_type_name || "General" },
            { accessor: "score_type", title: "Score", render: (w) => scoreLabel(w.score_type) },
            { accessor: "results_count", title: "Resultados", sortable: true },
            {
              accessor: "published",
              title: "Estado",
              sortable: true,
              render: (w) =>
                w.published ? (
                  <Badge color="green">Publicado</Badge>
                ) : (
                  <Badge color="gray" variant="light">
                    Borrador
                  </Badge>
                ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (w) => (
                <RowActions
                  actions={[
                    { label: "Board", variant: "light", onClick: () => setOpenBoard(w) },
                    {
                      label: w.is_benchmark ? "Benchmark ✓" : "Benchmark",
                      variant: w.is_benchmark ? "filled" : "default",
                      color: "grape",
                      loading: update.isPending,
                      onClick: () => update.mutate({ id: w.id, body: { is_benchmark: !w.is_benchmark } }),
                    },
                    {
                      label: w.published ? "Despublicar" : "Publicar",
                      loading: update.isPending,
                      onClick: () => update.mutate({ id: w.id, body: { published: !w.published } }),
                    },
                    { label: "Eliminar", variant: "light", color: "red", loading: remove.isPending, onClick: () => onDeleteWod(w.id, w.title) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <BoardModal gymId={gymId} wod={openBoard} onClose={() => setOpenBoard(null)} />
    </>
  );
}

function BoardModal({ gymId, wod, onClose }: { gymId: string; wod: Wod | null; onClose: () => void }) {
  const memberships = useMemberships(gymId);
  const classes = useGymClasses(gymId);
  const [classId, setClassId] = useState<string | null>(null);
  const board = useWodBoard(gymId, wod?.id ?? "", classId ?? undefined);
  const addResult = useAddWodResult(gymId, wod?.id ?? "");
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [scaling, setScaling] = useState("rx");
  const [error, setError] = useState("");

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
      });
      setScore("");
    } catch (err) {
      const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
      setError(detail ?? "No se pudo registrar el resultado.");
    }
  };

  return (
    <Modal opened={!!wod} onClose={onClose} title={wod ? `Board · ${wod.title}` : ""} size="lg" centered>
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
          placeholder={wod?.score_type === "for_time" ? "3:21" : "120"}
          value={score}
          onChange={(e) => setScore(e.currentTarget.value)}
          w={{ base: "100%", sm: 120 }}
        />
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
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </Table.Td>
                <Table.Td>{r.athlete_name}</Table.Td>
                <Table.Td>
                  <Text fw={600}>{r.raw_score}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={r.scaling === "rx" ? "flame" : "gray"}>
                    {r.scaling.toUpperCase()}
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
  coaches,
  onClose,
  onSave,
  saving,
}: {
  gymClass: ClassRow | null;
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
  const [error, setError] = useState("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Prefill cuando se abre con una clase distinta.
  if (gymClass && hydratedFor !== gymClass.id) {
    setHydratedFor(gymClass.id);
    setCoach(gymClass.coach ?? null);
    setLead(gymClass.assignment_lead_min ?? 60);
    setPayExtra(gymClass.pay_extra ?? false);
    setExtra(gymClass.extra_amount ?? 0);
    setError("");
  }

  const selectedFixed = coaches.find((c) => c.staff_role === coach)?.pay_type === "fixed";

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
