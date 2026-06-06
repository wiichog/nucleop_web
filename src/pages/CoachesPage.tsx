import { FormEvent, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  useCoachRequests,
  useDecideCoachRequest,
  useGymCoaches,
  useInviteCoach,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

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
        <Title order={3} mb="sm">
          Coaches del gimnasio
        </Title>
        {coaches.isLoading ? (
          <PageLoading />
        ) : !(coaches.data ?? []).length ? (
          <EmptyState title="Sin coaches" description="Invita al primer coach del gimnasio." />
        ) : (
          <Table.ScrollContainer minWidth={520}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Coach</Table.Th>
                  <Table.Th>Forma de pago</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(coaches.data ?? []).map((c) => (
                  <Table.Tr key={c.staff_role}>
                    <Table.Td>
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
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={c.pay_type === "fixed" ? "grape" : "blue"}>
                        {c.pay_type === "fixed" ? "Salario fijo" : "Por clase"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={c.is_active ? "teal" : "gray"}>
                        {c.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
        <Text c="dimmed" size="xs" mt="sm">
          La tarifa de cada coach y las liquidaciones se gestionan en Negocio → Pagos a coaches.
        </Text>
      </Card>
    </div>
  );
}
