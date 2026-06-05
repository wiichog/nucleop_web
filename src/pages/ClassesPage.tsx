import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Group,
  Modal,
  NumberInput,
  Select,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { AxiosError } from "axios";
import {
  useClassCheckins,
  useCreateRecurringClasses,
  useGymCoaches,
  useGymClasses,
  useMemberships,
  useReceptionCheckin,
  useUpdateClass,
} from "../api/hooks";
import type { ClassCoachFields, GymClass } from "../api/types";
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

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

/** GymClass del schema + los campos del sprint de coaches. */
type ClassRow = GymClass & ClassCoachFields;

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const classes = useGymClasses(gymId);
  const createRecurring = useCreateRecurringClasses(gymId);
  const memberships = useMemberships(gymId);
  const coaches = useGymCoaches(gymId);
  const updateClass = useUpdateClass(gymId);
  const [classType, setClassType] = useState("CrossFit");
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [leadMin, setLeadMin] = useState<number | string>(60);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [weekdays, setWeekdays] = useState<string[]>(["0", "1", "2", "3", "4"]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [openEnded, setOpenEnded] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
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

  if (!gymId) return <NoGymAssigned />;
  if (classes.isError) return <PageError onRetry={() => classes.refetch()} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await createRecurring.mutateAsync({
      class_type: classType,
      start_time: startTime,
      duration_min: Number(duration),
      capacity: Number(capacity),
      weekdays: weekdays.map(Number),
      from_date: iso(fromDate),
      assignment_lead_min: Number(leadMin),
      coach_id: coachId,
      ...(openEnded ? { open_ended: true } : { to_date: iso(toDate) }),
    });
    setCreated((res as { created: number }).created);
  };

  const rows = (classes.data ?? []) as ClassRow[];

  return (
    <div>
      <PageHeader title="Calendario de clases" subtitle="Programa horarios fijos, asigna coach y registra asistencia." />

      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb={4}>
          Crear clases (horario fijo)
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Ej.: CrossFit de 6:00 a 7:00, de lunes a viernes. Asigna coach y el tiempo límite de asignación.
        </Text>
        <Group align="flex-end" gap="md">
          <TextInput label="Tipo de clase" value={classType} onChange={(e) => setClassType(e.currentTarget.value)} />
          <TextInput label="Hora" type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} w={120} />
          <NumberInput label="Minutos" value={duration} onChange={setDuration} w={100} min={15} max={300} />
          <NumberInput label="Cupo" value={capacity} onChange={setCapacity} w={90} min={1} max={200} />
        </Group>
        <Group align="flex-end" gap="md" mt="md">
          <Select
            label="Coach"
            placeholder="Sin asignar"
            clearable
            searchable
            value={coachId}
            onChange={setCoachId}
            data={coachOptions}
            w={240}
          />
          <NumberInput
            label="Asignar hasta (min antes)"
            description="Tiempo límite para tener coach"
            value={leadMin}
            onChange={setLeadMin}
            w={200}
            min={0}
            max={1440}
          />
        </Group>

        <Chip.Group multiple value={weekdays} onChange={setWeekdays}>
          <Group gap="xs" my="md">
            {WEEKDAYS.map((d) => (
              <Chip key={d.value} value={d.value} color="flame" variant="filled">
                {d.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>

        <Group align="flex-end" gap="md">
          <DatePickerInput label="Desde" value={fromDate} onChange={setFromDate} valueFormat="YYYY-MM-DD" />
          <DatePickerInput label="Hasta" value={toDate} onChange={setToDate} valueFormat="YYYY-MM-DD" disabled={openEnded} />
          <Checkbox
            label="Sin fecha de fin (se repite siempre)"
            checked={openEnded}
            onChange={(e) => setOpenEnded(e.currentTarget.checked)}
          />
          <Button type="submit" loading={createRecurring.isPending} disabled={!weekdays.length}>
            Crear clases
          </Button>
        </Group>
        {created !== null && (
          <Text c="flame" mt="sm" size="sm">
            Se crearon {created} clases
            {openEnded ? " (próximas 8 semanas; vuelve a generar para extender)" : ""}.
          </Text>
        )}
      </Card>

      <Card>
        {classes.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState title="Sin clases" description="Crea la primera clase del calendario." />
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
                      <Table.Td>{gymClass.class_type}</Table.Td>
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
    </div>
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
