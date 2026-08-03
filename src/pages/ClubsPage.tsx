import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { CheckCircle2, Flag, Users } from "lucide-react";
import { useGymClubs, useDecideClub, useCreateGymClub } from "../api/hooks";
import type { GymClub } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { BigMetric, GlassCard, MetricTile, Stagger } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
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
  // Rechazo con motivo: el atleta solicitante LEE esta nota en su app, así que un
  // rechazo mudo es lo peor que puede pasarle a alguien que propuso un club.
  const [rechazando, setRechazando] = useState<GymClub | null>(null);
  const [motivo, setMotivo] = useState("");

  if (!gymId) return <NoGymAssigned />;
  if (clubs.isError) return <PageError onRetry={() => clubs.refetch()} />;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createClub.mutateAsync({ name: form.name.trim(), club_type: form.club_type.trim() });
      notifications.show({ color: "teal", message: `Club "${form.name.trim()}" creado y aprobado.` });
      setForm({ name: "", club_type: "" });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el club.") });
    }
  };

  const onDecidir = (club: GymClub, decision: "approve" | "reject", note?: string) => {
    decide.mutate(
      { clubId: club.id, decision, note },
      {
        onSuccess: () => {
          setRechazando(null);
          setMotivo("");
          notifications.show({
            color: decision === "approve" ? "teal" : "gray",
            message:
              decision === "approve"
                ? `Club "${club.name}" aprobado. Su creador ya puede administrarlo.`
                : `Club "${club.name}" rechazado. Se le avisó al solicitante.`,
          });
        },
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, "No se pudo registrar la decisión sobre el club."),
          }),
      },
    );
  };

  const rows = clubs.data ?? [];
  const pending = rows.filter((c) => c.status === "pending");
  const aprobados = rows.filter((c) => c.status === "approved").length;
  const miembros = rows.reduce((total, c) => total + (c.member_count ?? 0), 0);

  return (
    <div>
      <PageHeader
        kicker="Comunidad · Clubes"
        title="Clubes del gimnasio"
        subtitle="Crea los clubes de tu box y resuelve las solicitudes que proponen tus atletas: el creador administra el club en cuanto lo apruebas."
      />

      {/* Retrato del padrón de clubes, derivado del mismo listado de abajo. */}
      <Stagger from={0.6} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
          <MetricTile
            label="Clubes registrados"
            value={clubs.isLoading ? "—" : rows.length}
            icon={<Flag size={16} strokeWidth={1.8} />}
          />
          <MetricTile
            label="Aprobados"
            value={clubs.isLoading ? "—" : aprobados}
            icon={<CheckCircle2 size={16} strokeWidth={1.8} />}
            hint="Ya visibles para tus atletas."
          />
          <MetricTile
            label="Miembros en clubes"
            value={clubs.isLoading ? "—" : miembros}
            icon={<Users size={16} strokeWidth={1.8} />}
          />
        </SimpleGrid>
      </Stagger>

      <GlassCard padding={24} delay={0.72} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <SectionLabel as="h2" mb={12}>Crear club</SectionLabel>
        <form onSubmit={onCreate}>
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
        </form>
      </GlassCard>

      {/* El borde flame solo aparece cuando de verdad hay algo que decidir. */}
      {pending.length > 0 && (
        <GlassCard
          variant="core"
          sheen
          padding={24}
          delay={0.84}
          style={{ marginBottom: "calc(20 * var(--u))" }}
        >
          <BigMetric
            label="Solicitudes pendientes"
            value={pending.length}
            size="sm"
            hint="Clubes propuestos por atletas esperando tu decisión."
            delay={1.04}
          />
          <div style={{ height: "calc(14 * var(--u))" }} />
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
                      <Button size="xs" loading={deciding(c.id)} onClick={() => onDecidir(c, "approve")}>
                        Aprobar
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        loading={deciding(c.id)}
                        onClick={() => {
                          setMotivo("");
                          setRechazando(c);
                        }}
                      >
                        Rechazar
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </GlassCard>
      )}

      <GlassCard padding={20} delay={0.96}>
        <SectionLabel as="h2" mb={12}>Todos los clubes</SectionLabel>
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
      </GlassCard>

      <Modal
        opened={!!rechazando}
        onClose={() => setRechazando(null)}
        title={`Rechazar "${rechazando?.name ?? ""}"`}
        centered
      >
        <Text size="sm" c="dimmed" mb="sm">
          El atleta que lo propuso verá este motivo en su app. Si lo dejas vacío se le envía un
          mensaje genérico.
        </Text>
        <Textarea
          label="Motivo del rechazo"
          placeholder="Ya existe un club de running en el gimnasio…"
          maxLength={255}
          autosize
          minRows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.currentTarget.value)}
          mb="lg"
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setRechazando(null)}>
            Cancelar
          </Button>
          <Button
            color="red"
            loading={decide.isPending}
            onClick={() => rechazando && onDecidir(rechazando, "reject", motivo.trim())}
          >
            Rechazar club
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
