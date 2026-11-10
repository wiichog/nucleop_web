import { useState } from "react";
import { Badge, Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { usePlatformAppeals, useDecidePlatformAppeal } from "../api/hooks";
import type { Appeal } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, useCuentaSinCargar } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { useAuth } from "../lib/auth";

const ESTADO_COLOR: Record<string, string> = {
  escalated: "yellow",
  accepted: "teal",
  rejected: "gray",
};

const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * Última instancia del debido proceso: el atleta apeló, su gimnasio mantuvo la
 * decisión y pidió que Nucleo lo revise. Aquí no hay otra vuelta.
 *
 * Sólo llegan apelaciones `escalated`: las `pending` las resuelve el gym en su
 * propio panel, y la autoridad de ese ámbito la impone el backend.
 *
 * La lista es corta a propósito (quién, de qué gym, qué se quitó); tocar un caso
 * abre la ficha con todo el contexto y las dos decisiones, así nadie resuelve sin
 * haber leído las dos versiones.
 */
export function PlatformAppealsPage() {
  const { isSuperuser } = useAuth();
  const sinCuenta = useCuentaSinCargar();
  // Sin selector de estado a propósito: pedir `all` traería también las
  // apelaciones que cada gimnasio todavía está resolviendo en su propio panel.
  const appeals = usePlatformAppeals(undefined, isSuperuser);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);

  // Si /me falló, `isSuperuser` también es false: no negarle el acceso a un superadmin.
  if (sinCuenta) return sinCuenta;
  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Apelaciones" />
        <EmptyState title="Sin acceso" description="Esta bandeja es del equipo de Nucleo." />
      </Stack>
    );
  }

  const filas = (appeals.data ?? [])
    .slice()
    // Lo que espera decisión primero; dentro, lo más viejo primero (lleva más esperando).
    .sort(
      (a, b) =>
        Number(b.status === "escalated") - Number(a.status === "escalated") ||
        (a.escalated_at ?? a.created_at).localeCompare(b.escalated_at ?? b.created_at),
    );
  const porResolver = filas.filter((a) => a.status === "escalated").length;
  const abierta = filas.find((a) => a.id === abiertaId) ?? null;

  return (
    <div>
      <PageHeader kicker="Plataforma · Comunidad" title="Apelaciones" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Por resolver"
          avisos={
            porResolver > 0 && (
              <Badge color="yellow" variant="light">
                {porResolver} por resolver
              </Badge>
            )
          }
        />

        {appeals.isError ? (
          <PageError
            message={errMsg(appeals.error, "No se pudieron cargar las apelaciones.")}
            onRetry={() => appeals.refetch()}
          />
        ) : appeals.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : !filas.length ? (
          <Text c="dimmed" size="sm">
            No hay apelaciones esperando a Nucleo.
          </Text>
        ) : (
          <Stack gap={6}>
            {filas.map((a) => (
              <Tarjeta
                key={a.id}
                etiqueta={`Abrir la apelación de ${a.athlete_name}`}
                onClick={() => setAbiertaId(a.id)}
                aviso={a.status === "escalated"}
                apagada={a.status !== "escalated"}
              >
                <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm">
                      <b>{a.athlete_name}</b>{" "}
                      <Text span c="dimmed">
                        · {a.gym_name} · {cuando(a.escalated_at ?? a.created_at)}
                      </Text>
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                      {a.content_excerpt || "(sin texto: era una foto o un video)"}
                    </Text>
                  </div>
                  <Group gap={4} wrap="nowrap">
                    <Badge size="xs" variant="light" color="flame">
                      {a.kind === "post" ? "Publicación" : "Comentario"}
                    </Badge>
                    {a.status !== "escalated" && (
                      <Badge size="xs" variant="light" color={ESTADO_COLOR[a.status] ?? "gray"}>
                        {a.status_display}
                      </Badge>
                    )}
                  </Group>
                </Group>
              </Tarjeta>
            ))}
          </Stack>
        )}
      </GlassCard>

      <ApelacionModal appeal={abierta} onClose={() => setAbiertaId(null)} />
    </div>
  );
}

/** La ficha del caso: lo que se quitó, por qué, lo que dice el atleta y la decisión. */
function ApelacionModal({ appeal, onClose }: { appeal: Appeal | null; onClose: () => void }) {
  const decidir = useDecidePlatformAppeal();
  const [nota, setNota] = useState("");
  const [paraId, setParaId] = useState<string | null>(null);
  // La nota es de ESTE caso: si se abre otro, empieza vacía.
  if (appeal && paraId !== appeal.id) {
    setParaId(appeal.id);
    setNota("");
  }

  const resolver = async (action: "accept" | "reject") => {
    if (!appeal) return;
    try {
      await decidir.mutateAsync({ appealId: appeal.id, action, note: nota.trim() });
      notifications.show({
        message:
          action === "accept"
            ? "Apelación aceptada: el contenido vuelve al feed."
            : "Apelación rechazada: la decisión del gimnasio queda en firme.",
      });
      onClose();
    } catch (err) {
      notifications.show({ color: "red", message: errMsg(err, "No se pudo resolver.") });
    }
  };

  const enEspera = appeal?.status === "escalated";
  const decidiendo = (a: "accept" | "reject") => decidir.isPending && decidir.variables?.action === a;

  return (
    <Modal
      opened={!!appeal}
      onClose={onClose}
      title={appeal ? `${appeal.athlete_name} · ${appeal.gym_name}` : ""}
      centered
      size="lg"
    >
      {appeal && (
        <Stack gap="md">
          <Group gap={6}>
            <Badge size="sm" variant="light" color="flame">
              {appeal.kind === "post" ? "Publicación" : "Comentario"}
            </Badge>
            <Badge size="sm" variant="light" color={ESTADO_COLOR[appeal.status] ?? "gray"}>
              {appeal.status_display}
            </Badge>
            <Text size="xs" c="dimmed">
              {new Date(appeal.created_at).toLocaleString("es-GT")}
            </Text>
          </Group>

          <div>
            <SectionLabel mb={4}>Contenido sancionado</SectionLabel>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {appeal.content_excerpt || "(sin texto: era una foto o un video)"}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Motivo del gimnasio: {appeal.content_reason_display || "sin motivo registrado"}
              {appeal.content_note ? ` · ${appeal.content_note}` : ""}
            </Text>
          </div>

          <div>
            <SectionLabel mb={4}>Lo que dice el atleta</SectionLabel>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {appeal.body}
            </Text>
          </div>

          {appeal.resolution_note && (
            <Text size="xs" c="dimmed">
              Resolución registrada: {appeal.resolution_note}
            </Text>
          )}

          {enEspera ? (
            <>
              <Textarea
                label="Nota para el atleta (opcional)"
                value={nota}
                onChange={(e) => setNota(e.currentTarget.value)}
                autosize
                minRows={2}
                maxLength={255}
              />
              <Group justify="flex-end" gap="xs">
                <Button
                  color="red"
                  variant="light"
                  loading={decidiendo("reject")}
                  disabled={decidir.isPending && !decidiendo("reject")}
                  onClick={() => resolver("reject")}
                >
                  Mantener la decisión
                </Button>
                <Button
                  loading={decidiendo("accept")}
                  disabled={decidir.isPending && !decidiendo("accept")}
                  onClick={() => resolver("accept")}
                >
                  Aceptar y republicar
                </Button>
              </Group>
            </>
          ) : (
            <Text size="xs" c="dimmed">
              Ya resuelta.
            </Text>
          )}
        </Stack>
      )}
    </Modal>
  );
}
