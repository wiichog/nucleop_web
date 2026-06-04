import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Group,
  NumberInput,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  useClassCheckins,
  useCreateRecurringClasses,
  useGymClasses,
  useMemberships,
  useReceptionCheckin,
} from "../api/hooks";
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

export function ClassesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const classes = useGymClasses(gymId);
  const createRecurring = useCreateRecurringClasses(gymId);
  const memberships = useMemberships(gymId);
  const [classType, setClassType] = useState("CrossFit");
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState<number | string>(60);
  const [capacity, setCapacity] = useState<number | string>(20);
  const [weekdays, setWeekdays] = useState<string[]>(["0", "1", "2", "3", "4"]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [openEnded, setOpenEnded] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [membershipId, setMembershipId] = useState<string | null>("");
  const checkins = useClassCheckins(gymId, selectedClassId);
  const reception = useReceptionCheckin(gymId, selectedClassId);

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
      ...(openEnded ? { open_ended: true } : { to_date: iso(toDate) }),
    });
    setCreated((res as { created: number }).created);
  };

  return (
    <div>
      <PageHeader title="Calendario de clases" subtitle="Programa horarios fijos y registra asistencia." />

      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb={4}>
          Crear clases (horario fijo)
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Ej.: CrossFit de 6:00 a 7:00, de lunes a viernes, durante un rango de fechas.
        </Text>
        <Group align="flex-end" gap="md">
          <TextInput label="Tipo de clase" value={classType} onChange={(e) => setClassType(e.currentTarget.value)} />
          <TextInput
            label="Hora"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.currentTarget.value)}
            w={120}
          />
          <NumberInput label="Minutos" value={duration} onChange={setDuration} w={100} min={15} max={300} />
          <NumberInput label="Cupo" value={capacity} onChange={setCapacity} w={100} min={1} max={200} />
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
          <DatePickerInput
            label="Hasta"
            value={toDate}
            onChange={setToDate}
            valueFormat="YYYY-MM-DD"
            disabled={openEnded}
          />
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
        ) : !(classes.data ?? []).length ? (
          <EmptyState title="Sin clases" description="Crea la primera clase del calendario." />
        ) : (
          <Table.ScrollContainer minWidth={600}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Clase</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Cupo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Recepción</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(classes.data ?? []).map((gymClass) => (
                  <Table.Tr key={gymClass.id}>
                    <Table.Td>{gymClass.class_type}</Table.Td>
                    <Table.Td>{new Date(gymClass.starts_at).toLocaleString("es-GT")}</Table.Td>
                    <Table.Td>
                      {gymClass.reserved_count}/{gymClass.capacity}
                    </Table.Td>
                    <Table.Td>{label(CLASS_STATUS, gymClass.status)}</Table.Td>
                    <Table.Td>
                      <Button variant="default" size="xs" onClick={() => setSelectedClassId(gymClass.id)}>
                        Asistencia
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

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
