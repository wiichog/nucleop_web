import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  FileInput,
  Group,
  Image,
  Modal,
  NumberInput,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { CLUB_ENTRY_STATUS, CLUB_RSVP_STATUS, CLUB_SUBMISSION_SOURCE, label } from "../lib/labels";
import {
  useClubAdminActivities,
  useClubAdminAnnouncements,
  useClubAdminChallengeLeaderboard,
  useClubAdminChallenges,
  useClubAdminCreateAnnouncement,
  useClubAdminDeleteAnnouncement,
  useClubAdminPendingSubmissions,
  useClubAdminProfile,
  useClubAdminReviewSubmission,
  useClubAdminConfirm,
  useClubAdminCreateActivity,
  useClubAdminCreateChallenge,
  useClubAdminRsvps,
  useUpdateClubAdminProfile,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading, useCuentaSinCargar } from "../components/PageStatus";
import { Encabezado, nombreCorto, Tarjeta } from "../components/Tarjeta";
import { CountBadge, PageHeader } from "../components/ui";
import { GlassCard, cssVars } from "../components/aurora";

/**
 * Medidas que el servidor sabe llevar en un reto (ver `clubs/antifraud.py` y
 * `challenge_progress.py`): kilómetros que declara el atleta, o asistencias a
 * actividades del club que suma sola la confirmación de asistencia.
 */
export const METRICAS_RETO = [
  { value: "distance_km", label: "Kilómetros" },
  { value: "activity_count", label: "Asistencias a actividades" },
] as const;

/** Nombre legible de la medida de un reto; si llega una desconocida se muestra tal cual. */
export function etiquetaMetrica(metric: string): string {
  return METRICAS_RETO.find((m) => m.value === metric)?.label ?? metric;
}

/** Nombre del reto de un avance; si la lista de retos aún no llega, un genérico. */
export function nombreReto(challengeId: string, retos?: { id: string; name: string }[]): string {
  return retos?.find((r) => r.id === challengeId)?.name ?? "—";
}

/**
 * Estado de los botones «Aprobar»/«Rechazar» de un avance. La mutación es una sola
 * para toda la lista: sin comparar sus `variables`, al decidir una fila giraban todas.
 * Gira sólo el botón pulsado y su hermano queda bloqueado mientras tanto.
 */
export function estadoRevision(
  m: { isPending: boolean; variables?: { submissionId: string; action: string } },
  submissionId: string,
  action: "approve" | "reject",
): { loading: boolean; disabled: boolean } {
  const enEsta = m.isPending && m.variables?.submissionId === submissionId;
  const esEste = enEsta && m.variables?.action === action;
  return { loading: esEste, disabled: enEsta && !esEste };
}

/**
 * Las próximas primero (la más cercana arriba) y luego las pasadas (la más
 * reciente arriba): lo que se viene a preparar va al frente.
 */
export function ordenarActividades<T extends { starts_at: string }>(lista: T[], ahora = Date.now()): T[] {
  const t = (a: T) => Date.parse(a.starts_at);
  const proximas = lista.filter((a) => t(a) >= ahora).sort((a, b) => t(a) - t(b));
  const pasadas = lista.filter((a) => t(a) < ahora).sort((a, b) => t(b) - t(a));
  return [...proximas, ...pasadas];
}

const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const ok = (message: string) => notifications.show({ color: "teal", message });
const fail = (error: unknown, fallback: string) =>
  notifications.show({ color: "red", message: errMsg(error, fallback) });

