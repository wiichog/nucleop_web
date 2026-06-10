import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  FileInput,
  Grid,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AxiosError } from "axios";
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
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

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
      const detail = (e as AxiosError<{ detail?: string }>).response?.data?.detail;
      notifications.show({
        color: "red",
        title: "No se pudo publicar el atleta del mes",
        message: detail ?? "Revisa que el atleta siga activo en el gimnasio e intenta de nuevo.",
      });
      return false;
    }
  };

  const onPost = async (event: FormEvent) => {
    event.preventDefault();
    await postAnnouncement.mutateAsync({
      title: annTitle,
      body: annBody,
      class_type: annClass || undefined,
      photo: annPhoto,
      video: annVideo,
    });
    setAnnTitle("");
    setAnnBody("");
    setAnnClass("");
    setAnnPhoto(null);
    setAnnVideo(null);
  };

  if (!gymId) return <NoGymAssigned />;
  if (feed.isError) return <PageError onRetry={() => feed.refetch()} />;

  const aomRows = ["", ...classTypes];

  return (
    <div>
      <PageHeader
        title="Comunidad del gym"
        subtitle="Feed de PRs, badges, puntos, anuncios y destacados de tu comunidad."
      />

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card h="100%">
            <Title order={3} mb={4}>
              Atleta del mes por clase
            </Title>
            <Text c="dimmed" size="sm" mb="md">
              Elige un atleta por clase y confirma con “Publicar”: el anuncio sale al feed con una
              imagen enmarcada con su foto.
            </Text>
            {memberships.isLoading || awards.isLoading ? (
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
                                  style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }}
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
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card h="100%" component="form" onSubmit={onPost}>
            <Title order={3} mb="sm">
              Publicar anuncio en el feed
            </Title>
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
                  style={{ maxWidth: 200, borderRadius: 8 }}
                />
              )}
              <Button type="submit" loading={postAnnouncement.isPending} disabled={!annTitle || !annBody}>
                Publicar anuncio
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Card mt="lg">
        <Title order={3} mb={4}>
          Histórico de atletas del mes
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Todos los destacados publicados, del mes más reciente al más antiguo.
        </Text>
        {aomHistory.isLoading ? (
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
                        <img
                          src={a.athlete_photo}
                          alt={a.athlete_name}
                          style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 15 }}
                        />
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
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
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
      </Card>

      <Card mt="lg">
        <Group justify="space-between" mb="sm">
          <Title order={3}>Posts por aprobar</Title>
          {(pendingPosts.data ?? []).length > 0 && (
            <Badge color="yellow" variant="light">
              {(pendingPosts.data ?? []).length} pendientes
            </Badge>
          )}
        </Group>
        {pendingPosts.isLoading ? (
          <PageLoading />
        ) : !(pendingPosts.data ?? []).length ? (
          <Text c="dimmed" size="sm">
            No hay publicaciones de atletas esperando aprobación.
          </Text>
        ) : (
          <Stack gap="sm">
            {(pendingPosts.data ?? []).map((p) => (
              <Box key={p.id} p="sm" style={{ border: "1px solid var(--mantine-color-dark-5)", borderRadius: 8 }}>
                <Group gap={6} mb={2}>
                  <Badge size="xs" variant="light" color={p.author_type === "coach" ? "grape" : "flame"}>
                    {p.author_type === "coach" ? "Coach" : "Atleta"}
                  </Badge>
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
                      <video key={i} src={m.url} controls style={{ maxWidth: 280, borderRadius: 8 }} />
                    ) : (
                      <img key={i} src={m.url} alt="post" style={{ maxWidth: 280, borderRadius: 8 }} />
                    ),
                  )}
                </Group>
                <Group gap="xs" mt="sm">
                  <Button size="xs" loading={decidePost.isPending} onClick={() => decidePost.mutate({ postId: p.id, action: "approve" })}>
                    Aprobar
                  </Button>
                  <Button size="xs" variant="default" color="red" loading={decidePost.isPending} onClick={() => decidePost.mutate({ postId: p.id, action: "reject" })}>
                    Rechazar
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </Card>

      <Card mt="lg">
        <Title order={3} mb="sm">
          Feed
        </Title>
        {feed.isLoading ? (
          <PageLoading />
        ) : !(feed.data ?? []).length ? (
          <EmptyState title="Sin actividad" description="La actividad de tus atletas aparecerá aquí." />
        ) : (
          <Stack gap={0}>
            {(feed.data ?? []).map((item) => (
              <Box key={item.id} py="sm" style={{ borderBottom: "1px solid var(--mantine-color-dark-5)" }}>
                <Group gap="xs" mb={4}>
                  <Badge variant="light" color="flame" size="sm">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </Badge>
                  <Text fw={600}>{item.title}</Text>
                </Group>
                <Text size="sm">{item.body}</Text>
                {(item.media ?? []).length > 0 && (
                  <Group gap="xs" mt={6}>
                    {(item.media ?? []).map((m, i) =>
                      m.kind === "video" ? (
                        <video key={i} src={m.url} controls style={{ maxWidth: 240, borderRadius: 8 }} />
                      ) : (
                        <img key={i} src={m.url} alt="media" style={{ maxWidth: 240, borderRadius: 8 }} />
                      ),
                    )}
                  </Group>
                )}
                <Text c="dimmed" size="xs" mt={2}>
                  {item.actor_name} · {new Date(item.created_at).toLocaleString("es-GT")}
                  {item.reaction_count > 0 ? ` · ${reactionSummary(item.reactions) || `♥ ${item.reaction_count}`}` : ""}
                  {item.comment_count ? ` · 💬 ${item.comment_count}` : ""}
                </Text>
              </Box>
            ))}
          </Stack>
        )}
      </Card>
    </div>
  );
}
