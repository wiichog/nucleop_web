import { FormEvent, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { AxiosError } from "axios";
import {
  useAddWodResult,
  useCancelClass,
  useClassCheckins,
  useCreateSchedule,
  useCreateServiceType,
  useCreateWod,
  useDeleteSchedule,
  useGymCoaches,
  useGymClasses,
  useGymConfig,
  useMaterializeSchedules,
  useMemberships,
  useReceptionCheckin,
  useSchedules,
  useServiceTypes,
  useUpdateClass,
  useUpdateGymConfig,
  useUpdateServiceType,
  useUpdateWod,
  useWodBoard,
  useWods,
} from "../api/hooks";
import type {
  ClassCoachFields,
  ClassSchedule,
  GymClass,
  ScoreType,
  ServiceType,
  Wod,
} from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { CLASS_STATUS, label } from "../lib/labels";

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
        title="Clases y WOD"
        subtitle="Define servicios, arma el horario semanal, registra asistencia y publica el WOD del día."
      />
      <Tabs defaultValue="schedule">
        <Tabs.List mb="lg">
          <Tabs.Tab value="services">Servicios</Tabs.Tab>
          <Tabs.Tab value="schedule">Horario semanal</Tabs.Tab>
          <Tabs.Tab value="classes">Clases</Tabs.Tab>
          <Tabs.Tab value="wod">WOD</Tabs.Tab>
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
      </Tabs>
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

  const [name, setName] = useState("");
  const [color, setColor] = useState("#1B7FA6");
  const [requiresWod, setRequiresWod] = useState(false);
  const [scoreType, setScoreType] = useState<ScoreType>("for_time");
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);

  if (services.isError) return <PageError onRetry={() => services.refetch()} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      color,
      requires_wod: requiresWod,
      default_score_type: requiresWod ? scoreType : "none",
      default_duration_min: Number(duration),
      default_capacity: Number(capacity),
    });
    setName("");
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
        </Text>
        <Group align="flex-end" gap="md">
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} w={200} required />
          <ColorInput label="Color" value={color} onChange={setColor} w={150} format="hex" />
          <NumberInput label="Min. por defecto" value={duration} onChange={setDuration} w={130} min={15} max={300} />
          <NumberInput label="Cupo por defecto" value={capacity} onChange={setCapacity} w={130} min={1} max={200} />
        </Group>
        <Group align="flex-end" gap="md" mt="md">
          <Switch
            label="Requiere WOD"
            checked={requiresWod}
            onChange={(e) => setRequiresWod(e.currentTarget.checked)}
          />
          {requiresWod && (
            <Select
              label="Score por defecto"
              data={SCORE_TYPES.filter((s) => s.value !== "none")}
              value={scoreType}
              onChange={(v) => setScoreType((v as ScoreType) ?? "for_time")}
              w={260}
            />
          )}
          <Button type="submit" loading={create.isPending}>
            Crear servicio
          </Button>
        </Group>
      </Card>

      <Card>
        {services.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState title="Sin servicios" description="Crea el primer servicio del gym." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Servicio</Table.Th>
                <Table.Th>WOD</Table.Th>
                <Table.Th>Score</Table.Th>
                <Table.Th>Cupo</Table.Th>
                <Table.Th>Estado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color || "#888" }} />
                      <Text fw={600}>{s.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {s.requires_wod ? <Badge color="flame">WOD</Badge> : <Text c="dimmed" size="sm">—</Text>}
                  </Table.Td>
                  <Table.Td>{s.requires_wod ? scoreLabel(s.default_score_type) : "—"}</Table.Td>
                  <Table.Td>{s.default_capacity}</Table.Td>
                  <Table.Td>
                    <Switch
                      checked={s.is_active}
                      onChange={(e) => update.mutate({ id: s.id, body: { is_active: e.currentTarget.checked } })}
                      size="sm"
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </>
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
  const remove = useDeleteSchedule(gymId);
  const materialize = useMaterializeSchedules(gymId);

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

  const serviceOptions = useMemo(
    () => ((services.data ?? []) as ServiceType[]).map((s) => ({ value: s.id, label: s.name })),
    [services.data],
  );
  const coachOptions = useMemo(
    () => (coaches.data ?? []).map((c) => ({ value: c.staff_role, label: c.email })),
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
        <Group align="flex-end" gap="md">
          <Select
            label="Servicio"
            placeholder={serviceOptions.length ? "Selecciona" : "Crea un servicio primero"}
            data={serviceOptions}
            value={serviceId}
            onChange={setServiceId}
            w={200}
            searchable
            required
          />
          <TextInput label="Hora" type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} w={120} />
          <NumberInput label="Minutos" value={duration} onChange={setDuration} w={100} min={15} max={300} />
          <NumberInput label="Cupo" value={capacity} onChange={setCapacity} w={90} min={1} max={200} />
          <Select label="Coach" placeholder="Sin asignar" clearable searchable value={coachId} onChange={setCoachId} data={coachOptions} w={200} />
        </Group>

        <Group gap="xs" my="md">
          {WEEKDAYS.map((d) => {
            const active = weekdays.includes(d.value);
            return (
              <Button
                key={d.value}
                size="xs"
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
          <DatePickerInput label="Desde" value={fromDate} onChange={setFromDate} valueFormat="YYYY-MM-DD" />
          <DatePickerInput label="Hasta" value={toDate} onChange={setToDate} valueFormat="YYYY-MM-DD" disabled={openEnded} />
          <Switch label="Sin fecha de fin" checked={openEnded} onChange={(e) => setOpenEnded(e.currentTarget.checked)} />
          <Button type="submit" loading={create.isPending} disabled={!serviceId || !weekdays.length}>
            Agregar
          </Button>
        </Group>
      </Card>

      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={3}>Horario actual</Title>
          <Tooltip label="Genera/extiende las próximas semanas de clases">
            <Button
              variant="light"
              loading={materialize.isPending}
              onClick={async () => {
                const res = await materialize.mutateAsync();
                setMaterialized(res.materialized);
              }}
            >
              Generar clases
            </Button>
          </Tooltip>
        </Group>
        {materialized !== null && (
          <Text c="flame" size="sm" mb="sm">
            Se generaron {materialized} clases nuevas en el horizonte.
          </Text>
        )}
        {schedules.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState title="Sin horarios" description="Agrega la primera franja del horario semanal." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Hora</Table.Th>
                <Table.Th>Día</Table.Th>
                <Table.Th>Servicio</Table.Th>
                <Table.Th>Cupo</Table.Th>
                <Table.Th>Vigencia</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>{s.start_time.slice(0, 5)}</Table.Td>
                  <Table.Td>{weekdayLabel(s.weekday)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color || "#888" }} />
                      {s.service_type_name}
                      {s.requires_wod && <Badge size="xs" color="flame">WOD</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td>{s.capacity}</Table.Td>
                  <Table.Td>
                    {s.is_open_ended ? <Badge variant="light">Sin fin</Badge> : `hasta ${s.valid_until}`}
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Quitar del horario y cancelar clases futuras sin reservas">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        loading={remove.isPending}
                        onClick={() => remove.mutate(s.id)}
                      >
                        ✕
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Clases (listado + asistencia) — flujo existente
// ---------------------------------------------------------------------------
function ClassesTab({ gymId }: { gymId: string }) {
  const classes = useGymClasses(gymId);
  const memberships = useMemberships(gymId);
  const coaches = useGymCoaches(gymId);
  const updateClass = useUpdateClass(gymId);
  const cancelClass = useCancelClass(gymId);
  const config = useGymConfig(gymId);
  const updateConfig = useUpdateGymConfig(gymId);
  const allowFuture = config.data?.allow_future_reservations ?? true;
  const [selectedClassId, setSelectedClassId] = useState("");
  const [membershipId, setMembershipId] = useState<string | null>("");
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const checkins = useClassCheckins(gymId, selectedClassId);
  const reception = useReceptionCheckin(gymId, selectedClassId);

  const coachOptions = useMemo(
    () => (coaches.data ?? []).map((c) => ({ value: c.staff_role, label: c.email })),
    [coaches.data],
  );
  const coachName = (staffId: string | null) =>
    coachOptions.find((o) => o.value === staffId)?.label ?? null;

  if (classes.isError) return <PageError onRetry={() => classes.refetch()} />;

  const rows = (classes.data ?? []) as ClassRow[];

  return (
    <>
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
        {classes.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState title="Sin clases" description="Arma el horario y genera las clases del calendario." />
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Clase</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Coach</Table.Th>
                  <Table.Th>Cupo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((gymClass) => {
                  const vencido = gymClass.is_past_assignment_deadline;
                  return (
                    <Table.Tr key={gymClass.id}>
                      <Table.Td>
                        <Group gap="xs">
                          {gymClass.color && (
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: gymClass.color }} />
                          )}
                          {gymClass.class_type}
                          {gymClass.needs_wod && <Badge size="xs" color="flame">WOD</Badge>}
                        </Group>
                      </Table.Td>
                      <Table.Td>{new Date(gymClass.starts_at).toLocaleString("es-GT")}</Table.Td>
                      <Table.Td>
                        {gymClass.coach ? (
                          <Text size="sm">{gymClass.coach_name ?? coachName(gymClass.coach)}</Text>
                        ) : (
                          <Badge color={vencido ? "red" : "yellow"} variant="light">
                            {vencido ? "Sin coach (vencido)" : "Sin asignar"}
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {gymClass.reserved_count}/{gymClass.capacity}
                      </Table.Td>
                      <Table.Td>{label(CLASS_STATUS, gymClass.status)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button variant="light" size="xs" onClick={() => setEditing(gymClass)}>
                            Coach
                          </Button>
                          <Button variant="default" size="xs" onClick={() => setSelectedClassId(gymClass.id)}>
                            Asistencia
                          </Button>
                          {gymClass.status !== "cancelled" && (
                            <Button
                              variant="subtle"
                              color="red"
                              size="xs"
                              loading={cancelClass.isPending}
                              onClick={() => cancelClass.mutate(gymClass.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
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

      {!!selectedClassId && (
        <Card mt="lg">
          <Title order={3} mb="sm">
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
              w={320}
              data={(memberships.data ?? [])
                .filter((m) => !!m.status && ["active", "trial"].includes(m.status))
                .map((m) => ({ value: m.id, label: m.athlete_name }))}
            />
            <Button type="submit" disabled={!membershipId} loading={reception.isPending}>
              Registrar check-in
            </Button>
          </Group>
          <Title order={4} mt="md" mb="xs">
            Asistencia registrada
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
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// WOD del día + board
// ---------------------------------------------------------------------------
function WodTab({ gymId }: { gymId: string }) {
  const [date, setDate] = useState<Date | null>(new Date());
  const dateStr = iso(date);
  const services = useServiceTypes(gymId);
  const wods = useWods(gymId, dateStr);
  const create = useCreateWod(gymId);
  const update = useUpdateWod(gymId);
  const [openBoard, setOpenBoard] = useState<Wod | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [scoreType, setScoreType] = useState<ScoreType>("for_time");
  const [description, setDescription] = useState("");
  const [isBenchmark, setIsBenchmark] = useState(false);

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
    });
    setTitle("");
    setDescription("");
    setIsBenchmark(false);
  };

  const rows = (wods.data ?? []) as Wod[];

  return (
    <>
      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb={4}>
          WOD del día
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Un WOD por servicio y fecha; lo comparten todas las clases de ese día. Publícalo para que los atletas lo vean.
        </Text>
        <Group align="flex-end" gap="md">
          <DatePickerInput label="Fecha" value={date} onChange={setDate} valueFormat="YYYY-MM-DD" />
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
            w={180}
          />
          <TextInput label="Título" placeholder="Fran" value={title} onChange={(e) => setTitle(e.currentTarget.value)} w={200} required />
          <Select
            label="Tipo de score"
            data={SCORE_TYPES.filter((s) => s.value !== "none")}
            value={scoreType}
            onChange={(v) => setScoreType((v as ScoreType) ?? "for_time")}
            w={240}
          />
        </Group>
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
          <Switch
            label="Benchmark (mejorar la marca genera un PR al feed)"
            checked={isBenchmark}
            onChange={(e) => setIsBenchmark(e.currentTarget.checked)}
          />
          <Button type="submit" loading={create.isPending}>
            Crear WOD
          </Button>
        </Group>
      </Card>

      <Card>
        <Title order={3} mb="sm">
          WODs del {dateStr}
        </Title>
        {wods.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState title="Sin WOD" description="Crea el WOD del día para este servicio." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>WOD</Table.Th>
                <Table.Th>Track</Table.Th>
                <Table.Th>Score</Table.Th>
                <Table.Th>Resultados</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((w) => (
                <Table.Tr key={w.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text fw={600}>{w.title}</Text>
                      {w.is_benchmark && <Badge size="xs" color="grape">Benchmark</Badge>}
                    </Group>
                    {w.description && (
                      <Text c="dimmed" size="xs" lineClamp={1}>
                        {w.description}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{w.service_type_name || "General"}</Table.Td>
                  <Table.Td>{scoreLabel(w.score_type)}</Table.Td>
                  <Table.Td>{w.results_count}</Table.Td>
                  <Table.Td>
                    {w.published ? (
                      <Badge color="green">Publicado</Badge>
                    ) : (
                      <Badge color="gray" variant="light">
                        Borrador
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button variant="light" size="xs" onClick={() => setOpenBoard(w)}>
                        Board
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        loading={update.isPending}
                        onClick={() => update.mutate({ id: w.id, body: { published: !w.published } })}
                      >
                        {w.published ? "Despublicar" : "Publicar"}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <BoardModal gymId={gymId} wod={openBoard} onClose={() => setOpenBoard(null)} />
    </>
  );
}

function BoardModal({ gymId, wod, onClose }: { gymId: string; wod: Wod | null; onClose: () => void }) {
  const memberships = useMemberships(gymId);
  const board = useWodBoard(gymId, wod?.id ?? "");
  const addResult = useAddWodResult(gymId, wod?.id ?? "");
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [scaling, setScaling] = useState("rx");
  const [error, setError] = useState("");

  const athleteOptions = (memberships.data ?? [])
    .filter((m) => !!m.status && ["active", "trial"].includes(m.status))
    .map((m) => ({ value: m.athlete, label: m.athlete_name }));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!athleteId || !score.trim()) return;
    try {
      await addResult.mutateAsync({ athlete_id: athleteId, raw_score: score.trim(), scaling });
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
          w={220}
        />
        <TextInput
          label="Score"
          placeholder={wod?.score_type === "for_time" ? "3:21" : "120"}
          value={score}
          onChange={(e) => setScore(e.currentTarget.value)}
          w={120}
        />
        <Select label="Modalidad" data={SCALINGS} value={scaling} onChange={(v) => setScaling(v ?? "rx")} w={140} />
        <Button type="submit" loading={addResult.isPending} disabled={!athleteId || !score.trim()}>
          Registrar
        </Button>
      </Group>
      {error && (
        <Text c="red" size="sm" mb="sm">
          {error}
        </Text>
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

type CoachOpt = { staff_role: string; email: string; pay_type: "per_class" | "fixed" };

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
        data={coaches.map((c) => ({ value: c.staff_role, label: c.email }))}
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
