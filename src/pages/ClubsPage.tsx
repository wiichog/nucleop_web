import { Badge, Button, Card, Group, Table, Text, Title } from "@mantine/core";
import { useGymClubs, useDecideClub } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { CLUB_STATUS, label } from "../lib/labels";

const BADGE_COLOR: Record<string, string> = {
  pending: "yellow",
  approved: "teal",
  rejected: "red",
};

export function ClubsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const clubs = useGymClubs(gymId);
  const decide = useDecideClub(gymId);

  if (!gymId) return <NoGymAssigned />;
  if (clubs.isError) return <PageError onRetry={() => clubs.refetch()} />;

  const rows = clubs.data ?? [];
  const pending = rows.filter((c) => c.status === "pending");

  return (
    <div>
      <PageHeader
        title="Clubes del gimnasio"
        subtitle="Tus atletas pueden crear clubes; aquí apruebas o rechazas las solicitudes."
      />

      {pending.length > 0 && (
        <Card mb="lg">
          <Title order={3} mb="sm">
            Solicitudes pendientes ({pending.length})
          </Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Club</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pending.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{c.name}</Table.Td>
                  <Table.Td>{c.club_type}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        loading={decide.isPending}
                        onClick={() => decide.mutate({ clubId: c.id, decision: "approve" })}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        loading={decide.isPending}
                        onClick={() => decide.mutate({ clubId: c.id, decision: "reject" })}
                      >
                        Rechazar
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Card>
        <Title order={3} mb="sm">
          Todos los clubes
        </Title>
        {clubs.isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState
            title="Sin clubes"
            description="Cuando un atleta cree un club para este gimnasio, aparecerá aquí."
          />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Club</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Miembros</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{c.name}</Table.Td>
                  <Table.Td>{c.club_type}</Table.Td>
                  <Table.Td>
                    <Badge color={BADGE_COLOR[c.status] ?? "yellow"} variant="light">
                      {label(CLUB_STATUS, c.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{c.member_count ?? 0}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
