import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGymTickets, useTicketReply, useTicketStatus } from "../api/hooks";
import type { GymTicket } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const STATUS_COLOR: Record<string, string> = {
  open: "yellow",
  in_progress: "blue",
  resolved: "teal",
};

/** Adjunto: miniatura clicable que abre la imagen completa en un modal (antes la
 *  imagen salía a tamaño completo y se veía gigante — ticket bb66e7e7). */
function TicketImage({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="adjunto"
        onClick={() => setOpen(true)}
        style={{ height: 88, width: 88, objectFit: "cover", borderRadius: 8, marginTop: 8, cursor: "zoom-in" }}
      />
      <Modal opened={open} onClose={() => setOpen(false)} size="lg" centered title="Adjunto">
        <img src={src} alt="adjunto" style={{ width: "100%", borderRadius: 8 }} />
      </Modal>
    </>
  );
}

export function TicketsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [filter, setFilter] = useState<string>("");
  const tickets = useGymTickets(gymId, filter || undefined);
  const reply = useTicketReply(gymId);
  const setStatus = useTicketStatus(gymId);
  const [selectedId, setSelectedId] = useState<string>("");
  const [replyText, setReplyText] = useState("");

  if (!gymId) return <NoGymAssigned />;
  if (tickets.isError) return <PageError onRetry={() => tickets.refetch()} />;

  const rows = tickets.data ?? [];
  const selected: GymTicket | undefined = rows.find((t) => t.id === selectedId);

  // Cierre riguroso (ticket bb66e7e7): resolver notifica al atleta → se avisa
  // antes; reabrir un resuelto también se confirma.
  const onChangeStatus = (next: string) => {
    if (!selected || next === selected.status) return;
    if (next === "resolved") {
      if (!window.confirm("Se notificará al atleta que marcaste su reporte como RESUELTO. ¿Continuar?"))
        return;
    } else if (selected.status === "resolved") {
      if (!window.confirm("Este ticket estaba resuelto. ¿Reabrirlo?")) return;
    }
    setStatus.mutate(
      { ticketId: selected.id, status: next },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: next === "resolved" ? "Ticket resuelto; se notificó al atleta." : "Estado actualizado.",
          }),
        onError: () => notifications.show({ color: "red", message: "No se pudo cambiar el estado." }),
      },
    );
  };

  const onReply = async () => {
    if (!selected || !replyText.trim()) return;
    try {
      await reply.mutateAsync({ ticketId: selected.id, body: replyText.trim() });
      setReplyText("");
      notifications.show({ color: "teal", message: "Respuesta enviada." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo responder." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Reportes / tickets"
        subtitle="Lo que reportan tus atletas; respóndelo y gestiónalo hasta resolver."
        action={
          <Select
            value={filter}
            onChange={(v) => setFilter(v ?? "")}
            data={[
              { value: "", label: "Todos" },
              { value: "open", label: "Abiertos" },
              { value: "in_progress", label: "En progreso" },
              { value: "resolved", label: "Resueltos" },
            ]}
            w={170}
          />
        }
      />

      <Grid gutter="lg" align="stretch">
        <Grid.Col span={{ base: 12, lg: selected ? 5 : 12 }}>
        <Card h="100%">
          {tickets.isLoading ? (
            <PageLoading />
          ) : !rows.length ? (
            <EmptyState title="Sin tickets" description="Los reportes de tus atletas aparecerán aquí." />
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Asunto</Table.Th>
                  <Table.Th>Atleta</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((t) => (
                  <Table.Tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    style={{ cursor: "pointer", background: t.id === selectedId ? "var(--mantine-color-dark-6)" : undefined }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500}>{t.subject}</Text>
                      <Text size="xs" c="dimmed">{t.category_display}</Text>
                    </Table.Td>
                    <Table.Td>{t.athlete_name}</Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[t.status]} variant="light">{t.status_display}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
        </Grid.Col>

        {selected && (
          <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card h="100%">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3}>{selected.subject}</Title>
                <Text c="dimmed" size="sm">
                  {selected.category_display} · {selected.athlete_name}
                </Text>
              </div>
              <SegmentedControl
                size="xs"
                value={selected.status}
                onChange={onChangeStatus}
                data={[
                  { value: "open", label: "Abierto" },
                  { value: "in_progress", label: "En progreso" },
                  { value: "resolved", label: "Resuelto" },
                ]}
              />
            </Group>

            <Stack gap="sm" mt="md">
              <Box p="sm" style={{ background: "var(--mantine-color-dark-6)", borderRadius: 8 }}>
                <Text size="xs" c="dimmed" mb={2}>
                  {selected.athlete_name} · {new Date(selected.created_at).toLocaleString("es-GT")}
                </Text>
                <Text size="sm">{selected.body}</Text>
                {selected.photo && <TicketImage src={selected.photo} />}
              </Box>
              {selected.messages.map((m) => (
                <Box
                  key={m.id}
                  p="sm"
                  style={{
                    background: m.is_staff ? "rgba(252,76,2,0.10)" : "var(--mantine-color-dark-6)",
                    borderRadius: 8,
                    alignSelf: m.is_staff ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                  }}
                >
                  <Text size="xs" c="dimmed" mb={2}>
                    {m.author_name} · {new Date(m.created_at).toLocaleString("es-GT")}
                  </Text>
                  <Text size="sm">{m.body}</Text>
                  {m.photo && <TicketImage src={m.photo} />}
                </Box>
              ))}
            </Stack>

            <Group mt="md" align="flex-end">
              <Textarea
                style={{ flex: 1 }}
                placeholder="Escribe una respuesta…"
                value={replyText}
                onChange={(e) => setReplyText(e.currentTarget.value)}
                autosize
                minRows={1}
              />
              <Button onClick={onReply} loading={reply.isPending} disabled={!replyText.trim()}>
                Responder
              </Button>
            </Group>
          </Card>
          </Grid.Col>
        )}
      </Grid>
    </div>
  );
}
