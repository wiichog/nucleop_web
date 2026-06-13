import { FormEvent, useState } from "react";
import { Button, Card, Group, Modal, SimpleGrid, Stack, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useBranches, useCreateBranch, useDeleteBranch, useUpdateBranch } from "../api/hooks";
import { NoGymAssigned } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

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
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Branch>>({
    columnAccessor: "name",
    direction: "asc",
  });

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
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput label="Nombre" placeholder="Ej. Zona 10" value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button type="submit" disabled={!name} loading={createBranch.isPending}>
              Agregar
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card>
        <DataTable<Branch>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords((data ?? []) as Branch[], sortStatus)}
          fetching={isLoading}
          noRecordsText="Agrega tus sedes para medir rentabilidad por ubicación."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "name", title: "Sede", sortable: true },
            { accessor: "location_text", title: "Ubicación", sortable: true, render: (b) => b.location_text || "—" },
            {
              accessor: "actions",
              title: "Acciones",
              render: (b) => (
                <RowActions
                  actions={[
                    { label: "Editar", onClick: () => setEditing(b) },
                    { label: "Eliminar", color: "red", variant: "light", loading: deleteBranch.isPending, onClick: () => onDelete(b) },
                  ]}
                />
              ),
            },
          ]}
        />
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
