import { useState } from "react";
import { Badge, Box, Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { usePlatformAppeals, useDecidePlatformAppeal } from "../api/hooks";
import type { Appeal } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { useAuth } from "../lib/auth";

const ESTADO_COLOR: Record<string, string> = {
  escalated: "orange",
  accepted: "teal",
  rejected: "gray",
};

/**
 * Última instancia del debido proceso: el atleta apeló, su gimnasio mantuvo la
 * decisión y pidió que Nucleo lo revise. Aquí no hay otra vuelta — lo que se
 * resuelva queda en firme, y por eso la pantalla lo dice en voz alta.
 *
 * Sólo llegan apelaciones `escalated`: las `pending` las resuelve el gym en su
 * propio panel, y la autoridad de ese ámbito la impone el backend.
 */
export function PlatformAppealsPage() {
  const { isSuperuser } = useAuth();
  // Sin selector de estado a propósito: el endpoint acepta cualquiera, y pedir
  // `all` traería también las apelaciones que cada gimnasio todavía está
  // resolviendo en su propio panel. Eso no es asunto de esta bandeja — aquí sólo
  // llega lo que el atleta escaló a Nucleo.
  const appeals = usePlatformAppeals(undefined, isSuperuser);
  const decidir = useDecidePlatformAppeal();
  const [resolucion, setResolucion] = useState<{
    appeal: Appeal;
    action: "accept" | "reject";
  } | null>(null);
  const [nota, setNota] = useState("");

  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Apelaciones escaladas" />
        <EmptyState
          title="Sin acceso"
          description="Esta bandeja es del equipo de Nucleo."
        />
      </Stack>
    );
  }

  const confirmar = async () => {
    if (!resolucion) return;
    try {
      await decidir.mutateAsync({
        appealId: resolucion.appeal.id,
        action: resolucion.action,
        note: nota.trim(),
      });
      notifications.show({
        message:
          resolucion.action === "accept"
            ? "Apelación aceptada: el contenido vuelve al feed."
            : "Apelación rechazada: la decisión del gimnasio queda en firme.",
      });
      setResolucion(null);
      setNota("");
    } catch (err) {
      notifications.show({ color: "red", message: errMsg(err, "No se pudo resolver.") });
    }
  };

  const filas = appeals.data ?? [];

  return (
    <Stack>
      <PageHeader
        title="Apelaciones escaladas"
        subtitle="Última instancia del debido proceso. Lo que resuelvas aquí queda en firme."
      />

      <GlassCard variant="core">
        <Text c="dimmed" size="sm" mb="md">
          Un atleta apeló una sanción, su gimnasio la mantuvo y pidió que Nucleo la revise.
          Es la última instancia: lo que decidas aquí queda en firme.
        </Text>

        {appeals.isError ? (
          <PageError
            message={errMsg(appeals.error, "No se pudieron cargar las apelaciones.")}
            onRetry={() => appeals.refetch()}
          />
        ) : appeals.isLoading ? (
          <PageLoading />
        ) : !filas.length ? (
          <Text c="dimmed" size="sm">
            No hay apelaciones esperando a Nucleo.
          </Text>
        ) : (
          <Stack gap="sm">
            {filas.map((a) => (
              <Box
                key={a.id}
                p="sm"
                style={{ border: "1px solid var(--a-line)", borderRadius: "calc(16 * var(--u))" }}
              >
                <Group gap={6} mb={6}>
                  <Badge size="xs" variant="light" color="flame">
                    {a.kind === "post" ? "Publicación" : "Comentario"}
                  </Badge>
                  <Badge size="xs" variant="light" color={ESTADO_COLOR[a.status] ?? "gray"}>
                    {a.status_display}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {a.athlete_name} · {a.gym_name} ·{" "}
                    {new Date(a.created_at).toLocaleString("es-GT")}
                  </Text>
                </Group>

                <SectionLabel mb={4}>Contenido sancionado</SectionLabel>
                <Text size="sm" c="dimmed">
                  {a.content_excerpt || "(sin texto: era una foto o un video)"}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Motivo del gimnasio: {a.content_reason_display || "sin motivo registrado"}
                  {a.content_note ? ` · ${a.content_note}` : ""}
                </Text>

                <SectionLabel mb={4} mt={12}>
                  Lo que dice el atleta
                </SectionLabel>
                <Text size="sm">{a.body}</Text>

                {a.resolution_note && (
                  <Text size="xs" c="dimmed" mt={8}>
                    Resolución registrada: {a.resolution_note}
                  </Text>
                )}

                {a.status === "escalated" ? (
                  <Group gap="xs" mt="sm">
                    <Button
                      size="xs"
                      loading={decidir.isPending}
                      onClick={() => {
                        setResolucion({ appeal: a, action: "accept" });
                        setNota("");
                      }}
                    >
                      Aceptar y republicar
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      color="red"
                      loading={decidir.isPending}
                      onClick={() => {
                        setResolucion({ appeal: a, action: "reject" });
                        setNota("");
                      }}
                    >
                      Mantener la decisión
                    </Button>
                  </Group>
                ) : (
                  <Text size="xs" c="dimmed" mt="sm">
                    Ya resuelta.
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>

      <Modal
        opened={!!resolucion}
        onClose={() => setResolucion(null)}
        title={
          resolucion?.action === "accept" ? "Aceptar la apelación" : "Mantener la decisión"
        }
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {resolucion?.action === "accept"
              ? "El contenido vuelve al feed y se le avisa al atleta."
              : "El contenido sigue fuera del feed. Se le avisa al atleta y ya no hay otra revisión."}
          </Text>
          <Textarea
            label="Nota para el atleta (opcional)"
            placeholder="Explica en una línea por qué se resolvió así."
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={255}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResolucion(null)}>
              Cancelar
            </Button>
            <Button
              color={resolucion?.action === "accept" ? undefined : "red"}
              loading={decidir.isPending}
              onClick={confirmar}
            >
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