export function ClubAdminPage() {
  const { primaryClubId } = useAuth();
  const sinCuenta = useCuentaSinCargar();
  const clubId = primaryClubId ?? "";
  // La pestaña vive en la URL para poder enlazar directo a anuncios o al perfil.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "actividades";
  // El contador va en la pestaña: un avance sin revisar no se resuelve solo y el
  // atleta se queda esperando sus puntos. Misma llave que la lista de Retos.
  const pendientes = useClubAdminPendingSubmissions(clubId).data?.length ?? 0;

  // Si /me falló no hay roles, y tampoco club: no decirle a un club_admin que no tiene club.
  if (sinCuenta) return sinCuenta;
  if (!clubId) {
    return (
      <EmptyState
        title="Sin club asignado"
        description="Tu usuario necesita rol club_admin en un club para administrar actividades."
      />
    );
  }

  return (
    <div>
      <PageHeader kicker="Mi club" title="Administrar club" />

      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v && v !== "actividades" ? { tab: v } : {}, { replace: true })}
        keepMounted={false}
      >
        <Tabs.List mb="lg" className="a-wipe-right" style={cssVars({ "--d": "0.52s" })}>
          <Tabs.Tab value="actividades">Actividades</Tabs.Tab>
          <Tabs.Tab value="retos">
            <Group gap={6} wrap="nowrap">
              Retos
              {pendientes ? <CountBadge count={pendientes} /> : null}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="anuncios">Anuncios</Tabs.Tab>
          <Tabs.Tab value="perfil">Perfil del club</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="actividades">
          <ActividadesPanel clubId={clubId} />
        </Tabs.Panel>
        <Tabs.Panel value="retos">
          <RetosPanel clubId={clubId} />
        </Tabs.Panel>
        <Tabs.Panel value="anuncios">
          <AnunciosPanel clubId={clubId} />
        </Tabs.Panel>
        <Tabs.Panel value="perfil">
          <PerfilPanel clubId={clubId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actividades + RSVPs
// ---------------------------------------------------------------------------
function ActividadesPanel({ clubId }: { clubId: string }) {
  const activities = useClubAdminActivities(clubId);
  const [nueva, setNueva] = useState(false);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);

  if (activities.isError)
    return (
      <PageError
        message="No se pudieron cargar las actividades del club."
        onRetry={() => activities.refetch()}
      />
    );

  const ahora = Date.now();
  const lista = ordenarActividades(activities.data ?? [], ahora);
  const abierta = lista.find((a) => a.id === abiertaId) ?? null;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Actividades">
        <Button onClick={() => setNueva(true)}>Nueva actividad</Button>
      </Encabezado>
      {activities.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !lista.length ? (
        <Text c="dimmed" size="sm">
          Crea la primera actividad del club: una rodada, una carrera, un entreno juntos…
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {lista.map((a) => (
            <Tarjeta
              key={a.id}
              etiqueta={`Ver quién va a ${a.name}`}
              onClick={() => setAbiertaId(a.id)}
              apagada={Date.parse(a.starts_at) < ahora}
            >
              <Text fw={700} truncate>
                {a.name}
              </Text>
              <Text size="xs" c="dimmed">
                {cuando(a.starts_at)}
              </Text>
              {a.location ? (
                <Text size="xs" c="dimmed" truncate>
                  {a.location}
                </Text>
              ) : null}
              <Badge size="xs" mt={6} variant="light" color={a.rsvp_count ? "teal" : "gray"}>
                {a.rsvp_count ?? 0} {a.rsvp_count === 1 ? "va" : "van"}
              </Badge>
            </Tarjeta>
          ))}
        </SimpleGrid>
      )}

      <NuevaActividadModal clubId={clubId} opened={nueva} onClose={() => setNueva(false)} />
      <Modal opened={!!abierta} onClose={() => setAbiertaId(null)} title={abierta?.name ?? ""} centered>
        {abierta && <Rsvps clubId={clubId} activityId={abierta.id} />}
      </Modal>
    </GlassCard>
  );
}

