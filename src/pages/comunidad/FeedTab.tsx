import { Badge, Box, Group, Stack, Text } from "@mantine/core";
import { useGymFeed } from "../../api/hooks";
import { GlassCard } from "../../components/aurora";
import { PageError } from "../../components/PageStatus";
import { Encabezado } from "../../components/Tarjeta";
import { fechaHora, Medios } from "./media";

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

/** Lo que hoy ven tus atletas en el feed. Solo lectura. */
export function FeedTab({ gymId }: { gymId: string }) {
  const feed = useGymFeed(gymId);
  const items = feed.data ?? [];

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Feed" />
      {/* Un fallo del feed ya no tumba la pantalla entera: antes dejaba sin
          moderar lo que sí había cargado. */}
      {feed.isError ? (
        <PageError message="No se pudo cargar el feed." onRetry={() => feed.refetch()} />
      ) : feed.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !items.length ? (
        <Text c="dimmed" size="sm">
          Sin actividad todavía.
        </Text>
      ) : (
        <Stack gap={0}>
          {items.map((item) => (
            <Box key={item.id} py="sm" style={{ borderBottom: "1px solid var(--a-line)" }}>
              <Group gap="xs" mb={4}>
                <Badge variant="light" color="flame" size="sm">
                  {KIND_LABEL[item.kind] ?? item.kind}
                </Badge>
                <Text fw={600}>{item.title}</Text>
              </Group>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {item.body}
              </Text>
              <Medios media={item.media ?? []} ancho={240} />
              <Text c="dimmed" size="xs" mt={6}>
                {item.actor_name} · {fechaHora(item.created_at)}
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
  );
}
