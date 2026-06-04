import { FormEvent, useState } from "react";
import { Button, Card, Group, Table, TextInput, Title } from "@mantine/core";
import { useBranches, useCreateBranch } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

export function BranchesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useBranches(gymId);
  const createBranch = useCreateBranch(gymId);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createBranch.mutateAsync({ name, location_text: location });
    setName("");
    setLocation("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader title="Sucursales" subtitle="Agrega tus sedes para medir rentabilidad por ubicación." />
      <Card mb="lg" component="form" onSubmit={onSubmit}>
        <Title order={3} mb="sm">
          Nueva sede
        </Title>
        <Group align="flex-end" gap="md">
          <TextInput label="Nombre" placeholder="Ej. Zona 10" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} style={{ flex: 1, minWidth: 200 }} />
          <Button type="submit" disabled={!name} loading={createBranch.isPending}>
            Agregar
          </Button>
        </Group>
      </Card>

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState title="Sin sucursales" description="Agrega tus sedes para medir rentabilidad por ubicación." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Sede</Table.Th>
                <Table.Th>Ubicación</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.name}</Table.Td>
                  <Table.Td>{b.location_text || "—"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
