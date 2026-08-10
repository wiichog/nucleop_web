import { FormEvent, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  FileInput,
  Grid,
  Group,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Newspaper, ShieldAlert, Trophy, Users } from "lucide-react";
import {
  useAthletesOfMonth,
  useAthletesOfMonthHistory,
  useDecideAppeal,
  useDecideComment,
  useDecidePost,
  useDeleteAnnouncement,
  useGymAnnouncements,
  useGymAppeals,
  useGymClasses,
  useGymFeed,
  useGymPendingPosts,
  useGymReportedComments,
  useMemberships,
  useModerationSignals,
  usePostAnnouncement,
  useSetAthleteOfMonth,
  useUpdateAnnouncement,
} from "../api/hooks";
import { MOTIVOS_MODERACION } from "../api/types";
import type { Appeal, GymAnnouncement, MotivoModeracion, ReportedComment } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { BigMetric, GlassCard, MetricTile, Stagger } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";

const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
};

function reactionSummary(reactions?: Record<string, number>): string {
  if (!reactions) return "";
  return Object.entries(reactions)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${REACTION_EMOJI[type] ?? type} ${n}`)
    .join("  ");
}

const KIND_LABEL: Record<string, string> = {
  pr: "PR",
  badge: "Badge",
  points: "Puntos",
  athlete_of_month: "Atleta del mes",
  challenge: "Reto",
  announcement: "Anuncio",
  athlete_post: "Post",
};

/**
 * Marco del material para fotos y videos: hairline y radio del sistema, sin
 * fondo propio. En esta pantalla el contenido es la imagen; el vidrio la
 * enmarca, no compite con ella.
 */
const MEDIA_FRAME = {
  borderRadius: "calc(14 * var(--u))",
  border: "1px solid var(--a-line)",
  display: "block",
} as const;

/** Color de la pastilla de estado de una apelación. */
const APPEAL_COLOR: Record<string, string> = {
  pending: "yellow",
  escalated: "orange",
  accepted: "teal",
  rejected: "gray",
};

/** Miniatura cuadrada (atleta del mes, avatares del histórico). */
function thumb(size: number, round = false) {
  return {
    width: size,
    height: size,
    objectFit: "cover" as const,
    borderRadius: round ? "50%" : "calc(12 * var(--u))",
    border: "1px solid var(--a-line)",
    display: "block",
  };
}

/**
 * Anuncios ya publicados, con corrección y baja.
 *
 * Hasta ahora el panel sólo sabía CREAR: un anuncio con la hora equivocada —que
 * además ya salió por push a todo el gimnasio— era irreversible, y la única
 * salida era publicar otro encima. Corregir NO vuelve a notificar (repetir el
 * push por arreglar una tilde es spam) y la baja es en blando: el anuncio
 * desaparece del feed y del panel, pero queda el rastro de que se publicó.
 */
function AnunciosPublicados({
  gymId,
  classTypes,
}: {
  gymId: string;
  classTypes: string[];
}) {
  const anuncios = useGymAnnouncements(gymId);
  const actualizar = useUpdateAnnouncement(gymId);
  const borrar = useDeleteAnnouncement(gymId);

  const [editando, setEditando] = useState<GymAnnouncement | null>(null);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [segmento, setSegmento] = useState<string | null>("");
  const [foto, setFoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  const abrir = (a: GymAnnouncement) => {
    setEditando(a);
    setTitulo(a.title);
    setCuerpo(a.body);
    setSegmento(a.class_type ?? "");
    setFoto(null);
    setVideo(null);
  };

  const guardar = async () => {
    if (!editando) return;
    try {
      await actualizar.mutateAsync({
        id: editando.id,
        title: titulo,
        body: cuerpo,
        class_type: segmento ?? "",
        photo: foto,
        video,
      });
      setEditando(null);
      notifications.show({
        color: "teal",
        message: "Anuncio corregido. No se volvió a notificar a nadie.",
      });
    } catch (e) {
      notifications.show({
        color: "red",
        message: errMsg(e, "No se pudo corregir el anuncio."),
      });
    }
  };

  const darDeBaja = (a: GymAnnouncement) => {
    if (
      !window.confirm(
        `¿Quitar del feed el anuncio "${a.title}"?\n\nDeja de verse en la app. El push que ya salió no se puede deshacer.`,
      )
    )
      return;
    borrar.mutate(a.id, {
      onSuccess: () =>
        notifications.show({ color: "teal", message: "Anuncio quitado del feed." }),
      onError: (e) =>
        notifications.show({ color: "red", message: errMsg(e, "No se pudo quitar el anuncio.") }),
    });
  };

  const filas = anuncios.data ?? [];
  // Publicar y corregir anuncios es del `gym_admin`; un coach entra a esta misma
  // pantalla por la cola de moderación. Un 403 no es una falla que reportarle.
  if ((anuncios.error as { response?: { status?: number } })?.response?.status === 403) return null;

  return (
    <GlassCard padding={24} delay={0.9} style={{ marginTop: "calc(20 * var(--u))" }}>
      <SectionLabel as="h2" mb={8}>
        Anuncios publicados
      </SectionLabel>
      <Text c="dimmed" size="sm" mb="md">
        Lo que ya está en el feed de tus atletas. Corrige el texto sin volver a notificar, o quítalo
        si se publicó por error.
      </Text>

      {anuncios.isError ? (
        <PageError
          message="No se pudieron cargar los anuncios publicados."
          onRetry={() => anuncios.refetch()}
        />
      ) : anuncios.isLoading ? (
        <PageLoading />
      ) : !filas.length ? (
        <Text c="dimmed" size="sm">
          Todavía no has publicado ningún anuncio.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Publicado</Table.Th>
                <Table.Th>Anuncio</Table.Th>
                <Table.Th>Segmento</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filas.map((a) => (
                <Table.Tr key={a.id}>
                  <Table.Td>
                    <Text size="sm">{new Date(a.created_at).toLocaleDateString("es-GT")}</Text>
                    {a.updated_at && a.updated_at !== a.created_at && (
                      <Text size="xs" c="dimmed">
                        Corregido el {new Date(a.updated_at).toLocaleDateString("es-GT")}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      {a.photo && <img src={a.photo} alt="" style={thumb(44)} />}
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600}>
                          {a.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {a.body}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={a.class_type ? "flame" : "gray"} size="sm">
                      {a.class_type || "Todo el gym"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap" justify="flex-end">
                      <Button size="compact-xs" variant="light" onClick={() => abrir(a)}>
                        Editar
                      </Button>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="red"
                        loading={borrar.isPending && borrar.variables === a.id}
                        onClick={() => darDeBaja(a)}
                      >
                        Quitar
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={!!editando}
        onClose={() => setEditando(null)}
        title="Corregir anuncio"
        centered
        size="lg"
      >
        <Text c="dimmed" size="sm" mb="md">
          Los atletas verán el texto corregido en el feed. <strong>No se envía otro push</strong>: la
          notificación original ya salió.
        </Text>
        <TextInput
          label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.currentTarget.value)}
          mb="sm"
        />
        <Textarea
          label="Mensaje"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.currentTarget.value)}
          autosize
          minRows={3}
          mb="sm"
        />
        <Select
          label="Segmento"
          value={segmento}
          onChange={setSegmento}
          data={[
            { value: "", label: "Todo el gym" },
            ...classTypes.map((ct) => ({ value: ct, label: `Solo ${ct}` })),
          ]}
          mb="sm"
        />
        {editando?.photo && !foto && (
          <Group gap="sm" mb="xs">
            <img src={editando.photo} alt="" style={thumb(56)} />
            <Text c="dimmed" size="xs">
              Foto actual — sube otra para reemplazarla.
            </Text>
          </Group>
        )}
        <Group grow align="flex-start" mb="md">
          <FileInput
            label="Reemplazar foto"
            placeholder="Subir imagen"
            accept="image/*"
            clearable
            value={foto}
            onChange={setFoto}
          />
          <FileInput
            label="Reemplazar video"
            placeholder="Subir video"
            accept="video/*"
            clearable
            value={video}
            onChange={setVideo}
          />
        </Group>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setEditando(null)}>
            Cancelar
          </Button>
          <Button
            loading={actualizar.isPending}
            disabled={!titulo.trim() || !cuerpo.trim()}
            onClick={guardar}
          >
            Guardar cambios
          </Button>
        </Group>
      </Modal>
    </GlassCard>
  );
}

export function CommunityPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const feed = useGymFeed(gymId);
  const classes = useGymClasses(gymId);
  const memberships = useMemberships(gymId);
  const awards = useAthletesOfMonth(gymId);
  const aomHistory = useAthletesOfMonthHistory(gymId);
  const setAom = useSetAthleteOfMonth(gymId);
  // Borrador por clase: el cambio del Select NO publica; se confirma con el botón.
  const [aomDraft, setAomDraft] = useState<Record<string, string | null>>({});
  const postAnnouncement = usePostAnnouncement(gymId);
  const pendingPosts = useGymPendingPosts(gymId);
  const decidePost = useDecidePost(gymId);
  const reportedComments = useGymReportedComments(gymId);
  const decideComment = useDecideComment(gymId);
  const appeals = useGymAppeals(gymId);
  const decideAppeal = useDecideAppeal(gymId);
  const signals = useModerationSignals(gymId);
  // Sub-bandeja visible dentro de moderación: publicaciones, comentarios o apelaciones.
  const [modTab, setModTab] = useState<"posts" | "comentarios" | "apelaciones">("posts");

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

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annClass, setAnnClass] = useState<string | null>("");
  const [annPhoto, setAnnPhoto] = useState<File | null>(null);
  const [annVideo, setAnnVideo] = useState<File | null>(null);

  const classTypes = useMemo(() => {
    const set = new Set<string>();
    (classes.data ?? []).forEach((c) => c.class_type && set.add(c.class_type));
    return Array.from(set).sort();
  }, [classes.data]);

  const activeAthletes = useMemo(
    () => (memberships.data ?? []).filter((m) => ["active", "trial"].includes(m.status ?? "")),
    [memberships.data],
  );

  const awardFor = (classType: string) =>
    (awards.data ?? []).find((a) => (a.class_type ?? "") === classType);

  // Publica (o quita) el atleta del mes con feedback visible. Devuelve si tuvo
  // éxito para limpiar el borrador solo cuando realmente se publicó.
  const publicarAom = async (classType: string, athleteId: string | null) => {
    try {
      await setAom.mutateAsync({ class_type: classType, athlete_id: athleteId });
      notifications.show({
        color: "teal",
        message: athleteId
          ? `Atleta del mes publicado para ${classType || "todo el gym"}. Ya aparece en el feed con su imagen.`
          : `Atleta del mes de ${classType || "todo el gym"} quitado.`,
      });
      return true;
    } catch (e) {
      notifications.show({
        color: "red",
        title: "No se pudo publicar el atleta del mes",
        message: errMsg(e, "Revisa que el atleta siga activo en el gimnasio e intenta de nuevo."),
      });
      return false;
    }
  };

  /**
   * Publica el anuncio en el feed. Antes se disparaba con `mutateAsync` SIN catch:
   * si el backend lo rechazaba (archivo muy pesado, segmento inválido) la promesa
   * quedaba rechazada sin dueño, el formulario no se limpiaba y el admin no veía
   * absolutamente nada — creía haber publicado.
   */
  const onPost = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await postAnnouncement.mutateAsync({
        title: annTitle,
        body: annBody,
        class_type: annClass || undefined,
        photo: annPhoto,
        video: annVideo,
      });
      notifications.show({
        color: "teal",
        message: annClass
          ? `Anuncio publicado para ${annClass}. Ya está en el feed de esos atletas.`
          : "Anuncio publicado. Ya está en el feed de todo el gimnasio.",
      });
      setAnnTitle("");
      setAnnBody("");
      setAnnClass("");
      setAnnPhoto(null);
      setAnnVideo(null);
    } catch (e) {
      notifications.show({
        color: "red",
        message: errMsg(e, "No se pudo publicar el anuncio. Intenta de nuevo."),
      });
    }
  };

  /** Aprueba un post pendiente. El rechazo va por el modal de motivo. */
  const aprobarPost = (postId: string) => {
    decidePost.mutate(
      { postId, action: "approve" },
      {
        onSuccess: () =>
          notifications.show({ color: "teal", message: "Publicación aprobada: ya está en el feed." }),
        onError: (e) =>
          notifications.show({
            color: "red",
            message: errMsg(e, "No se pudo moderar la publicación."),
          }),
      },
    );
  };

  /** Devuelve el comentario al feed. El borrado va por el modal de motivo. */
  const restaurarComentario = (comment: ReportedComment) => {
    decideComment.mutate(
      { commentId: comment.id, action: "approve" },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: "Comentario restaurado: volvió a verse en el feed.",
          }),
        onError: (e) =>
          notifications.show({
            color: "red",
            message: errMsg(e, "No se pudo moderar el comentario."),
          }),
      },
    );
  };

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
    const cerrar = () => setRechazo(null);
    const onError = (e: unknown) =>
      notifications.show({
        color: "red",
        message: errMsg(e, "No se pudo aplicar la decisión."),
      });
    if (rechazo.tipo === "post") {
      decidePost.mutate(
        { postId: rechazo.id, action: "reject", ...comun },
        {
          onSuccess: () => {
            cerrar();
            notifications.show({
              color: "teal",
              message: "Publicación rechazada. El autor recibe el motivo y puede debatirlo.",
            });
          },
          onError,
        },
      );
    } else {
      decideComment.mutate(
        { commentId: rechazo.id, action: "reject", ...comun },
        {
          onSuccess: () => {
            cerrar();
            notifications.show({
              color: "teal",
              message: "Comentario eliminado. El autor recibe el motivo y puede debatirlo.",
            });
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
          notifications.show({
            color: "teal",
            message:
              action === "accept"
                ? appeal.kind === "post"
                  ? "Apelación aceptada: la publicación volvió al feed."
                  : "Apelación aceptada: el comentario volvió al feed."
                : "Apelación rechazada. La decisión se mantiene y el atleta ya lo sabe.",
          });
        },
        onError: (e) =>
          notifications.show({
            color: "red",
            message: errMsg(e, "No se pudo resolver la apelación."),
          }),
      },
    );
  };

  if (!gymId) return <NoGymAssigned />;
  if (feed.isError) return <PageError onRetry={() => feed.refetch()} />;

  const aomRows = ["", ...classTypes];

  // La bandeja de moderación tiene dos colas: lo que espera visto bueno antes de
  // publicarse (posts) y lo que ya se publicó y un atleta reportó (comentarios).
  // El contador de arriba suma las dos: si solo contara posts, un comentario
  // reportado se quedaría escondido aquí para siempre.
  const nPosts = (pendingPosts.data ?? []).length;
  const nComentarios = (reportedComments.data ?? []).length;
  const nApelaciones = (appeals.data ?? []).length;
  const modCargando =
    pendingPosts.isLoading || reportedComments.isLoading || appeals.isLoading;

  return (
    <div>
      <PageHeader
        kicker="Comunidad · Feed"
        title="Comunidad del gym"
        subtitle="Publica anuncios, destaca al atleta del mes y modera lo que sube tu comunidad: publicaciones por aprobar y comentarios reportados."
      />

      {/* Pulso de la comunidad: todo se deriva de lo que ya trajeron las queries. */}
      <Stagger from={0.6} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
          <MetricTile
            label="Destacados vigentes"
            value={awards.isLoading ? "—" : (awards.data ?? []).length}
            icon={<Trophy size={16} strokeWidth={1.8} />}
            tone="var(--nucleo-accent)"
            hint="Atletas del mes publicados ahora mismo."
          />
          <MetricTile
            label="Actividad en el feed"
            value={feed.isLoading ? "—" : (feed.data ?? []).length}
            icon={<Newspaper size={16} strokeWidth={1.8} />}
            hint="Publicaciones visibles para tu comunidad."
          />
          <MetricTile
            label="Atletas activos"
            value={memberships.isLoading ? "—" : activeAthletes.length}
            icon={<Users size={16} strokeWidth={1.8} />}
            hint="Pueden aparecer como atleta del mes."
          />
        </SimpleGrid>
      </Stagger>

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <GlassCard padding={24} delay={0.72} style={{ height: "100%" }}>
            <SectionLabel as="h2" mb={8}>Atleta del mes por clase</SectionLabel>
            <Text c="dimmed" size="sm" mb="md">
              Elige un atleta por clase y confirma con “Publicar”: el anuncio sale al feed con una
              imagen enmarcada con su foto.
            </Text>
            {memberships.isError || awards.isError ? (
              // Sin padrón el selector queda vacío y parece que no hay atletas.
              <PageError
                message="No se pudo cargar el padrón o los destacados publicados."
                onRetry={() => {
                  if (memberships.isError) memberships.refetch();
                  if (awards.isError) awards.refetch();
                }}
              />
            ) : memberships.isLoading || awards.isLoading ? (
              <PageLoading />
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Clase</Table.Th>
                    <Table.Th>Atleta del mes</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {aomRows.map((ct) => {
                    const current = awardFor(ct);
                    const key = ct || "__all__";
                    const draft = aomDraft[key]; // undefined = sin cambios pendientes
                    const value = draft !== undefined ? draft : current?.athlete ?? null;
                    const dirty = draft !== undefined && draft !== (current?.athlete ?? null);
                    return (
                      <Table.Tr key={key}>
                        <Table.Td>{ct || "Todo el gym"}</Table.Td>
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            {current?.image && (
                              <a href={current.image} target="_blank" rel="noreferrer">
                                <img
                                  src={current.image}
                                  alt={current.athlete_name}
                                  style={thumb(44)}
                                />
                              </a>
                            )}
                            <Select
                              placeholder="Sin asignar"
                              value={value}
                              onChange={(v) =>
                                setAomDraft((prev) => ({ ...prev, [key]: v }))
                              }
                              clearable
                              searchable
                              maw={280}
                              data={activeAthletes.map((m) => ({ value: m.athlete, label: m.athlete_name }))}
                            />
                            {dirty && (
                              <Button
                                size="xs"
                                color={draft ? "flame" : "red"}
                                loading={setAom.isPending}
                                onClick={async () => {
                                  const ok = await publicarAom(ct, draft ?? null);
                                  if (ok)
                                    setAomDraft((prev) => {
                                      const next = { ...prev };
                                      delete next[key];
                                      return next;
                                    });
                                }}
                              >
                                {draft ? "Publicar" : "Quitar"}
                              </Button>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </GlassCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <GlassCard padding={24} delay={0.84} style={{ height: "100%" }}>
            <SectionLabel as="h2" mb={12}>Publicar anuncio en el feed</SectionLabel>
            <form onSubmit={onPost}>
              <Stack gap="sm">
                <Group grow align="flex-start">
                  <TextInput label="Título" placeholder="Título del anuncio" value={annTitle} onChange={(e) => setAnnTitle(e.currentTarget.value)} />
                  <Select
                    label="Segmento"
                    value={annClass}
                    onChange={setAnnClass}
                    data={[
                      { value: "", label: "Todo el gym" },
                      ...classTypes.map((ct) => ({ value: ct, label: `Solo ${ct}` })),
                    ]}
                  />
                </Group>
                <Textarea
                  label="Mensaje"
                  placeholder="Mensaje para tus atletas…"
                  value={annBody}
                  onChange={(e) => setAnnBody(e.currentTarget.value)}
                  autosize
                  minRows={3}
                />
                <Group grow align="flex-start">
                  <FileInput
                    label="Foto (opcional)"
                    placeholder="Subir imagen"
                    accept="image/*"
                    clearable
                    value={annPhoto}
                    onChange={setAnnPhoto}
                  />
                  <FileInput
                    label="Video (opcional)"
                    placeholder="Subir video"
                    accept="video/*"
                    clearable
                    value={annVideo}
                    onChange={setAnnVideo}
                  />
                </Group>
                {annPhoto && (
                  <img
                    src={URL.createObjectURL(annPhoto)}
                    alt="vista previa"
                    style={{ ...MEDIA_FRAME, maxWidth: 200 }}
                  />
                )}
                <Button type="submit" loading={postAnnouncement.isPending} disabled={!annTitle || !annBody}>
                  Publicar anuncio
                </Button>
              </Stack>
            </form>
          </GlassCard>
        </Grid.Col>
      </Grid>

      <AnunciosPublicados gymId={gymId} classTypes={classTypes} />

      <GlassCard padding={24} delay={0.96} style={{ marginTop: "calc(20 * var(--u))" }}>
        <SectionLabel as="h2" mb={8}>Histórico de atletas del mes</SectionLabel>
        <Text c="dimmed" size="sm" mb="md">
          Todos los destacados publicados, del mes más reciente al más antiguo.
        </Text>
        {aomHistory.isError ? (
          <PageError
            message="No se pudo cargar el histórico de atletas del mes."
            onRetry={() => aomHistory.refetch()}
          />
        ) : aomHistory.isLoading ? (
          <PageLoading />
        ) : !(aomHistory.data ?? []).length ? (
          <Text c="dimmed" size="sm">
            Aún no has publicado atletas del mes.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mes</Table.Th>
                <Table.Th>Clase</Table.Th>
                <Table.Th>Atleta</Table.Th>
                <Table.Th>Anuncio</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(aomHistory.data ?? []).map((a) => (
                <Table.Tr key={a.id}>
                  <Table.Td>{a.period}</Table.Td>
                  <Table.Td>{a.class_type || "Todo el gym"}</Table.Td>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      {a.athlete_photo && (
                        <img src={a.athlete_photo} alt={a.athlete_name} style={thumb(30, true)} />
                      )}
                      {a.athlete_name}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {a.image ? (
                      <a href={a.image} target="_blank" rel="noreferrer">
                        <img
                          src={a.image}
                          alt={`Atleta del mes ${a.period}`}
                          style={thumb(56)}
                        />
                      </a>
                    ) : (
                      <Text c="dimmed" size="sm">—</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </GlassCard>

      {/* La bandeja que manda en la pantalla: es lo único que exige una decisión. */}
      <GlassCard
        variant="core"
        sheen
        padding={24}
        delay={1.08}
        style={{ marginTop: "calc(20 * var(--u))" }}
      >
        <BigMetric
          label="Pendientes de moderación"
          value={modCargando ? "—" : nPosts + nComentarios + nApelaciones}
          size="sm"
          hint="Publicaciones por aprobar, comentarios reportados y apelaciones de atletas."
          delay={1.3}
        />
        <div style={{ height: "calc(16 * var(--u))" }} />
        {/* Etiquetas cortas a propósito: en móvil el control no debe desbordar la
            tarjeta. El "reportados" lo explica la línea de abajo. */}
        <SegmentedControl
          value={modTab}
          onChange={(v) => setModTab(v as "posts" | "comentarios" | "apelaciones")}
          data={[
            { value: "posts", label: `Publicaciones (${modCargando ? "—" : nPosts})` },
            { value: "comentarios", label: `Comentarios (${modCargando ? "—" : nComentarios})` },
            { value: "apelaciones", label: `Apelaciones (${modCargando ? "—" : nApelaciones})` },
          ]}
        />
        <Text c="dimmed" size="sm" mt={8} mb="md">
          {modTab === "posts"
            ? "Publicaciones de atletas y coaches que aún no salen al feed."
            : modTab === "comentarios"
              ? "Comentarios que tus atletas reportaron: están ocultos del feed hasta que decidas."
              : "Atletas que no están de acuerdo con una decisión tuya y piden que la revises de nuevo."}
        </Text>
        {modTab === "apelaciones" ? (
          appeals.isError ? (
            <PageError
              message="No se pudo cargar la cola de apelaciones. Puede haber atletas esperando respuesta."
              onRetry={() => appeals.refetch()}
            />
          ) : appeals.isLoading ? (
            <PageLoading />
          ) : !nApelaciones ? (
            <Text c="dimmed" size="sm">
              No hay apelaciones por revisar. Cuando un atleta no esté de acuerdo con una decisión
              de moderación, su descargo aparece aquí.
            </Text>
          ) : (
            <Stack gap="sm">
              {(appeals.data ?? []).map((a) => (
                <Box
                  key={a.id}
                  p="sm"
                  style={{ border: "1px solid var(--a-line)", borderRadius: "calc(16 * var(--u))" }}
                >
                  <Group gap={6} mb={6}>
                    <Badge size="xs" variant="light" color="flame">
                      {a.kind === "post" ? "Publicación" : "Comentario"}
                    </Badge>
                    <Badge size="xs" variant="light" color={APPEAL_COLOR[a.status] ?? "gray"}>
                      {a.status_display}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {a.athlete_name} · {new Date(a.created_at).toLocaleString("es-GT")}
                    </Text>
                  </Group>

                  <SectionLabel mb={4}>Contenido sancionado</SectionLabel>
                  <Text size="sm" c="dimmed">
                    {a.content_excerpt || "(sin texto: era una foto o un video)"}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Motivo: {a.content_reason_display || "sin motivo registrado"}
                    {a.content_note ? ` · ${a.content_note}` : ""}
                  </Text>

                  <SectionLabel mb={4} mt={12}>
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
                      <Button
                        size="xs"
                        loading={decideAppeal.isPending}
                        onClick={() => {
                          setResolucion({ appeal: a, action: "accept" });
                          setNotaApelacion("");
                        }}
                      >
                        Aceptar y republicar
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        color="red"
                        loading={decideAppeal.isPending}
                        onClick={() => {
                          setResolucion({ appeal: a, action: "reject" });
                          setNotaApelacion("");
                        }}
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
                </Box>
              ))}
            </Stack>
          )
        ) : modTab === "posts" ? (
          /* Un fallo aquí decía "no hay nada que moderar": el peor error posible en
             una bandeja de moderación (posts reportados quedan invisibles). */
          pendingPosts.isError ? (
            <PageError
              message="No se pudo cargar la bandeja de moderación. Puede haber publicaciones esperando."
              onRetry={() => pendingPosts.refetch()}
            />
          ) : pendingPosts.isLoading ? (
            <PageLoading />
          ) : !nPosts ? (
            <Text c="dimmed" size="sm">
              No hay publicaciones de atletas esperando aprobación.
            </Text>
          ) : (
            <Stack gap="sm">
              {(pendingPosts.data ?? []).map((p) => (
                <Box
                  key={p.id}
                  p="sm"
                  style={{ border: "1px solid var(--a-line)", borderRadius: "calc(16 * var(--u))" }}
                >
                  <Group gap={6} mb={2}>
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
                      {p.author_name ?? p.athlete_name} · {new Date(p.created_at).toLocaleString("es-GT")}
                    </Text>
                  </Group>
                  {p.body && <Text size="sm">{p.body}</Text>}
                  <Group gap="xs" mt={8}>
                    {(p.media && p.media.length
                      ? p.media
                      : p.photo
                        ? [{ url: p.photo, kind: "image" as const }]
                        : []
                    ).map((m, i) =>
                      m.kind === "video" ? (
                        <video key={i} src={m.url} controls style={{ ...MEDIA_FRAME, maxWidth: 280 }} />
                      ) : (
                        <img key={i} src={m.url} alt="post" style={{ ...MEDIA_FRAME, maxWidth: 280 }} />
                      ),
                    )}
                  </Group>
                  <Group gap="xs" mt="sm">
                    <Button size="xs" loading={decidePost.isPending} onClick={() => aprobarPost(p.id)}>
                      Aprobar
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      color="red"
                      onClick={() =>
                        abrirRechazo("post", p.id, p.author_name ?? p.athlete_name)
                      }
                    >
                      Rechazar…
                    </Button>
                  </Group>
                </Box>
              ))}
            </Stack>
          )
        ) : /* Comentarios reportados: ya están OCULTOS del feed. Si esta cola
              fallara en silencio, ocultar un comentario no tendría vuelta atrás. */
        reportedComments.isError ? (
          <PageError
            message="No se pudo cargar la cola de comentarios reportados. Puede haber comentarios ocultos esperando tu revisión."
            onRetry={() => reportedComments.refetch()}
          />
        ) : reportedComments.isLoading ? (
          <PageLoading />
        ) : !nComentarios ? (
          <Text c="dimmed" size="sm">
            No hay comentarios reportados. Cuando un atleta reporte uno, se oculta del feed y
            aparece aquí para que decidas.
          </Text>
        ) : (
          <Stack gap="sm">
            {(reportedComments.data ?? []).map((c) => (
              <Box
                key={c.id}
                p="sm"
                style={{ border: "1px solid var(--a-line)", borderRadius: "calc(16 * var(--u))" }}
              >
                <Group gap={6} mb={2}>
                  <Badge size="xs" variant="light" color="flame">
                    Comentario
                  </Badge>
                  <Badge size="xs" variant="filled" color="red">
                    Reportado ×{c.report_count}
                  </Badge>
                  {c.hidden && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="orange"
                      title="Está fuera del feed mientras lo revisas"
                    >
                      Oculto del feed
                    </Badge>
                  )}
                  <Text size="xs" c="dimmed">
                    {c.athlete_name} · {new Date(c.created_at).toLocaleString("es-GT")}
                  </Text>
                </Group>
                {c.body && <Text size="sm">{c.body}</Text>}
                {c.image && (
                  <img
                    src={c.image}
                    alt="comentario"
                    // `width` + `maxWidth: 100%`: en móvil la imagen se encoge
                    // con la tarjeta en vez de desbordarla.
                    style={{ ...MEDIA_FRAME, width: 280, maxWidth: "100%", marginTop: 8 }}
                  />
                )}
                <Group gap="xs" mt="sm">
                  <Button
                    size="xs"
                    loading={decideComment.isPending}
                    onClick={() => restaurarComentario(c)}
                  >
                    Restaurar
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    color="red"
                    onClick={() => abrirRechazo("comment", c.id, c.athlete_name)}
                  >
                    Eliminar…
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>

      {/* Señal de moderación: agregados ANÓNIMOS. Sirve para decidir si hablar con
          alguien, no para saber quién lo bloqueó — eso no se muestra nunca. */}
      <GlassCard padding={24} delay={1.14} style={{ marginTop: "calc(20 * var(--u))" }}>
        <Group gap={8} mb={8} wrap="nowrap">
          <ShieldAlert size={16} strokeWidth={1.8} />
          <SectionLabel as="h2" mb={0}>Señal de moderación</SectionLabel>
        </Group>
        <Text c="dimmed" size="sm" mb="md">
          Atletas de tu gimnasio a los que varias personas bloquearon o reportaron. Es una señal
          para que decidas si hablas con ellos, no una sanción automática.
        </Text>
        <Alert color="gray" variant="light" mb="md" title="Cómo leer esta tabla">
          <Text size="sm">
            <b>No se muestra quién bloqueó ni quién reportó</b>, y no hay forma de averiguarlo desde
            el panel: revelarlo expondría a la persona que se protegió, que además ve a esta otra en
            la clase de las 6. Un atleta aparece cuando llega a un mínimo de bloqueos <b>o</b> de
            reportes. Los bloqueos se muestran sólo a partir de ese mínimo — en un box de 30
            personas un solo bloqueo prácticamente señala a quien lo hizo —, así que puedes ver una
            fila con reportes y cero bloqueos. Sólo cuenta lo que pasó dentro de tu gimnasio, en los
            últimos 90 días.
          </Text>
        </Alert>
        {signals.isError ? (
          <PageError
            message="No se pudo cargar la señal de moderación."
            onRetry={() => signals.refetch()}
          />
        ) : signals.isLoading ? (
          <PageLoading />
        ) : !(signals.data ?? []).length ? (
          <Text c="dimmed" size="sm">
            Nadie llega al umbral. Tu comunidad está tranquila.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Atleta</Table.Th>
                <Table.Th>Bloqueos</Table.Th>
                <Table.Th>Reportes</Table.Th>
                <Table.Th>Última señal</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(signals.data ?? []).map((s) => (
                <Table.Tr key={s.athlete_id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      {s.athlete_avatar && (
                        <img src={s.athlete_avatar} alt={s.athlete_name} style={thumb(30, true)} />
                      )}
                      {s.athlete_name}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="orange">
                      {s.bloqueos}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={s.reportes > 0 ? "red" : "gray"}>
                      {s.reportes}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {s.ultima_senal ? new Date(s.ultima_senal).toLocaleDateString("es-GT") : "—"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </GlassCard>

      <GlassCard padding={24} delay={1.2} style={{ marginTop: "calc(20 * var(--u))" }}>
        <SectionLabel as="h2" mb={12}>Feed</SectionLabel>
        {feed.isLoading ? (
          <PageLoading />
        ) : !(feed.data ?? []).length ? (
          <EmptyState title="Sin actividad" description="La actividad de tus atletas aparecerá aquí." />
        ) : (
          <Stack gap={0}>
            {(feed.data ?? []).map((item) => (
              <Box key={item.id} py="sm" style={{ borderBottom: "1px solid var(--a-line)" }}>
                <Group gap="xs" mb={4}>
                  <Badge variant="light" color="flame" size="sm">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </Badge>
                  <Text fw={600}>{item.title}</Text>
                </Group>
                <Text size="sm">{item.body}</Text>
                {(item.media ?? []).length > 0 && (
                  <Group gap="xs" mt={8}>
                    {(item.media ?? []).map((m, i) =>
                      m.kind === "video" ? (
                        <video key={i} src={m.url} controls style={{ ...MEDIA_FRAME, maxWidth: 240 }} />
                      ) : (
                        <img key={i} src={m.url} alt="media" style={{ ...MEDIA_FRAME, maxWidth: 240 }} />
                      ),
                    )}
                  </Group>
                )}
                <Text c="dimmed" size="xs" mt={6}>
                  {item.actor_name} · {new Date(item.created_at).toLocaleString("es-GT")}
                  {item.reaction_count > 0
                    ? ` · ${reactionSummary(item.reactions) || `♥ ${item.reaction_count}`}`
                    : ""}
                  {item.comment_count ? ` · 💬 ${item.comment_count}` : ""}
                </Text>
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>

      {/* Rechazar exige motivo: sin él el backend responde 400 `reason_required`,
          y sin él el autor no sabe qué corregir ni contra qué apelar. */}
      <Modal
        opened={!!rechazo}
        onClose={() => setRechazo(null)}
        title={rechazo?.tipo === "post" ? "Rechazar publicación" : "Eliminar comentario"}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {rechazo?.tipo === "post"
              ? `La publicación de ${rechazo?.quien} no saldrá al feed.`
              : `El comentario de ${rechazo?.quien} se borra para siempre y no se puede recuperar.`}{" "}
            Se le avisa con el motivo que elijas, y podrá pedirte que lo revises de nuevo.
          </Text>
          <Select
            label="Motivo"
            description="Obligatorio: es lo que verá el autor."
            placeholder="Elige un motivo"
            value={motivo}
            onChange={(v) => setMotivo(v as MotivoModeracion | null)}
            data={MOTIVOS_MODERACION}
          />
          <Textarea
            label="Nota para el autor (opcional)"
            placeholder="Aclaración breve: qué corregir, qué regla se pasó por alto…"
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
        title={
          resolucion?.action === "accept" ? "Aceptar la apelación" : "Mantener la decisión"
        }
        centered
      >
        <Stack gap="md">
          {resolucion?.action === "accept" ? (
            <Alert color="teal" variant="light">
              <Text size="sm">
                {resolucion?.appeal.kind === "post"
                  ? "La publicación vuelve al feed y se le quita el motivo de la sanción."
                  : "El comentario deja de estar oculto, vuelve al feed y se borran los reportes que lo bajaron."}{" "}
                Al atleta se le avisa que le diste la razón.
              </Text>
            </Alert>
          ) : (
            <Text size="sm" c="dimmed">
              El contenido sigue sancionado. Al atleta se le avisa, y si no queda conforme puede
              pedirle una última revisión a Nucleo.
            </Text>
          )}
          <Textarea
            label="Nota para el atleta (opcional)"
            placeholder="Explícale por qué, en una línea."
            value={notaApelacion}
            onChange={(e) => setNotaApelacion(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={255}
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
    </div>
  );
}
