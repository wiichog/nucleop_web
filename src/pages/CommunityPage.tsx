import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
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
import {
  useAthletesOfMonth,
  useGymClasses,
  useGymFeed,
  useMemberships,
  usePostAnnouncement,
  useSetAthleteOfMonth,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const KIND_LABEL: Record<string, string> = {
  pr: "PR",
  badge: "Badge",
  points: "Puntos",
  athlete_of_month: "Atleta del mes",
  challenge: "Reto",
  announcement: "Anuncio",
};

export function CommunityPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const feed = useGymFeed(gymId);
  const classes = useGymClasses(gymId);
  const memberships = useMemberships(gymId);
  const awards = useAthletesOfMonth(gymId);
  const setAom = useSetAthleteOfMonth(gymId);
  const postAnnouncement = usePostAnnouncement(gymId);

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annClass, setAnnClass] = useState<string | null>("");

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

  const onPost = async (event: FormEvent) => {
    event.preventDefault();
    await postAnnouncement.mutateAsync({ title: annTitle, body: annBody, class_type: annClass || undefined });
    setAnnTitle("");
    setAnnBody("");
    setAnnClass("");
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
              Selección manual. Elige un atleta por clase (el de pilates no es el de crossfit) o deja “Sin asignar”.
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
                    return (
                      <Table.Tr key={ct || "__all__"}>
                        <Table.Td>{ct || "Todo el gym"}</Table.Td>
                        <Table.Td>
                          <Select
                            placeholder="Sin asignar"
                            value={current?.athlete ?? null}
                            onChange={(v) => setAom.mutate({ class_type: ct, athlete_id: v })}
                            clearable
                            searchable
                            maw={320}
                            data={activeAthletes.map((m) => ({ value: m.athlete, label: m.athlete_name }))}
                          />
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
              <Button type="submit" loading={postAnnouncement.isPending} disabled={!annTitle || !annBody}>
                Publicar anuncio
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

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
                <Text c="dimmed" size="xs" mt={2}>
                  {item.actor_name} · {new Date(item.created_at).toLocaleString("es-GT")}
                  {item.reaction_count > 0 ? ` · ♥ ${item.reaction_count}` : ""}
                </Text>
              </Box>
            ))}
          </Stack>
        )}
      </Card>
    </div>
  );
}
