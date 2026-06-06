import { FormEvent, useState } from "react";
import { Button, Card, Group, Modal, Table, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useBranches, useCreateBranch, useDeleteBranch, useUpdateBranch } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

type Branch = { id: string; name: string; location_text?: string | null };

export function BranchesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useBranches(gymId);
  const createBranch = useCreateBranch(gymId);
  const updateBranch = useUpdateBranch(gymId);
  const deleteBranch = useDeleteBranch(gymId);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editing, setEditing] = useState<Branch | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createBranch.mutateAsync({ name, location_text: location });
    setName("");
    setLocation("");
  };

  const onDelete = async (b: Branch) => {
    if (!window.confirm(`¿Eliminar la sede "${b.name}"? Sus clases quedarán sin sede.`)) return;
    try {
      await deleteBranch.mutateAsync(b.id);
      notifications.show({ color: "teal", message: "Sede eliminada." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo eliminar la sede." });
    }
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
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.name}</Table.Td>
                  <Table.Td>{b.location_text || "—"}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button variant="default" size="xs" onClick={() => setEditing(b as Branch)}>
                        Editar
                      </Button>
                      <Button variant="light" color="red" size="xs" loading={deleteBranch.isPending} onClick={() => onDelete(b as Branch)}>
                        Eliminar
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <EditBranchModal
        branch={editing}
        saving={updateBranch.isPending}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await updateBranch.mutateAsync({ id: editing.id, body });
            notifications.show({ color: "teal", message: "Sede actualizada." });
            setEditing(null);
          } catch {
            notifications.show({ color: "red", message: "No se pudo actualizar." });
          }
        }}
      />
    </div>
  );
}

function EditBranchModal({
  branch,
  saving,
  onClose,
  onSave,
}: {
  branch: Branch | null;
  saving: boolean;
  onClose: () => void;
  onSave: (body: { name: string; location_text: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (branch && hydratedFor !== branch.id) {
    setHydratedFor(branch.id);
    setName(branch.name);
    setLocation(branch.location_text ?? "");
  }

  return (
    <Modal opened={!!branch} onClose={onClose} title="Editar sede" centered>
      <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
      <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} mb="md" />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!name} loading={saving} onClick={() => onSave({ name, location_text: location })}>
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}
