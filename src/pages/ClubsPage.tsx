import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCreateGymClub, useDecideClub, useGymClubs } from "../api/hooks";
import type { GymClub } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { CLUB_STATUS, label } from "../lib/labels";

const BADGE_COLOR: Record<string, string> = {
  pending: "yellow",
  approved: "teal",
  rejected: "gray",
};

/** Lo que espera decisión primero; lo rechazado al final. */
const ORDEN_ESTADO: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };

type Orden = "nombre" | "miembros";

/**
 * Clubes del gimnasio. Los que proponen los atletas salen primero, en amarillo y
 * con sus dos decisiones a la mano; crear uno es un botón que abre una ventana.
 */
export function ClubsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const clubs = useGymClubs(gymId);
  const decide = useDecideClub(gymId);
  const createClub = useCreateGymClub(gymId);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ name: "", club_type: "" });
  const [orden, setOrden] = useState<Orden>("nombre");
  const deciding = (clubId: string) => decide.isPending && decide.variables?.clubId === clubId;
  // Rechazo con motivo: el atleta solicitante LEE esta nota en su app, así que un
  // rechazo mudo es lo peor que puede pasarle a alguien que propuso un club.
  const [rechazando, setRechazando] = useState<GymClub | null>(null);
  const [motivo, setMotivo] = useState("");

  if (!gymId) return <NoGymAssigned />;
  if (clubs.isError) return <PageError onRetry={() => clubs.refetch()} />;

  const onCreate = async () => {
    try {
      await createClub.mutateAsync({ name: form.name.trim(), club_type: form.club_type.trim() });
      notifications.show({ color: "teal", message: `Club "${form.name.trim()}" creado y aprobado.` });
      setForm({ name: "", club_type: "" });
      setCreando(false);
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

  const rows = (clubs.data ?? []).slice().sort(
    (a, b) =>
      (ORDEN_ESTADO[a.status] ?? 1) - (ORDEN_ESTADO[b.status] ?? 1) ||
      (orden === "miembros" ? (b.member_count ?? 0) - (a.member_count ?? 0) : 0) ||
      a.name.localeCompare(b.name, "es"),
  );
  const pendientes = rows.filter((c) => c.status === "pending").length;
  const formValido = !!form.name.trim() && !!form.club_type.trim();

  return (
    <div>
      <PageHeader kicker="Comunidad · Clubes" title="Clubes del gimnasio" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Clubes"
          avisos={
            pendientes > 0 ? (
              <Badge color="yellow" variant="light">
                {pendientes} por aprobar
              </Badge>
            ) : null
          }
        >
          {rows.length > 6 && (
            <SegmentedControl
              size="xs"
              value={orden}
              onChange={(v) => setOrden(v as Orden)}
              aria-label="Ordenar clubes"
              data={[
                { value: "nombre", label: "Nombre" },
                { value: "miembros", label: "Miembros" },
              ]}
            />
          )}
          <Button onClick={() => setCreando(true)}>Nuevo club</Button>
        </Encabezado>

        {clubs.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : rows.length === 0 ? (
          <Text c="dimmed" size="sm">
            Crea el primer club de tu box: running, cycling, rowing…
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
            {rows.map((c) => {
              const pendiente = c.status === "pending";
              return (
                <Tarjeta
                  key={c.id}
                  etiqueta={`Club ${c.name}`}
                  aviso={pendiente}
                  apagada={c.status === "rejected"}
                >
                  <Group gap={8} wrap="nowrap" justify="space-between">
                    <Text fw={700} truncate>
                      {c.name}
                    </Text>
                    <Badge size="xs" variant="light" color={BADGE_COLOR[c.status] ?? "yellow"}>
                      {label(CLUB_STATUS, c.status)}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {c.club_type} · {c.member_count ?? 0} {(c.member_count ?? 0) === 1 ? "miembro" : "miembros"}
                  </Text>
                  {pendiente && (
                    <Group gap="xs" mt="sm">
                      <Button size="xs" loading={deciding(c.id)} onClick={() => onDecidir(c, "approve")}>
                        Aprobar
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        disabled={deciding(c.id)}
                        onClick={() => {
                          setMotivo("");
                          setRechazando(c);
                        }}
                      >
                        Rechazar
                      </Button>
                    </Group>
                  )}
                </Tarjeta>
              );
            })}
          </SimpleGrid>
        )}
      </GlassCard>

      <Modal opened={creando} onClose={() => setCreando(false)} title="Nuevo club" centered>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (formValido) onCreate();
          }}
        >
          <Stack gap="sm">
            <TextInput
              label="Nombre del club"
              placeholder="Runners 1821"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
              data-autofocus
            />
            <TextInput
              label="Tipo"
              placeholder="running, cycling, rowing…"
              value={form.club_type}
              onChange={(e) => setForm({ ...form, club_type: e.currentTarget.value })}
            />
            <Group justify="flex-end" gap="sm" mt="xs">
              <Button variant="default" onClick={() => setCreando(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createClub.isPending} disabled={!formValido}>
                Crear club
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!rechazando}
        onClose={() => setRechazando(null)}
        title={`Rechazar "${rechazando?.name ?? ""}"`}
        centered
      >
        <Textarea
          label="Motivo (lo ve quien lo propuso)"
          placeholder="Ya existe un club de running en el gimnasio…"
          maxLength={255}
          autosize
          minRows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.currentTarget.value)}
          mb="lg"
          data-autofocus
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
