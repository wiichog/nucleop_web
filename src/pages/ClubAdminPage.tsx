import { FormEvent, useState } from "react";
import {
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useAuth } from "../lib/auth";
import {
  useClubAdminActivities,
  useClubAdminChallengeLeaderboard,
  useClubAdminChallenges,
  useClubAdminPendingSubmissions,
  useClubAdminReviewSubmission,
  useClubAdminConfirm,
  useClubAdminCreateActivity,
  useClubAdminCreateChallenge,
  useClubAdminRsvps,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";

const rowBorder = { borderBottom: "1px solid var(--mantine-color-dark-5)" };

export function ClubAdminPage() {
  const { primaryClubId, clubIds } = useAuth();
  const clubId = primaryClubId ?? "";
  const activities = useClubAdminActivities(clubId);
  const createActivity = useClubAdminCreateActivity(clubId);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const rsvps = useClubAdminRsvps(clubId, expandedActivity ?? "");
  const confirm = useClubAdminConfirm(clubId, expandedActivity ?? "");

  const challenges = useClubAdminChallenges(clubId);
  const createChallenge = useClubAdminCreateChallenge(clubId);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const challengeBoard = useClubAdminChallengeLeaderboard(clubId, expandedChallenge ?? "");
  const pendingSubmissions = useClubAdminPendingSubmissions(clubId, expandedChallenge ?? undefined);
  const reviewSubmission = useClubAdminReviewSubmission(clubId);

  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [location, setLocation] = useState("");

  const [challengeName, setChallengeName] = useState("");
  const [challengeTarget, setChallengeTarget] = useState("50");
  const [challengeEnds, setChallengeEnds] = useState<Date | null>(null);

  if (!clubId) {
    return (
      <EmptyState
        title="Sin club asignado"
        description="Tu usuario necesita rol club_admin en un club para administrar actividades."
      />
    );
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    await createActivity.mutateAsync({
      name,
      starts_at: (startsAt ?? new Date()).toISOString(),
      location,
      is_free: true,
    });
    setName("");
    setStartsAt(null);
    setLocation("");
  };

  const onCreateChallenge = async (e: FormEvent) => {
    e.preventDefault();
    const ends = challengeEnds ? new Date(challengeEnds) : new Date();
    if (!challengeEnds) ends.setDate(ends.getDate() + 30);
    await createChallenge.mutateAsync({
      name: challengeName,
      description: "",
      metric: "distance_km",
      target_value: challengeTarget,
      starts_at: new Date().toISOString(),
      ends_at: ends.toISOString(),
      points_reward: 30,
    });
    setChallengeName("");
    setChallengeTarget("50");
    setChallengeEnds(null);
  };

  if (activities.isError) return <PageError onRetry={() => activities.refetch()} />;

  return (
    <div>
      <PageHeader
        title="Administrar club"
        subtitle={`Crea actividades, revisa RSVPs y confirma asistencia.${clubIds.length > 1 ? ` Club activo: ${clubId}` : ""}`}
      />

      <Card mb="lg" component="form" onSubmit={onCreate}>
        <Title order={3} mb="sm">
          Nueva actividad
        </Title>
        <Stack gap="sm" maw={460}>
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
          <DateTimePicker label="Fecha y hora" value={startsAt} onChange={setStartsAt} valueFormat="YYYY-MM-DD HH:mm" />
          <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
          <Button type="submit" loading={createActivity.isPending}>
            Crear actividad
          </Button>
        </Stack>
      </Card>

      <Card mb="lg">
        <Title order={3} mb="sm">
          Actividades
        </Title>
        {activities.isLoading ? (
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
                    {rsvps.isLoading ? (
                      <PageLoading />
                    ) : (
                      <Stack gap="xs">
                        {(rsvps.data ?? []).map((row) => (
                          <Group key={row.id} gap="sm">
                            <Text size="sm">
                              {row.athlete_name} · {row.status}
                            </Text>
                            {row.status === "going" && (
                              <Button size="xs" loading={confirm.isPending} onClick={() => confirm.mutate(row.athlete)}>
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
      </Card>

      <Card mb="lg">
        <Title order={3} mb="sm">
          Revisiones pendientes
        </Title>
        {pendingSubmissions.isLoading ? (
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
                  <Button size="xs" loading={reviewSubmission.isPending} onClick={() => reviewSubmission.mutate({ submissionId: sub.id, action: "approve" })}>
                    Aprobar
                  </Button>
                  <Button size="xs" variant="default" color="red" loading={reviewSubmission.isPending} onClick={() => reviewSubmission.mutate({ submissionId: sub.id, action: "reject" })}>
                    Rechazar
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </Card>

      <Card>
        <Title order={3} mb="sm">
          Retos
        </Title>
        <Stack gap="sm" maw={460} mb="lg" component="form" onSubmit={onCreateChallenge}>
          <TextInput label="Nombre del reto" value={challengeName} onChange={(e) => setChallengeName(e.currentTarget.value)} required />
          <TextInput label="Meta (km o cantidad)" value={challengeTarget} onChange={(e) => setChallengeTarget(e.currentTarget.value)} required />
          <DateTimePicker label="Termina (opcional)" value={challengeEnds} onChange={setChallengeEnds} valueFormat="YYYY-MM-DD HH:mm" />
          <Button type="submit" loading={createChallenge.isPending}>
            Crear reto
          </Button>
        </Stack>
        {challenges.isLoading ? (
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
                    {(challengeBoard.data ?? []).map((row) => (
                      <Text key={row.id} c="dimmed" size="sm">
                        #{row.rank} {row.athlete_name} · {row.progress} · {row.status}
                      </Text>
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Card>
    </div>
  );
}
