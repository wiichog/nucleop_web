import { FormEvent, useState } from "react";
import { Badge, Button, Card, Group, SimpleGrid, Table, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useGymClubs, useDecideClub, useCreateGymClub } from "../api/hooks";
import type { GymClub } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";
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
  const createClub = useCreateGymClub(gymId);
  const [form, setForm] = useState({ name: "", club_type: "" });
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<GymClub>>({
    columnAccessor: "name",
    direction: "asc",
  });
  const deciding = (clubId: string) => decide.isPending && decide.variables?.clubId === clubId;

  if (!gymId) return <NoGymAssigned />;
  if (clubs.isError) return <PageError onRetry={() => clubs.refetch()} />;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createClub.mutateAsync({ name: form.name.trim(), club_type: form.club_type.trim() });
      notifications.show({ color: "teal", message: `Club "${form.name.trim()}" creado y aprobado.` });
      setForm({ name: "", club_type: "" });
    } catch {
      notifications.show({ color: "red", message: "No se pudo crear el club." });
    }
  };

  const rows = clubs.data ?? [];
  const pending = rows.filter((c) => c.status === "pending");

  return (
    <div>
      <PageHeader
        kicker="Comunidad · Clubes"
        title="Clubes del gimnasio"
        subtitle="Crea tus propios clubes o aprueba/rechaza los que proponen tus atletas."
      />

      <Card mb="lg" component="form" onSubmit={onCreate}>
        <Title order={3} mb="sm">
          Crear club
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Nombre del club"
            placeholder="Runners 1821"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <TextInput
            label="Tipo"
            placeholder="running, cycling, rowing…"
            value={form.club_type}
            onChange={(e) => setForm({ ...form, club_type: e.currentTarget.value })}
          />
        </SimpleGrid>
        <Button type="submit" mt="md" loading={createClub.isPending} disabled={!form.name.trim() || !form.club_type.trim()}>
          Crear club
        </Button>
      </Card>

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
                        loading={deciding(c.id)}
                        onClick={() => decide.mutate({ clubId: c.id, decision: "approve" })}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        loading={deciding(c.id)}
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
        <DataTable<GymClub>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(rows as GymClub[], sortStatus)}
          fetching={clubs.isLoading}
          noRecordsText="Cuando un atleta cree un club para este gimnasio, aparecerá aquí."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "name", title: "Club", sortable: true },
            { accessor: "club_type", title: "Tipo", sortable: true },
            {
              accessor: "status",
              title: "Estado",
              sortable: true,
              render: (c) => (
                <Badge color={BADGE_COLOR[c.status] ?? "yellow"} variant="light">
                  {label(CLUB_STATUS, c.status)}
                </Badge>
              ),
            },
            { accessor: "member_count", title: "Miembros", sortable: true, render: (c) => <Text size="sm">{c.member_count ?? 0}</Text> },
          ]}
        />
      </Card>
    </div>
  );
}
