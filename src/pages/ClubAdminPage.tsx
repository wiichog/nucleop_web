import { FormEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  FileInput,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { CalendarClock, UserCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
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
import { PageError, PageLoading } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { BigMetric, GlassCard, MetricTile, Stagger, cssVars } from "../components/aurora";

/** Hairline del material Aurora: separa filas sin dibujar una caja. */
const rowBorder = { borderBottom: "1px solid var(--a-line)" };

/** Separación estándar entre tarjetas de un panel. */
const CARD_GAP = "calc(20 * var(--u))";

export function ClubAdminPage() {
  const { primaryClubId, clubIds } = useAuth();
  const clubId = primaryClubId ?? "";
  // La pestaña vive en la URL para poder enlazar directo a anuncios o al perfil.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "actividades";

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
      <PageHeader
        kicker="Mi club"
        title="Administrar club"
        subtitle={`Publica anuncios, crea actividades y retos, y mantén la ficha del club al día.${
          clubIds.length > 1 ? " Cambia de club desde el selector del menú lateral." : ""
        }`}
      />

      <Tabs
        value={tab}
        onChange={(v) =>
          setSearchParams(v && v !== "actividades" ? { tab: v } : {}, { replace: true })
        }
        keepMounted={false}
      >
        <Tabs.List mb="lg" className="a-wipe-right" style={cssVars({ "--d": "0.52s" })}>
          <Tabs.Tab value="actividades">Actividades</Tabs.Tab>
          <Tabs.Tab value="retos">Retos</Tabs.Tab>
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
  const createActivity = useClubAdminCreateActivity(clubId);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const rsvps = useClubAdminRsvps(clubId, expandedActivity ?? "");
  const confirm = useClubAdminConfirm(clubId, expandedActivity ?? "");

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
        is_free: true,
      });
      notifications.show({ color: "teal", message: `Actividad "${name}" creada.` });
      setName("");
      setStartsAt(null);
      setLocation("");
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear la actividad.") });
    }
  };

  // Retrato del panel: se deriva de las actividades que ya están en pantalla.
  const lista = activities.data ?? [];
  const rsvpsTotal = lista.reduce((total, a) => total + (a.rsvp_count ?? 0), 0);

  return (
    <>
      <Stagger from={0.6} style={{ marginBottom: CARD_GAP }}>
        <SimpleGrid cols={{ base: 2, md: 2 }} spacing="md">
          <MetricTile
            label="Actividades publicadas"
            value={activities.isLoading ? "—" : lista.length}
            icon={<CalendarClock size={16} strokeWidth={1.8} />}
          />
          <MetricTile
            label="RSVPs acumulados"
            value={activities.isLoading ? "—" : rsvpsTotal}
            icon={<UserCheck size={16} strokeWidth={1.8} />}
            hint="Confirmaciones de tus miembros."
          />
        </SimpleGrid>
      </Stagger>

      <GlassCard padding={24} delay={0.72} style={{ marginBottom: CARD_GAP }}>
        <SectionLabel as="h2" mb={12}>Nueva actividad</SectionLabel>
        <form onSubmit={onCreate}>
          <Stack gap="sm" maw={460}>
            <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            <DateTimePicker label="Fecha y hora" value={startsAt} onChange={setStartsAt} valueFormat="YYYY-MM-DD HH:mm" />
            <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
            <Button type="submit" loading={createActivity.isPending}>
              Crear actividad
            </Button>
          </Stack>
        </form>
      </GlassCard>

      <GlassCard padding={24} delay={0.84}>
        <SectionLabel as="h2" mb={12}>Actividades</SectionLabel>
        {activities.isError ? (
          <PageError
            message="No se pudieron cargar las actividades del club."
            onRetry={() => activities.refetch()}
          />
        ) : activities.isLoading ? (
          <PageLoading />
        ) : !(activities.data ?? []).length ? (
          <EmptyState title="Sin actividades" description="Crea la primera actividad del club." />
        ) : (
          <Stack gap={0}>
            {(activities.data ?? []).map((activity) => (
              <Box key={activity.id} py="sm" style={rowBorder}>
                <Text fw={600}>{activity.name}</Text>
                <Text c="dimmed" size="sm">
                  {new Date(activity.starts_at).toLocaleString("es-GT")}
                  {activity.location ? ` · ${activity.location}` : ""}
                  {activity.rsvp_count != null ? ` · ${activity.rsvp_count} RSVPs` : ""}
                </Text>
                <Button
                  variant="default"
                  size="xs"
                  mt={6}
                  onClick={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                >
                  {expandedActivity === activity.id ? "Ocultar RSVPs" : "Ver RSVPs"}
                </Button>
                {expandedActivity === activity.id && (
                  <Box mt="sm">
                    {rsvps.isError ? (
                      <PageError
                        message="No se pudieron cargar los RSVPs de esta actividad."
                        onRetry={() => rsvps.refetch()}
                      />
                    ) : rsvps.isLoading ? (
                      <PageLoading />
                    ) : !(rsvps.data ?? []).length ? (
                      <Text c="dimmed" size="sm">
                        Nadie ha confirmado asistencia todavía.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {(rsvps.data ?? []).map((row) => (
                          <Group key={row.id} gap="sm">
                            <Text size="sm">
                              {row.athlete_name} · {row.status}
                            </Text>
                            {row.status === "going" && (
                              <Button
                                size="xs"
                                loading={confirm.isPending}
                                onClick={() =>
                                  confirm.mutate(row.athlete, {
                                    onSuccess: () =>
                                      notifications.show({
                                        color: "teal",
                                        message: `Asistencia de ${row.athlete_name} confirmada.`,
                                      }),
                                    onError: (error) =>
                                      notifications.show({
                                        color: "red",
                                        message: errMsg(error, "No se pudo confirmar la asistencia."),
                                      }),
                                  })
                                }
                              >
                                Confirmar asistencia
                              </Button>
                            )}
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Retos + revisión de avances
// ---------------------------------------------------------------------------
function RetosPanel({ clubId }: { clubId: string }) {
  const challenges = useClubAdminChallenges(clubId);
  const createChallenge = useClubAdminCreateChallenge(clubId);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const challengeBoard = useClubAdminChallengeLeaderboard(clubId, expandedChallenge ?? "");
  const pendingSubmissions = useClubAdminPendingSubmissions(clubId, expandedChallenge ?? undefined);
  const reviewSubmission = useClubAdminReviewSubmission(clubId);

  const [challengeName, setChallengeName] = useState("");
  const [challengeTarget, setChallengeTarget] = useState("50");
  const [challengeEnds, setChallengeEnds] = useState<Date | null>(null);

  /**
   * Revisa un avance. Al rechazar se pide motivo: el atleta lo lee en su app
   * (`my_last_review.note`), y un rechazo mudo en un reto con puntos de por medio
   * es la forma más rápida de perder a quien participa.
   */
  const onReview = (submissionId: string, action: "approve" | "reject") => {
    let note: string | undefined;
    if (action === "reject") {
      const motivo = window.prompt("¿Por qué rechazas este avance? El atleta lo verá en su app.", "");
      if (motivo === null) return; // canceló el diálogo
      note = motivo.trim();
    }
    reviewSubmission.mutate(
      { submissionId, action, note },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: action === "approve" ? "Avance aprobado." : "Avance rechazado.",
          }),
        onError: (error) =>
          notifications.show({ color: "red", message: errMsg(error, "No se pudo revisar el avance.") }),
      },
    );
  };

  const onCreateChallenge = async (e: FormEvent) => {
    e.preventDefault();
    const ends = challengeEnds ? new Date(challengeEnds) : new Date();
    if (!challengeEnds) ends.setDate(ends.getDate() + 30);
    try {
      await createChallenge.mutateAsync({
        name: challengeName,
        description: "",
        metric: "distance_km",
        target_value: challengeTarget,
        starts_at: new Date().toISOString(),
        ends_at: ends.toISOString(),
        points_reward: 30,
      });
      notifications.show({ color: "teal", message: `Reto "${challengeName}" creado.` });
      setChallengeName("");
      setChallengeTarget("50");
      setChallengeEnds(null);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el reto.") });
    }
  };

  return (
    <>
      {/* La cola que manda en este panel: puntos de reto esperando decisión. */}
      <GlassCard variant="core" sheen padding={24} delay={0.6} style={{ marginBottom: CARD_GAP }}>
        <BigMetric
          label="Revisiones pendientes"
          value={pendingSubmissions.isLoading ? "—" : (pendingSubmissions.data ?? []).length}
          size="sm"
          hint="Avances que tus miembros subieron y aún no apruebas."
          delay={1.0}
        />
        <div style={{ height: "calc(14 * var(--u))" }} />
        {pendingSubmissions.isError ? (
          <PageError
            message="No se pudieron cargar los avances por revisar."
            onRetry={() => pendingSubmissions.refetch()}
          />
        ) : pendingSubmissions.isLoading ? (
          <PageLoading />
        ) : !(pendingSubmissions.data ?? []).length ? (
          <Text c="dimmed" size="sm">
            No hay avances por revisar.
          </Text>
        ) : (
          <Stack gap={0}>
            {(pendingSubmissions.data ?? []).map((sub) => (
              <Box key={sub.id} py="sm" style={rowBorder}>
                <Text>
                  <strong>{sub.athlete_name}</strong> · +{sub.delta} ({sub.source})
                </Text>
                <Group gap="xs" mt={6}>
                  <Button size="xs" loading={reviewSubmission.isPending} onClick={() => onReview(sub.id, "approve")}>
                    Aprobar
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    color="red"
                    loading={reviewSubmission.isPending}
                    onClick={() => onReview(sub.id, "reject")}
                  >
                    Rechazar
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>

      <GlassCard padding={24} delay={0.72}>
        <SectionLabel as="h2" mb={12}>Retos</SectionLabel>
        <Stack gap="sm" maw={460} mb="lg" component="form" onSubmit={onCreateChallenge}>
          <TextInput label="Nombre del reto" value={challengeName} onChange={(e) => setChallengeName(e.currentTarget.value)} required />
          <TextInput label="Meta (km o cantidad)" value={challengeTarget} onChange={(e) => setChallengeTarget(e.currentTarget.value)} required />
          <DateTimePicker label="Termina (opcional)" value={challengeEnds} onChange={setChallengeEnds} valueFormat="YYYY-MM-DD HH:mm" />
          <Button type="submit" loading={createChallenge.isPending}>
            Crear reto
          </Button>
        </Stack>
        {challenges.isError ? (
          <PageError message="No se pudieron cargar los retos." onRetry={() => challenges.refetch()} />
        ) : challenges.isLoading ? (
          <PageLoading />
        ) : !(challenges.data ?? []).length ? (
          <EmptyState title="Sin retos" description="Crea el primer reto del club." />
        ) : (
          <Stack gap={0}>
            {(challenges.data ?? []).map((challenge) => (
              <Box key={challenge.id} py="sm" style={rowBorder}>
                <Text fw={600}>{challenge.name}</Text>
                <Text c="dimmed" size="sm">
                  Meta {challenge.target_value} ({challenge.metric}) · {challenge.participant_count ?? 0} participantes
                </Text>
                <Button
                  variant="default"
                  size="xs"
                  mt={6}
                  onClick={() => setExpandedChallenge(expandedChallenge === challenge.id ? null : challenge.id)}
                >
                  {expandedChallenge === challenge.id ? "Ocultar ranking" : "Ver ranking"}
                </Button>
                {expandedChallenge === challenge.id && (
                  <Stack gap={4} mt="sm">
                    {challengeBoard.isError ? (
                      <PageError
                        message="No se pudo cargar el ranking del reto."
                        onRetry={() => challengeBoard.refetch()}
                      />
                    ) : !(challengeBoard.data ?? []).length ? (
                      <Text c="dimmed" size="sm">
                        Aún nadie registra avances en este reto.
                      </Text>
                    ) : (
                      (challengeBoard.data ?? []).map((row) => (
                        <Text key={row.id} c="dimmed" size="sm">
                          #{row.rank} {row.athlete_name} · {row.progress} · {row.status}
                        </Text>
                      ))
                    )}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Anuncios del club (llegan como notificación a sus miembros)
// ---------------------------------------------------------------------------
function AnunciosPanel({ clubId }: { clubId: string }) {
  const anuncios = useClubAdminAnnouncements(clubId);
  const crear = useClubAdminCreateAnnouncement(clubId);
  const borrar = useClubAdminDeleteAnnouncement(clubId);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const onPublicar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await crear.mutateAsync({ title: title.trim(), body: body.trim(), photo });
      notifications.show({
        color: "teal",
        message: "Anuncio publicado. Tus miembros ya lo tienen en su app.",
      });
      setTitle("");
      setBody("");
      setPhoto(null);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo publicar el anuncio.") });
    }
  };

  const onBorrar = (id: string, titulo: string) => {
    if (!window.confirm(`¿Borrar el anuncio "${titulo}"? Desaparece del feed de tus miembros.`)) return;
    borrar.mutate(id, {
      onSuccess: () => notifications.show({ color: "teal", message: "Anuncio borrado." }),
      onError: (error) =>
        notifications.show({ color: "red", message: errMsg(error, "No se pudo borrar el anuncio.") }),
    });
  };

  return (
    <>
      <GlassCard padding={24} delay={0.6} style={{ marginBottom: CARD_GAP }}>
        <SectionLabel as="h2" mb={8}>Nuevo anuncio</SectionLabel>
        <Text c="dimmed" size="sm" mb="md">
          Se publica en el feed del club y les llega como notificación a sus miembros.
        </Text>
        <form onSubmit={onPublicar}>
          <Stack gap="sm" maw={520}>
            <TextInput
              label="Título"
              placeholder="Rodada del domingo"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              maxLength={120}
              required
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
      </GlassCard>

      <GlassCard padding={24} delay={0.72}>
        <SectionLabel as="h2" mb={12}>Publicados</SectionLabel>
        {anuncios.isError ? (
          <PageError
            message="No se pudieron cargar los anuncios del club."
            onRetry={() => anuncios.refetch()}
          />
        ) : anuncios.isLoading ? (
          <PageLoading />
        ) : !(anuncios.data ?? []).length ? (
          <EmptyState
            title="Sin anuncios"
            description="Publica el primero para avisarle algo a todo el club."
          />
        ) : (
          <Stack gap={0}>
            {(anuncios.data ?? []).map((a) => (
              <Box key={a.id} py="sm" style={rowBorder}>
                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600}>{a.title}</Text>
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {a.body}
                    </Text>
                    <Text c="dimmed" size="xs" mt={4}>
                      {new Date(a.created_at).toLocaleString("es-GT")}
                    </Text>
                    {a.photo && (
                      <Image
                        src={a.photo}
                        alt={a.title}
                        radius="lg"
                        mt="xs"
                        maw={240}
                        style={{ border: "1px solid var(--a-line)" }}
                      />
                    )}
                  </div>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    loading={borrar.isPending && borrar.variables === a.id}
                    onClick={() => onBorrar(a.id, a.title)}
                  >
                    Borrar
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </GlassCard>
    </>
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
      notifications.show({ color: "teal", message: "Ficha del club actualizada." });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo guardar la ficha.") });
    }
  };

  if (perfil.isError)
    return (
      <PageError message="No se pudo cargar la ficha del club." onRetry={() => perfil.refetch()} />
    );
  if (perfil.isLoading) return <PageLoading label="Cargando la ficha…" />;

  return (
    <GlassCard padding={24} delay={0.6}>
      <SectionLabel as="h2" mb={8}>Ficha del club</SectionLabel>
      <Text c="dimmed" size="sm" mb="md">
        Es lo que ven los atletas al encontrar tu club en la app. Si el club es público y su estado
        lo decide el gimnasio, eso no se edita desde aquí.
      </Text>
      <form onSubmit={onGuardar}>
        <Stack gap="sm" maw={520}>
          <TextInput
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
            required
          />
          <TextInput
            label="Tipo"
            placeholder="running, cycling, rowing…"
            value={form.club_type}
            onChange={(e) => setForm({ ...form, club_type: e.currentTarget.value })}
          />
          <Textarea
            label="Descripción"
            placeholder="Quiénes somos, cuándo entrenamos, a quién buscamos…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
            autosize
            minRows={3}
          />
          {perfil.data?.photo && !photo && (
            <div>
              <SectionLabel mb={6}>Foto actual</SectionLabel>
              <Image
                src={perfil.data.photo}
                alt={perfil.data.name}
                radius="lg"
                maw={240}
                style={{ border: "1px solid var(--a-line)" }}
              />
            </div>
          )}
          <FileInput
            label="Foto del club"
            description="Reemplaza la actual. Formato cuadrado se ve mejor."
            placeholder="Subir imagen"
            accept="image/*"
            value={photo}
            onChange={setPhoto}
            clearable
          />
          <Group justify="flex-end">
            <Button type="submit" loading={guardar.isPending} disabled={!form.name.trim()}>
              Guardar ficha
            </Button>
          </Group>
        </Stack>
      </form>
    </GlassCard>
  );
}