function NuevaActividadModal({ clubId, opened, onClose }: { clubId: string; opened: boolean; onClose: () => void }) {
  const createActivity = useClubAdminCreateActivity(clubId);
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [location, setLocation] = useState("");

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createActivity.mutateAsync({
        name,
        starts_at: (startsAt ?? new Date()).toISOString(),
        location,
        // El servidor todavía no cobra actividades de club (el manual lo dice).
        is_free: true,
      });
      ok(`Actividad "${name}" creada.`);
      setName("");
      setStartsAt(null);
      setLocation("");
      onClose();
    } catch (error) {
      fail(error, "No se pudo crear la actividad.");
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Nueva actividad" centered>
      <form onSubmit={onCreate}>
        <Stack gap="sm">
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} required data-autofocus />
          <DateTimePicker label="Fecha y hora" value={startsAt} onChange={setStartsAt} valueFormat="YYYY-MM-DD HH:mm" />
          <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button type="submit" loading={createActivity.isPending}>
              Crear actividad
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/** Quién dijo que va, y confirmar a quien llegó. */
function Rsvps({ clubId, activityId }: { clubId: string; activityId: string }) {
  const rsvps = useClubAdminRsvps(clubId, activityId);
  const confirm = useClubAdminConfirm(clubId, activityId);

  if (rsvps.isError)
    return (
      <PageError
        message="No se pudieron cargar los RSVPs de esta actividad."
        onRetry={() => rsvps.refetch()}
      />
    );
  if (rsvps.isLoading) return <PageLoading />;
  const lista = rsvps.data ?? [];
  if (!lista.length)
    return (
      <Text c="dimmed" size="sm">
        Nadie ha confirmado asistencia todavía.
      </Text>
    );

  return (
    <Stack gap={6}>
      {lista.map((row) => (
        <Tarjeta key={row.id} etiqueta={row.athlete_name} aviso={row.status === "going"}>
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                {nombreCorto(row.athlete_name)}
              </Text>
              <Text size="xs" c="dimmed">
                {label(CLUB_RSVP_STATUS, row.status)}
              </Text>
            </div>
            {row.status === "going" && (
              <Button
                size="xs"
                // Sólo gira la fila que se está confirmando, no todas.
                loading={confirm.isPending && confirm.variables === row.athlete}
                onClick={() =>
                  confirm.mutate(row.athlete, {
                    onSuccess: () => ok(`Asistencia de ${row.athlete_name} confirmada.`),
                    onError: (error) => fail(error, "No se pudo confirmar la asistencia."),
                  })
                }
              >
                Confirmar asistencia
              </Button>
            )}
          </Group>
        </Tarjeta>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Retos + revisión de avances
// ---------------------------------------------------------------------------
type Revision = ReturnType<typeof useClubAdminReviewSubmission>;

/** Un avance por revisar con sus dos decisiones. El rechazo pide motivo al presionarlo. */
function Avance({
  sub,
  reto,
  review,
}: {
  sub: { id: string; athlete_name: string; delta: string | number; source: string };
  reto: string;
  review: Revision;
}) {
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState("");

  /**
   * Al rechazar se pide motivo: el atleta lo lee en su app (`my_last_review.note`),
   * y un rechazo mudo en un reto con puntos de por medio es la forma más rápida de
   * perder a quien participa.
   */
  const decidir = (action: "approve" | "reject") =>
    review.mutate(
      { submissionId: sub.id, action, note: action === "reject" ? nota.trim() : undefined },
      {
        onSuccess: () => {
          setRechazando(false);
          ok(action === "approve" ? "Avance aprobado." : "Avance rechazado.");
        },
        onError: (error) => fail(error, "No se pudo revisar el avance."),
      },
    );

  return (
    <Tarjeta etiqueta={`Avance de ${sub.athlete_name}`} aviso>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <div style={{ minWidth: 200, flex: 1 }}>
          <Text size="sm">
            <b>{nombreCorto(sub.athlete_name)}</b> +{sub.delta}{" "}
            <Text span c="dimmed">
              · {reto} · {label(CLUB_SUBMISSION_SOURCE, sub.source)}
            </Text>
          </Text>
        </div>
        <Group gap="xs">
          <Button size="xs" {...estadoRevision(review, sub.id, "approve")} onClick={() => decidir("approve")}>
            Aprobar
          </Button>
          <Popover opened={rechazando} onChange={setRechazando} position="bottom-end" withArrow trapFocus>
            <Popover.Target>
              <Button
                size="xs"
                color="red"
                variant="light"
                disabled={estadoRevision(review, sub.id, "reject").disabled}
                onClick={() => setRechazando((v) => !v)}
              >
                Rechazar
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs" w={240}>
                <TextInput
                  size="xs"
                  placeholder="Motivo (lo ve el atleta)"
                  value={nota}
                  onChange={(e) => setNota(e.currentTarget.value)}
                  data-autofocus
                />
                <Button
                  size="xs"
                  color="red"
                  loading={estadoRevision(review, sub.id, "reject").loading}
                  onClick={() => decidir("reject")}
                >
                  Rechazar avance
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </Group>
    </Tarjeta>
  );
}

function RetosPanel({ clubId }: { clubId: string }) {
  const challenges = useClubAdminChallenges(clubId);
  // La cola es de todo el club: abrir el ranking de un reto no la filtra.
  const pendingSubmissions = useClubAdminPendingSubmissions(clubId);
  const reviewSubmission = useClubAdminReviewSubmission(clubId);
  const [nuevo, setNuevo] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const pendientes = pendingSubmissions.data ?? [];
  const retos = challenges.data ?? [];
  const abierto = retos.find((c) => c.id === abiertoId) ?? null;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Por revisar"
        avisos={
          pendientes.length > 0 && (
            <Badge color="yellow" variant="light">
              {pendientes.length} por revisar
            </Badge>
          )
        }
      />
      {pendingSubmissions.isError ? (
        <PageError
          message="No se pudieron cargar los avances por revisar."
          onRetry={() => pendingSubmissions.refetch()}
        />
      ) : pendingSubmissions.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !pendientes.length ? (
        <Text c="dimmed" size="sm">
          Nada pendiente.
        </Text>
      ) : (
        <Stack gap={6}>
          {pendientes.map((sub) => (
            <Avance
              key={sub.id}
              sub={sub}
              reto={nombreReto(sub.challenge, challenges.data)}
              review={reviewSubmission}
            />
          ))}
        </Stack>
      )}

      <Group justify="space-between" wrap="wrap" gap="sm" mt="xl" mb="sm">
        <Title order={4}>Retos</Title>
        <Button onClick={() => setNuevo(true)}>Nuevo reto</Button>
      </Group>
      {challenges.isError ? (
        <PageError message="No se pudieron cargar los retos." onRetry={() => challenges.refetch()} />
      ) : challenges.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !retos.length ? (
        <Text c="dimmed" size="sm">
          Crea el primer reto del club.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {retos.map((c) => {
            const terminado = !!c.ends_at && Date.parse(c.ends_at) < Date.now();
            return (
              <Tarjeta key={c.id} etiqueta={`Ver ranking de ${c.name}`} onClick={() => setAbiertoId(c.id)} apagada={terminado}>
                <Text fw={700} truncate>
                  {c.name}
                </Text>
                <Text size="xs" c="dimmed">
                  Meta {c.target_value} ({etiquetaMetrica(c.metric)})
                </Text>
                <Text size="xs" c="dimmed">
                  {c.participant_count ?? 0} participantes
                  {c.ends_at ? ` · ${terminado ? "terminó" : "termina"} ${new Date(c.ends_at).toLocaleDateString("es-GT")}` : ""}
                </Text>
                {c.points_reward ? (
                  <Badge size="xs" mt={6} variant="light" color="flame">
                    {c.points_reward} pts
                  </Badge>
                ) : null}
              </Tarjeta>
            );
          })}
        </SimpleGrid>
      )}

      <NuevoRetoModal clubId={clubId} opened={nuevo} onClose={() => setNuevo(false)} />
      <Modal opened={!!abierto} onClose={() => setAbiertoId(null)} title={abierto?.name ?? ""} centered>
        {abierto && <Ranking clubId={clubId} challengeId={abierto.id} />}
      </Modal>
    </GlassCard>
  );
}

function Ranking({ clubId, challengeId }: { clubId: string; challengeId: string }) {
  const board = useClubAdminChallengeLeaderboard(clubId, challengeId);
  if (board.isError)
    return <PageError message="No se pudo cargar el ranking del reto." onRetry={() => board.refetch()} />;
  if (board.isLoading) return <PageLoading label="Cargando el ranking…" />;
  const filas = board.data ?? [];
  if (!filas.length)
    return (
      <Text c="dimmed" size="sm">
        Aún nadie registra avances en este reto.
      </Text>
    );
  return (
    <Stack gap={4}>
      {filas.map((row) => (
        <Group key={row.id} justify="space-between" wrap="nowrap" gap="sm">
          <Text size="sm" truncate>
            <b>#{row.rank}</b> {row.athlete_name}
          </Text>
          <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {row.progress} · {label(CLUB_ENTRY_STATUS, row.status)}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

function NuevoRetoModal({ clubId, opened, onClose }: { clubId: string; opened: boolean; onClose: () => void }) {
  const createChallenge = useClubAdminCreateChallenge(clubId);
  const [challengeName, setChallengeName] = useState("");
  const [challengeMetric, setChallengeMetric] = useState<string>("distance_km");
  const [challengeTarget, setChallengeTarget] = useState("50");
  const [challengePoints, setChallengePoints] = useState<number | string>(30);
  const [challengeEnds, setChallengeEnds] = useState<Date | null>(null);

  const onCreateChallenge = async (e: FormEvent) => {
    e.preventDefault();
    const ends = challengeEnds ? new Date(challengeEnds) : new Date();
    if (!challengeEnds) ends.setDate(ends.getDate() + 30);
    try {
      await createChallenge.mutateAsync({
        name: challengeName,
        description: "",
        metric: challengeMetric,
        target_value: challengeTarget,
        starts_at: new Date().toISOString(),
        ends_at: ends.toISOString(),
        points_reward: Math.max(0, Math.floor(Number(challengePoints) || 0)),
      });
      ok(`Reto "${challengeName}" creado.`);
      setChallengeName("");
      setChallengeMetric("distance_km");
      setChallengeTarget("50");
      setChallengePoints(30);
      setChallengeEnds(null);
      onClose();
    } catch (error) {
      fail(error, "No se pudo crear el reto.");
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Nuevo reto" centered>
      <form onSubmit={onCreateChallenge}>
        <Stack gap="sm">
          <TextInput
            label="Nombre del reto"
            value={challengeName}
            onChange={(e) => setChallengeName(e.currentTarget.value)}
            required
            data-autofocus
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Medida"
              data={METRICAS_RETO.map((m) => ({ value: m.value, label: m.label }))}
              value={challengeMetric}
              onChange={(v) => v && setChallengeMetric(v)}
              allowDeselect={false}
            />
            <TextInput
              label={challengeMetric === "activity_count" ? "Meta (asistencias)" : "Meta (km)"}
              value={challengeTarget}
              onChange={(e) => setChallengeTarget(e.currentTarget.value)}
              inputMode="decimal"
              required
            />
            <NumberInput
              label="Puntos al completarlo"
              value={challengePoints}
              onChange={setChallengePoints}
              min={0}
              allowDecimal={false}
              allowNegative={false}
            />
            <DateTimePicker
              label="Termina (opcional)"
              value={challengeEnds}
              onChange={setChallengeEnds}
              valueFormat="YYYY-MM-DD HH:mm"
              clearable
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button type="submit" loading={createChallenge.isPending}>
              Crear reto
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Anuncios del club (llegan como notificación a sus miembros)
// ---------------------------------------------------------------------------
function AnunciosPanel({ clubId }: { clubId: string }) {
  const anuncios = useClubAdminAnnouncements(clubId);
  const borrar = useClubAdminDeleteAnnouncement(clubId);
  const [nuevo, setNuevo] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const lista = anuncios.data ?? [];
  const abierto = lista.find((a) => a.id === abiertoId) ?? null;

  const onBorrar = (id: string, titulo: string) => {
    if (!window.confirm(`¿Borrar el anuncio "${titulo}"? Desaparece del feed de tus miembros.`)) return;
    borrar.mutate(id, {
      onSuccess: () => {
        ok("Anuncio borrado.");
        setAbiertoId(null);
      },
      onError: (error) => fail(error, "No se pudo borrar el anuncio."),
    });
  };

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Anuncios">
        <Button onClick={() => setNuevo(true)}>Nuevo anuncio</Button>
      </Encabezado>
      {anuncios.isError ? (
        <PageError message="No se pudieron cargar los anuncios del club." onRetry={() => anuncios.refetch()} />
      ) : anuncios.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !lista.length ? (
        <Text c="dimmed" size="sm">
          Publica el primero para avisarle algo a todo el club.
        </Text>
      ) : (
        <Stack gap={6}>
          {lista.map((a) => (
            <Tarjeta key={a.id} etiqueta={`Abrir anuncio ${a.title}`} onClick={() => setAbiertoId(a.id)}>
              <Group wrap="nowrap" gap="sm" align="flex-start">
                {a.photo && (
                  <img
                    src={a.photo}
                    alt=""
                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text fw={600} truncate>
                    {a.title}
                  </Text>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {a.body}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {new Date(a.created_at).toLocaleString("es-GT")}
                  </Text>
                </div>
              </Group>
            </Tarjeta>
          ))}
        </Stack>
      )}

      <NuevoAnuncioModal clubId={clubId} opened={nuevo} onClose={() => setNuevo(false)} />
      <Modal opened={!!abierto} onClose={() => setAbiertoId(null)} title={abierto?.title ?? ""} centered>
        {abierto && (
          <Stack gap="sm">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {abierto.body}
            </Text>
            {abierto.photo && (
              <Image src={abierto.photo} alt={abierto.title} radius="md" style={{ border: "1px solid var(--a-line)" }} />
            )}
            <Text size="xs" c="dimmed">
              {new Date(abierto.created_at).toLocaleString("es-GT")}
            </Text>
            <Group justify="flex-end">
              <Button
                color="red"
                variant="light"
                loading={borrar.isPending && borrar.variables === abierto.id}
                onClick={() => onBorrar(abierto.id, abierto.title)}
              >
                Borrar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </GlassCard>
  );
}

function NuevoAnuncioModal({ clubId, opened, onClose }: { clubId: string; opened: boolean; onClose: () => void }) {
  const crear = useClubAdminCreateAnnouncement(clubId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const onPublicar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await crear.mutateAsync({ title: title.trim(), body: body.trim(), photo });
      ok("Anuncio publicado. Tus miembros ya lo tienen en su app.");
      setTitle("");
      setBody("");
      setPhoto(null);
      onClose();
    } catch (error) {
      fail(error, "No se pudo publicar el anuncio.");
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Nuevo anuncio" centered>
      <form onSubmit={onPublicar}>
        <Stack gap="sm">
          <TextInput
            label="Título"
            placeholder="Rodada del domingo"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            maxLength={120}
            required
            data-autofocus
          />
          <Textarea
            label="Mensaje"
            placeholder="Salimos a las 6:00 del parqueo del gym…"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            autosize
            minRows={3}
            required
          />
          <FileInput
            label="Foto (opcional)"
            placeholder="Subir imagen"
            accept="image/*"
            value={photo}
            onChange={setPhoto}
            clearable
          />
          <Group justify="flex-end">
            <Button type="submit" loading={crear.isPending} disabled={!title.trim() || !body.trim()}>
              Publicar anuncio
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Ficha del club (lo que ven los atletas al buscarlo)
// ---------------------------------------------------------------------------
function PerfilPanel({ clubId }: { clubId: string }) {
  const perfil = useClubAdminProfile(clubId);
  const guardar = useUpdateClubAdminProfile(clubId);

  const [form, setForm] = useState({ name: "", club_type: "", description: "" });
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    const p = perfil.data;
    if (!p) return;
    setForm({ name: p.name ?? "", club_type: p.club_type ?? "", description: p.description ?? "" });
  }, [perfil.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onGuardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await guardar.mutateAsync({
        name: form.name.trim(),
        club_type: form.club_type.trim(),
        description: form.description,
        photo,
      });
      setPhoto(null);
      ok("Ficha del club actualizada.");
    } catch (error) {
      fail(error, "No se pudo guardar la ficha.");
    }
  };

  if (perfil.isError)
    return <PageError message="No se pudo cargar la ficha del club." onRetry={() => perfil.refetch()} />;
  if (perfil.isLoading) return <PageLoading label="Cargando la ficha…" />;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Ficha del club" />
      <form onSubmit={onGuardar}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="sm">
            <TextInput
              label="Nombre"
              value={form.name}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setForm((f) => ({ ...f, name: valor }));
              }}
              required
            />
            <TextInput
              label="Tipo"
              placeholder="running, cycling, rowing…"
              value={form.club_type}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setForm((f) => ({ ...f, club_type: valor }));
              }}
            />
            <Textarea
              label="Descripción"
              placeholder="Quiénes somos, cuándo entrenamos, a quién buscamos…"
              value={form.description}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setForm((f) => ({ ...f, description: valor }));
              }}
              autosize
              minRows={3}
            />
          </Stack>
          <Stack gap="sm">
            {perfil.data?.photo && !photo && (
              <Image
                src={perfil.data.photo}
                alt={perfil.data.name}
                radius="md"
                maw={240}
                style={{ border: "1px solid var(--a-line)" }}
              />
            )}
            <FileInput
              label="Foto del club"
              placeholder="Subir imagen"
              accept="image/*"
              value={photo}
              onChange={setPhoto}
              clearable
            />
          </Stack>
        </SimpleGrid>
        <Group justify="flex-end" mt="md">
          <Button type="submit" loading={guardar.isPending} disabled={!form.name.trim()}>
            Guardar ficha
          </Button>
        </Group>
      </form>
    </GlassCard>
  );
}
