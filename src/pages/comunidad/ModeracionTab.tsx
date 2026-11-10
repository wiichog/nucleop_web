import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useDecideAppeal,
  useDecideComment,
  useDecidePost,
  useGymAppeals,
  useGymPendingPosts,
  useGymReportedComments,
  useModerationSignals,
} from "../../api/hooks";
import { MOTIVOS_MODERACION } from "../../api/types";
import type { Appeal, MotivoModeracion } from "../../api/types";
import { GlassCard } from "../../components/aurora";
import { PageError } from "../../components/PageStatus";
import { SectionLabel } from "../../components/ui";
import { Encabezado, Tarjeta } from "../../components/Tarjeta";
import { errMsg } from "../../lib/errors";
import { fecha, fechaHora, Medios, MEDIA_FRAME, thumb } from "./media";

/** Color de la pastilla de estado de una apelación. */
const APPEAL_COLOR: Record<string, string> = {
  pending: "yellow",
  escalated: "orange",
  accepted: "teal",
  rejected: "gray",
};

const ok = (message: string) => notifications.show({ color: "teal", message });
const fail = (e: unknown, fallback: string) =>
  notifications.show({ color: "red", message: errMsg(e, fallback) });

/**
 * Lo único de la pantalla que espera una decisión, por eso va primero y todo a
 * la vista: publicaciones por aprobar, comentarios reportados (ya ocultos del
 * feed) y apelaciones. Una cola vacía no se pinta; una que FALLA sí, siempre:
 * "no hay nada que moderar" es el peor error posible en una bandeja de moderación.
 */
