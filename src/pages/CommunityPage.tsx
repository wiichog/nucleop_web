import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  FileInput,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Newspaper, Trophy, Users } from "lucide-react";
import {
  useAthletesOfMonth,
  useAthletesOfMonthHistory,
  useDecidePost,
  useGymClasses,
  useGymFeed,
  useGymPendingPosts,
  useMemberships,
  usePostAnnouncement,
  useSetAthleteOfMonth,
} from "../api/hooks";
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

  /** Modera un post pendiente avisando el resultado (antes fallaba en silencio). */
  const decidirPost = (postId: string, action: "approve" | "reject") => {
    decidePost.mutate(
      { postId, action },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: action === "approve" ? "Publicación aprobada: ya está en el feed." : "Publicación rechazada.",
          }),
        onError: (e) =>
          notifications.show({
            color: "red",
            message: errMsg(e, "No se pudo moderar la publicación."),
          }),
      },
    );
  };

  if (!gymId) return <NoGymAssigned />;
  if (feed.isError) return <PageError onRetry={() => feed.refetch()} />;

  const aomRows = ["", ...classTypes];

  return (
    <div>
      <PageHeader
        kicker="Comunidad · Feed"
        title="Comunidad del gym"
        subtitle="Publica anuncios, destaca al atleta del mes y modera lo que suben tus atletas antes de que llegue al feed."
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
          label="Posts por aprobar"
          value={pendingPosts.isLoading ? "—" : (pendingPosts.data ?? []).length}
          size="sm"
          hint="Publicaciones de atletas y coaches esperando tu visto bueno."
          delay={1.3}
        />
        <div style={{ height: "calc(16 * var(--u))" }} />
        {/* Un fallo aquí decía "no hay nada que moderar": el peor error posible en
            una bandeja de moderación (posts reportados quedan invisibles). */}
        {pendingPosts.isError ? (
          <PageError
            message="No se pudo cargar la bandeja de moderación. Puede haber publicaciones esperando."
            onRetry={() => pendingPosts.refetch()}
          />
        ) : pendingPosts.isLoading ? (
          <PageLoading />
        ) : !(pendingPosts.data ?? []).length ? (
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
                  <Button size="xs" loading={decidePost.isPending} onClick={() => decidirPost(p.id, "approve")}>
                    Aprobar
                  </Button>
                  <Button size="xs" variant="default" color="red" loading={decidePost.isPending} onClick={() => decidirPost(p.id, "reject")}>
                    Rechazar
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
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
    </div>
  );
}
