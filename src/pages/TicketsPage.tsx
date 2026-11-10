import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { usePendingSummary, useGymTickets, useTicketReply, useTicketStatus } from "../api/hooks";
import type { GymTicket } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";

const STATUS_COLOR: Record<string, string> = {
  open: "yellow",
  in_progress: "blue",
  resolved: "teal",
};

const FILTROS = [
  { value: "", label: "Todos" },
  { value: "open", label: "Abiertos" },
  { value: "in_progress", label: "En progreso" },
  { value: "resolved", label: "Resueltos" },
];

const ORDEN: Record<GymTicket["status"], number> = { open: 0, in_progress: 1, resolved: 2 };

/**
 * La bandeja con lo que espera respuesta al frente: abiertos, luego en progreso y
 * al final los resueltos. Dentro de cada grupo se respeta el orden del backend.
 */
export function ordenarBandeja<T extends Pick<GymTicket, "status">>(rows: T[]): T[] {
  return rows
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (ORDEN[a.t.status] ?? 9) - (ORDEN[b.t.status] ?? 9) || a.i - b.i)
    .map(({ t }) => t);
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short" });

/** Superficie de una burbuja de conversación: vidrio, nunca un bloque opaco. */
function burbuja(esStaff: boolean) {
  return {
    background: esStaff ? "rgba(252,76,2,0.13)" : "rgba(255,255,255,0.06)",
    border: `1px solid ${esStaff ? "rgba(252,76,2,0.26)" : "var(--a-line)"}`,
    borderRadius: "var(--a-r-control)",
  };
}

/** Adjunto: miniatura que abre la imagen completa en un modal (antes la
 *  imagen salía a tamaño completo y se veía gigante — ticket bb66e7e7). */
function TicketImage({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver foto en grande"
        style={{ padding: 0, border: 0, background: "none", cursor: "zoom-in", display: "block" }}
      >
        <img
          src={src}
          alt="adjunto"
          style={{
            height: "calc(88 * var(--u))",
            width: "calc(88 * var(--u))",
            objectFit: "cover",
            borderRadius: "calc(12 * var(--u))",
            border: "1px solid var(--a-line)",
            marginTop: "calc(8 * var(--u))",
          }}
        />
      </button>
      <Modal opened={open} onClose={() => setOpen(false)} size="lg" centered title="Adjunto">
        <img src={src} alt="adjunto" style={{ width: "100%", borderRadius: "calc(14 * var(--u))" }} />
      </Modal>
    </>
  );
}

export function TicketsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [filter, setFilter] = useState<string>("");
  const tickets = useGymTickets(gymId, filter || undefined);
  const porAtender = usePendingSummary(gymId).data?.tickets ?? 0;
  const [selectedId, setSelectedId] = useState<string>("");

  if (!gymId) return <NoGymAssigned />;

  const rows = ordenarBandeja(tickets.data ?? []);
  const selected: GymTicket | undefined = rows.find((t) => t.id === selectedId);

  return (
    <div>
      <PageHeader kicker="Operación · Soporte" title="Reportes / tickets" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Bandeja"
          avisos={
            porAtender > 0 && (
              <Badge color="yellow" variant="light">
                {porAtender} por atender
              </Badge>
            )
          }
        >
          <SegmentedControl
            size="xs"
            aria-label="Filtrar reportes"
            value={filter}
            onChange={setFilter}
            data={FILTROS}
          />
        </Encabezado>

        {tickets.isError ? (
          <PageError onRetry={() => tickets.refetch()} />
        ) : tickets.isLoading ? (
          <Text size="sm" c="dimmed">
            Cargando…
          </Text>
        ) : rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            {filter ? "Ningún reporte con este filtro." : "Sin reportes. Los que manden tus atletas desde su app llegan aquí."}
          </Text>
        ) : (
          <Stack gap={6}>
            {rows.map((t) => (
              <Tarjeta
                key={t.id}
                etiqueta={`Abrir reporte: ${t.subject}`}
                aviso={t.status === "open"}
                apagada={t.status === "resolved"}
                onClick={() => setSelectedId(t.id)}
              >
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {t.subject}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {t.athlete_name} · {t.category_display} · {fechaCorta(t.created_at)}
                      {t.messages.length > 0 ? ` · 💬 ${t.messages.length}` : ""}
                    </Text>
                  </div>
                  <Badge color={STATUS_COLOR[t.status]} variant="light" style={{ flex: "0 0 auto" }}>
                    {t.status_display}
                  </Badge>
                </Group>
              </Tarjeta>
            ))}
          </Stack>
        )}
      </GlassCard>

      <Conversacion gymId={gymId} ticket={selected ?? null} onClose={() => setSelectedId("")} />
    </div>
  );
}