export function ModeracionTab({ gymId }: { gymId: string }) {
  const pendingPosts = useGymPendingPosts(gymId);
  const decidePost = useDecidePost(gymId);
  const reportedComments = useGymReportedComments(gymId);
  const decideComment = useDecideComment(gymId);
  const appeals = useGymAppeals(gymId);
  const decideAppeal = useDecideAppeal(gymId);

  // Rechazar exige motivo: se resuelve en un modal, nunca en el botón directo.
  const [rechazo, setRechazo] = useState<{
    tipo: "post" | "comment";
    id: string;
    quien: string;
  } | null>(null);
  const [motivo, setMotivo] = useState<MotivoModeracion | null>(null);
  const [nota, setNota] = useState("");
  // Resolución de una apelación (aceptar republica; rechazar mantiene la sanción).
  const [resolucion, setResolucion] = useState<{
    appeal: Appeal;
    action: "accept" | "reject";
  } | null>(null);
  const [notaApelacion, setNotaApelacion] = useState("");

  const posts = pendingPosts.data ?? [];
  const comentarios = reportedComments.data ?? [];
  const apelaciones = appeals.data ?? [];
  const total = posts.length + comentarios.length + apelaciones.length;
  const cargando = pendingPosts.isLoading || reportedComments.isLoading || appeals.isLoading;
  const algunError = pendingPosts.isError || reportedComments.isError || appeals.isError;

  /** Aprueba un post pendiente. El rechazo va por el modal de motivo. */
  const aprobarPost = (postId: string) =>
    decidePost.mutate(
      { postId, action: "approve" },
      {
        onSuccess: () => ok("Publicación aprobada: ya está en el feed."),
        onError: (e) => fail(e, "No se pudo moderar la publicación."),
      },
    );

  /** Devuelve el comentario al feed. El borrado va por el modal de motivo. */
  const restaurarComentario = (commentId: string) =>
    decideComment.mutate(
      { commentId, action: "approve" },
      {
        onSuccess: () => ok("Comentario restaurado: volvió a verse en el feed."),
        onError: (e) => fail(e, "No se pudo moderar el comentario."),
      },
    );

  const abrirRechazo = (tipo: "post" | "comment", id: string, quien: string) => {
    setRechazo({ tipo, id, quien });
    setMotivo(null);
    setNota("");
  };

  /**
   * Confirma el rechazo con su motivo. El motivo es OBLIGATORIO en el backend
   * (400 `reason_required`): es lo que se le dice al autor y lo único contra lo
   * que puede defenderse si apela. La nota es una aclaración libre y opcional.
   */
  const confirmarRechazo = () => {
    if (!rechazo || !motivo) return;
    const comun = { reason: motivo, note: nota.trim() };
    const onError = (e: unknown) => fail(e, "No se pudo aplicar la decisión.");
    if (rechazo.tipo === "post") {
      decidePost.mutate(
        { postId: rechazo.id, action: "reject", ...comun },
        {
          onSuccess: () => {
            setRechazo(null);
            ok("Publicación rechazada. El autor recibe el motivo y puede debatirlo.");
          },
          onError,
        },
      );
    } else {
      decideComment.mutate(
        { commentId: rechazo.id, action: "reject", ...comun },
        {
          onSuccess: () => {
            setRechazo(null);
            ok("Comentario eliminado. El autor recibe el motivo.");
          },
          onError,
        },
      );
    }
  };

  /**
   * Resuelve una apelación. **Aceptar republica el contenido**: el post vuelve al
   * feed y el comentario deja de estar oculto. Rechazar mantiene la sanción, y el
   * atleta puede pedirle una última revisión a Nucleo.
   */
  const confirmarApelacion = () => {
    if (!resolucion) return;
    const { appeal, action } = resolucion;
    decideAppeal.mutate(
      { appealId: appeal.id, action, note: notaApelacion.trim() },
      {
        onSuccess: () => {
          setResolucion(null);
          ok(
            action === "accept"
              ? appeal.kind === "post"
                ? "Apelación aceptada: la publicación volvió al feed."
                : "Apelación aceptada: el comentario volvió al feed."
              : "Apelación rechazada. La decisión se mantiene y el atleta ya lo sabe.",
          );
        },
        onError: (e) => fail(e, "No se pudo resolver la apelación."),
      },
    );
  };

  const resolver = (appeal: Appeal, action: "accept" | "reject") => {
    setResolucion({ appeal, action });
    setNotaApelacion("");
  };

  return (
    <>
      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Por moderar"
          avisos={
            total > 0 ? (
              <Badge color="yellow" variant="light">
                {total} {total === 1 ? "pendiente" : "pendientes"}
              </Badge>
            ) : null
          }
        />

        {cargando ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : total === 0 && !algunError ? (
          <Text c="dimmed" size="sm">
            Nada pendiente.
          </Text>
        ) : null}

        <Stack gap="xl">
          {/* Publicaciones que todavía no salen al feed. */}
          {pendingPosts.isError ? (
            <PageError
              message="No se pudo cargar la bandeja de moderación. Puede haber publicaciones esperando."
              onRetry={() => pendingPosts.refetch()}
            />
          ) : posts.length > 0 ? (
            <section>
              <Seccion titulo="Publicaciones" n={posts.length} />
              <Stack gap={6}>
                {posts.map((p) => (
                  <Tarjeta key={p.id} etiqueta={`Publicación de ${p.author_name ?? p.athlete_name}`}>
                    <Group gap={6} mb={4}>
                      <Badge size="xs" variant="light" color={p.author_type === "coach" ? "grape" : "flame"}>
                        {p.author_type === "coach" ? "Coach" : "Atleta"}
                      </Badge>
                      {(p.report_count ?? 0) > 0 && (
                        <Badge size="xs" variant="filled" color="red">
                          Reportado ×{p.report_count}
                        </Badge>
                      )}
                      {p.moderation_label && (
                        <Badge size="xs" variant="light" color="orange" title="Marcado por moderación automática (IA)">
                          IA: {p.moderation_label}
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        <b>{p.author_name ?? p.athlete_name}</b> · {fechaHora(p.created_at)}
                      </Text>
                    </Group>
                    {p.body && (
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {p.body}
                      </Text>
                    )}
                    <Medios
                      media={
                        p.media && p.media.length
                          ? p.media
                          : p.photo
                            ? [{ url: p.photo, kind: "image" as const }]
                            : []
                      }
                    />
                    <Group gap="xs" mt="sm">
                      <Button size="xs" loading={decidePost.isPending} onClick={() => aprobarPost(p.id)}>
                        Aprobar
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => abrirRechazo("post", p.id, p.author_name ?? p.athlete_name)}
                      >
                        Rechazar…
                      </Button>
                    </Group>
                  </Tarjeta>
                ))}
              </Stack>
            </section>
          ) : null}

          {/* Comentarios reportados: ya están OCULTOS del feed. Si esta cola
              fallara en silencio, ocultar un comentario no tendría vuelta atrás. */}
          {reportedComments.isError ? (
            <PageError
              message="No se pudo cargar la cola de comentarios reportados. Puede haber comentarios ocultos esperando tu revisión."
              onRetry={() => reportedComments.refetch()}
            />
          ) : comentarios.length > 0 ? (
            <section>
              <Seccion titulo="Comentarios reportados" n={comentarios.length} />
              <Stack gap={6}>
                {comentarios.map((c) => (
                  <Tarjeta key={c.id} etiqueta={`Comentario de ${c.athlete_name}`}>
                    <Group gap={6} mb={4}>
                      <Badge size="xs" variant="filled" color="red">
                        Reportado ×{c.report_count}
                      </Badge>
                      {c.hidden && (
                        <Badge size="xs" variant="light" color="orange" title="Está fuera del feed mientras lo revisas">
                          Oculto del feed
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        <b>{c.athlete_name}</b> · {fechaHora(c.created_at)}
                      </Text>
                    </Group>
                    {c.body && (
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {c.body}
                      </Text>
                    )}
                    {c.image && (
                      <img
                        src={c.image}
                        alt=""
                        style={{ ...MEDIA_FRAME, width: 280, maxWidth: "100%", marginTop: 8 }}
                      />
                    )}
                    <Group gap="xs" mt="sm">
                      <Button size="xs" loading={decideComment.isPending} onClick={() => restaurarComentario(c.id)}>
                        Restaurar
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => abrirRechazo("comment", c.id, c.athlete_name)}
                      >
                        Eliminar…
                      </Button>
                    </Group>
                  </Tarjeta>
                ))}
              </Stack>
            </section>
          ) : null}

          {/* Atletas que piden que revises de nuevo una decisión tuya. */}
          {appeals.isError ? (
            <PageError
              message="No se pudo cargar la cola de apelaciones. Puede haber atletas esperando respuesta."
              onRetry={() => appeals.refetch()}
            />
          ) : apelaciones.length > 0 ? (
            <section>
              <Seccion titulo="Apelaciones" n={apelaciones.length} />
              <Stack gap={6}>
                {apelaciones.map((a) => (
                  <Tarjeta key={a.id} etiqueta={`Apelación de ${a.athlete_name}`} apagada={a.status !== "pending"}>
                    <Group gap={6} mb={6}>
                      <Badge size="xs" variant="light" color="flame">
                        {a.kind === "post" ? "Publicación" : "Comentario"}
                      </Badge>
                      <Badge size="xs" variant="light" color={APPEAL_COLOR[a.status] ?? "gray"}>
                        {a.status_display}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        <b>{a.athlete_name}</b> · {fechaHora(a.created_at)}
                      </Text>
                    </Group>

                    <SectionLabel mb={2}>Contenido sancionado</SectionLabel>
                    <Text size="sm" c="dimmed">
                      {a.content_excerpt || "(sin texto: era una foto o un video)"}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      Motivo: {a.content_reason_display || "sin motivo registrado"}
                      {a.content_note ? ` · ${a.content_note}` : ""}
                    </Text>

                    <SectionLabel mb={2} mt={10}>
                      Lo que dice el atleta
                    </SectionLabel>
                    <Text size="sm">{a.body}</Text>

                    {a.resolution_note && (
                      <Text size="xs" c="dimmed" mt={8}>
                        Tu respuesta: {a.resolution_note}
                      </Text>
                    )}

                    {a.status === "pending" ? (
                      <Group gap="xs" mt="sm">
                        <Button size="xs" loading={decideAppeal.isPending} onClick={() => resolver(a, "accept")}>
                          Aceptar y republicar
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          loading={decideAppeal.isPending}
                          onClick={() => resolver(a, "reject")}
                        >
                          Mantener la decisión
                        </Button>
                      </Group>
                    ) : (
                      <Text size="xs" c="dimmed" mt="sm">
                        {a.status === "escalated"
                          ? "El atleta pidió una última revisión a Nucleo. Ya no la resuelve el gimnasio."
                          : "Ya resuelta."}
                      </Text>
                    )}
                  </Tarjeta>
                ))}
              </Stack>
            </section>
          ) : null}
        </Stack>
      </GlassCard>

      <SenalModeracion gymId={gymId} />

      {/* Rechazar exige motivo: sin él el backend responde 400 `reason_required`,
          y sin él el autor no sabe qué corregir ni contra qué apelar. */}
      <Modal
        opened={!!rechazo}
        onClose={() => setRechazo(null)}
        title={rechazo?.tipo === "post" ? "Rechazar publicación" : "Eliminar comentario"}
        centered
      >
        <Stack gap="md">
          {/* El comentario se borra de verdad en el backend (`comment.delete()`): no queda
              nada que apelar ni que devolver al feed. Sólo el post rechazado es apelable.
              Es la única advertencia que se queda: no hay vuelta atrás. */}
          {rechazo?.tipo === "comment" && (
            <Text size="sm" c="red">
              {`El comentario de ${rechazo?.quien} se borra para siempre y ya no podrá apelar. Si dudas, «Cancelar» y queda oculto.`}
            </Text>
          )}
          <Select
            label="Motivo"
            placeholder="Elige un motivo (lo ve el autor)"
            value={motivo}
            onChange={(v) => setMotivo(v as MotivoModeracion | null)}
            data={MOTIVOS_MODERACION}
          />
          <Textarea
            label="Nota para el autor (opcional)"
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={255}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setRechazo(null)}>
              Cancelar
            </Button>
            <Button
              color="red"
              disabled={!motivo}
              loading={decidePost.isPending || decideComment.isPending}
              onClick={confirmarRechazo}
            >
              {rechazo?.tipo === "post" ? "Rechazar" : "Eliminar"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Resolver una apelación. Aceptar NO es sólo cerrar el caso: republica. */}
      <Modal
        opened={!!resolucion}
        onClose={() => setResolucion(null)}
        title={resolucion?.action === "accept" ? "Aceptar la apelación" : "Mantener la decisión"}
        centered
      >
        <Stack gap="md">
          <Textarea
            label="Nota para el atleta (opcional)"
            value={notaApelacion}
            onChange={(e) => setNotaApelacion(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={255}
            data-autofocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setResolucion(null)}>
              Cancelar
            </Button>
            <Button
              color={resolucion?.action === "accept" ? "flame" : "red"}
              loading={decideAppeal.isPending}
              onClick={confirmarApelacion}
            >
              {resolucion?.action === "accept" ? "Aceptar y republicar" : "Mantener la decisión"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function Seccion({ titulo, n }: { titulo: string; n: number }) {
  return (
    <Group gap="xs" mb="sm">
      <Title order={4}>{titulo}</Title>
      <Badge color="yellow" variant="light" size="sm">
        {n}
      </Badge>
    </Group>
  );
}

/**
 * Señal de moderación: agregados ANÓNIMOS de bloqueos y reportes. Sirve para
 * decidir si hablar con alguien, no para saber quién lo bloqueó — eso no se
 * muestra nunca (en un box de 30 personas un solo bloqueo delata a quien lo hizo).
 * Cómo leerla vive en el manual de la pantalla.
 */
function SenalModeracion({ gymId }: { gymId: string }) {
  const signals = useModerationSignals(gymId);
  const filas = signals.data ?? [];
  return (
    <GlassCard delay={0.7} padding={18} style={{ marginTop: "calc(20 * var(--u))" }}>
      <Encabezado titulo="Señal de moderación" />
      {signals.isError ? (
        <PageError message="No se pudo cargar la señal de moderación." onRetry={() => signals.refetch()} />
      ) : signals.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !filas.length ? (
        <Text c="dimmed" size="sm">
          Nadie llega al umbral.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {filas.map((s) => (
            <Tarjeta key={s.athlete_id} etiqueta={s.athlete_name}>
              <Group gap="sm" wrap="nowrap">
                {s.athlete_avatar && <img src={s.athlete_avatar} alt="" style={thumb(32, true)} />}
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>
                    {s.athlete_name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {s.bloqueos} {s.bloqueos === 1 ? "bloqueo" : "bloqueos"} · {s.reportes}{" "}
                    {s.reportes === 1 ? "reporte" : "reportes"}
                    {s.ultima_senal ? ` · ${fecha(s.ultima_senal)}` : ""}
                  </Text>
                </div>
              </Group>
            </Tarjeta>
          ))}
        </SimpleGrid>
      )}
    </GlassCard>
  );
}
