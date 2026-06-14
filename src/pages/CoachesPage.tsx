import { FormEvent, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useCoachRequests,
  useDecideCoachRequest,
  useGymCoaches,
  useInviteCoach,
} from "../api/hooks";
import type { Coach } from "../api/types";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

const money = (v: string | number) => `Q${Number(v).toFixed(2)}`;

/** Catálogo de coaches del gimnasio: invitación, solicitudes y roster (Operación).
 *  La forma de pago y las liquidaciones viven en Negocio → Pagos a coaches. */
export function CoachesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const coaches = useGymCoaches(gymId);
  const requests = useCoachRequests(gymId);
  const inviteCoach = useInviteCoach(gymId);
  const decideRequest = useDecideCoachRequest(gymId);

  const [invEmail, setInvEmail] = useState("");
  const [invFirst, setInvFirst] = useState("");
  const [invLast, setInvLast] = useState("");
  const [invMsg, setInvMsg] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Coach>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInvMsg("");
    try {
      await inviteCoach.mutateAsync({ email: invEmail.trim(), first_name: invFirst, last_name: invLast });
      setInvEmail("");
      setInvFirst("");
      setInvLast("");
      setInvMsg("Invitación enviada. El coach debe reclamar su cuenta y aceptar.");
    } catch {
      setInvMsg("No se pudo invitar (¿correo ya activo como coach?).");
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (coaches.isError) return <PageError onRetry={() => coaches.refetch()} />;

  return (
    <div>
      <PageHeader
        title="Coaches"
        subtitle="Invita coaches y gestiona el equipo del gimnasio. La nómina y liquidaciones están en Negocio → Pagos a coaches."
      />

      <Card mb="lg">
        <Title order={3} mb={4}>
          Invitar coach
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Le creamos su cuenta de Nucleo; el coach la reclama y acepta para quedar activo.
        </Text>
        <Group align="flex-end" component="form" onSubmit={onInvite} gap="md" grow>
          <TextInput
            label="Correo"
            type="email"
            value={invEmail}
            onChange={(e) => setInvEmail(e.currentTarget.value)}
            required
          />
          <TextInput label="Nombre" value={invFirst} onChange={(e) => setInvFirst(e.currentTarget.value)} />
          <TextInput label="Apellido" value={invLast} onChange={(e) => setInvLast(e.currentTarget.value)} />
          <Button type="submit" loading={inviteCoach.isPending} disabled={!invEmail.trim()} style={{ flexGrow: 0 }}>
            Invitar
          </Button>
        </Group>
        {invMsg && (
          <Text size="sm" mt="sm" c={invMsg.startsWith("No se pudo") ? "red" : "flame"}>
            {invMsg}
          </Text>
        )}

        <Title order={4} mt="lg" mb="xs">
          Solicitudes de coaches
        </Title>
        {requests.isLoading ? (
          <PageLoading />
        ) : !(requests.data ?? []).length ? (
          <Text c="dimmed" size="sm">
            No hay solicitudes ni invitaciones pendientes.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Coach</Table.Th>
                <Table.Th>Origen</Table.Th>
                <Table.Th>Acción</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(requests.data ?? []).map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.user_email}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={r.direction === "coach_apply" ? "blue" : "grape"}>
                      {r.direction === "coach_apply" ? "Solicitó unirse" : "Invitación enviada"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {r.direction === "coach_apply" ? (
                      <Group gap="xs">
                        <Button
                          size="xs"
                          loading={decideRequest.isPending}
                          onClick={() => decideRequest.mutate({ requestId: r.id, action: "approve" })}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="xs"
                          variant="default"
                          color="red"
                          loading={decideRequest.isPending}
                          onClick={() => decideRequest.mutate({ requestId: r.id, action: "reject" })}
                        >
                          Rechazar
                        </Button>
                      </Group>
                    ) : (
                      <Text c="dimmed" size="sm">
                        Esperando que el coach acepte
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={3}>Coaches del gimnasio</Title>
          <TextInput
            placeholder="Buscar coach…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={{ base: "100%", sm: 240 }}
          />
        </Group>
        <DataTable<Coach>
          minHeight={160}
          highlightOnHover
          striped
          idAccessor="staff_role"
          records={sortRecords(
            (coaches.data ?? []).filter(
              (c) =>
                !search.trim() ||
                (c.name || c.email).toLowerCase().includes(search.trim().toLowerCase()),
            ),
            sortStatus,
          )}
          fetching={coaches.isLoading}
          noRecordsText="Sin coaches. Invita al primer coach del gimnasio."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          onRowClick={({ record }) => setSelectedCoach(record)}
          columns={[
            {
              accessor: "name",
              title: "Coach",
              sortable: true,
              render: (c) => (
                <Group gap="sm" wrap="nowrap">
                  <Avatar src={c.photo} radius="xl" size={38} color="flame">
                    {(c.name || c.email).slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text fw={600} size="sm">
                      {c.name || c.email}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {c.email}
                    </Text>
                  </div>
                </Group>
              ),
            },
            {
              accessor: "pay_type",
              title: "Forma de pago",
              sortable: true,
              render: (c) => (
                <Badge variant="light" color={c.pay_type === "fixed" ? "grape" : "blue"}>
                  {c.pay_type === "fixed" ? "Salario fijo" : "Por clase"}
                </Badge>
              ),
            },
            {
              accessor: "rating",
              title: "Calificación",
              sortable: true,
              render: (c) =>
                c.rating != null ? (
                  <Text size="sm">
                    ⭐ {c.rating.toFixed(1)}{" "}
                    <Text span c="dimmed" size="xs">
                      ({c.rating_count})
                    </Text>
                  </Text>
                ) : (
                  <Text c="dimmed" size="sm">—</Text>
                ),
            },
            {
              accessor: "is_active",
              title: "Estado",
              sortable: true,
              render: (c) => (
                <Badge variant="light" color={c.is_active ? "teal" : "gray"}>
                  {c.is_active ? "Activo" : "Inactivo"}
                </Badge>
              ),
            },
          ]}
        />
        <Text c="dimmed" size="xs" mt="sm">
          Toca un coach para ver su perfil. La tarifa y las liquidaciones se gestionan en Negocio → Pagos a coaches.
        </Text>
      </Card>

      <CoachProfileModal coach={selectedCoach} onClose={() => setSelectedCoach(null)} />
    </div>
  );
}

function CoachProfileModal({ coach, onClose }: { coach: Coach | null; onClose: () => void }) {
  return (
    <Modal opened={!!coach} onClose={onClose} title="Perfil del coach" centered>
      {coach && (
        <>
          <Group gap="md" mb="md">
            <Avatar src={coach.photo} radius="xl" size={64} color="flame">
              {(coach.name || coach.email).slice(0, 1).toUpperCase()}
            </Avatar>
            <div>
              <Text fw={700} size="lg">
                {coach.name || coach.email}
              </Text>
              <Text c="dimmed" size="sm">
                {coach.email}
              </Text>
              <Badge mt={4} variant="light" color={coach.is_active ? "teal" : "gray"}>
                {coach.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </Group>
          <Divider mb="md" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <div>
              <Text c="dimmed" size="xs">
                Forma de pago
              </Text>
              <Text fw={600}>{coach.pay_type === "fixed" ? "Salario fijo" : "Por clase"}</Text>
            </div>
            <div>
              <Text c="dimmed" size="xs">
                {coach.pay_type === "fixed" ? "Salario fijo" : "Tarifa por clase"}
              </Text>
              <Text fw={600}>
                {coach.pay_type === "fixed" ? money(coach.fixed_amount) : money(coach.per_class_rate)}
              </Text>
            </div>
          </SimpleGrid>
          <Text c="dimmed" size="xs" mt="md">
            La tarifa y las liquidaciones se editan en Negocio → Pagos a coaches.
          </Text>
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={onClose}>
              Cerrar
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