/** El reporte abierto: estado, conversación y respuesta, en una ventana. */
export function Conversacion({
  gymId,
  ticket,
  onClose,
}: {
  gymId: string;
  ticket: GymTicket | null;
  onClose: () => void;
}) {
  const reply = useTicketReply(gymId);
  const setStatus = useTicketStatus(gymId);
  const [replyText, setReplyText] = useState("");
  // Al abrir otro reporte, la respuesta a medias del anterior no se arrastra.
  const [para, setPara] = useState<string | null>(null);
  if (ticket && para !== ticket.id) {
    setPara(ticket.id);
    setReplyText("");
  }

  // Cierre riguroso (ticket bb66e7e7): resolver notifica al atleta → se avisa
  // antes; reabrir un resuelto también se confirma.
  const onChangeStatus = (next: string) => {
    if (!ticket || next === ticket.status) return;
    if (next === "resolved") {
      if (!window.confirm("Se notificará al atleta que marcaste su reporte como RESUELTO. ¿Continuar?"))
        return;
    } else if (ticket.status === "resolved") {
      if (!window.confirm("Este ticket estaba resuelto. ¿Reabrirlo?")) return;
    }
    setStatus.mutate(
      { ticketId: ticket.id, status: next },
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
    if (!ticket || !replyText.trim()) return;
    try {
      await reply.mutateAsync({ ticketId: ticket.id, body: replyText.trim() });
      setReplyText("");
      notifications.show({ color: "teal", message: "Respuesta enviada." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo responder." });
    }
  };

  return (
    <Modal opened={!!ticket} onClose={onClose} title={ticket?.subject ?? ""} size="lg" centered>
      {ticket && (
        <>
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Text c="dimmed" size="sm">
              {ticket.category_display} · {ticket.athlete_name}
            </Text>
            <SegmentedControl
              size="xs"
              aria-label="Estado del reporte"
              value={ticket.status}
              onChange={onChangeStatus}
              disabled={setStatus.isPending}
              data={[
                { value: "open", label: "Abierto" },
                { value: "in_progress", label: "En progreso" },
                { value: "resolved", label: "Resuelto" },
              ]}
            />
          </Group>

          <Stack gap="sm" mt="md">
            <Box p="sm" style={burbuja(false)}>
              <Text size="xs" c="dimmed" mb={2}>
                {ticket.athlete_name} · {new Date(ticket.created_at).toLocaleString("es-GT")}
              </Text>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {ticket.body}
              </Text>
              {ticket.photo && <TicketImage src={ticket.photo} />}
            </Box>
            {ticket.messages.map((m) => (
              <Box
                key={m.id}
                p="sm"
                style={{
                  ...burbuja(m.is_staff),
                  alignSelf: m.is_staff ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <Text size="xs" c="dimmed" mb={2}>
                  {m.author_name} · {new Date(m.created_at).toLocaleString("es-GT")}
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {m.body}
                </Text>
                {m.photo && <TicketImage src={m.photo} />}
              </Box>
            ))}
          </Stack>

          <Textarea
            mt="md"
            placeholder="Escribe una respuesta…"
            aria-label="Respuesta"
            value={replyText}
            onChange={(e) => setReplyText(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group justify="flex-end" mt="sm">
            <Button onClick={onReply} loading={reply.isPending} disabled={!replyText.trim()}>
              Responder
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
