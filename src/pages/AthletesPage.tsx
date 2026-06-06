import { useEffect, useState } from "react";
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  SegmentedControl,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { Bell, Download, KeyRound, Mail, Smartphone } from "lucide-react";
import {
  useAtRisk,
  useEditAthleteProfile,
  useGymLeaveDecision,
  useMembershipDetail,
  useMemberships,
  useResetAthletePassword,
  useSendReminder,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { MEMBERSHIP_STATUS, PAYMENT_STATUS, label } from "../lib/labels";

const STATUS_COLOR: Record<string, string> = {
  active: "teal",
  trial: "teal",
  overdue: "red",
  expired: "yellow",
  pending_leave: "orange",
};

function DueBadge({ days, date }: { days?: number | null; date?: string | null }) {
  if (days == null) return <Text c="dimmed">—</Text>;
  const color = days < 0 ? "red" : days <= 7 ? "yellow" : "teal";
  const text = days < 0 ? `Vencido hace ${Math.abs(days)} d` : days === 0 ? "Vence hoy" : `${days} días`;
  return (
    <Badge color={color} variant="light" title={date ? `Vence: ${date}` : undefined}>
      {text}
    </Badge>
  );
}

function EmergencyContact({ value }: { value?: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0)
    return <Text c="dimmed" span>Sin contacto de emergencia</Text>;
  const name = (value.name as string) || "";
  const phone = (value.phone as string) || "";
  const relation = (value.relation as string) || "";
  return (
    <Text span>
      {name || "—"} {relation ? `(${relation})` : ""} {phone ? `· ${phone}` : ""}
    </Text>
  );
}

export function AthletesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading, isError, refetch } = useMemberships(gymId);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const detail = useMembershipDetail(gymId, selectedMembershipId);
  const resetPassword = useResetAthletePassword(gymId);
  const sendReminder = useSendReminder(gymId);
  const editProfile = useEditAthleteProfile(gymId);
  const leaveDecision = useGymLeaveDecision(gymId);
  const atRisk = useAtRisk(gymId);
  const [filtro, setFiltro] = useState("todos");

  const [edit, setEdit] = useState({ first_name: "", last_name: "", birth_date: "", ec_name: "", ec_phone: "", ec_relation: "" });
  useEffect(() => {
    const a = detail.data?.athlete_profile;
    if (!a) return;
    const ec = (a.emergency_contact ?? {}) as Record<string, string>;
    setEdit({
      first_name: a.first_name ?? "",
      last_name: a.last_name ?? "",
      birth_date: a.birth_date ?? "",
      ec_name: ec.name ?? "",
      ec_phone: ec.phone ?? "",
      ec_relation: ec.relation ?? "",
    });
  }, [detail.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = (m: string) => notifications.show({ color: "teal", message: m });
  const fail = (m: string) => notifications.show({ color: "red", message: m });

  const onResetPassword = async (membershipId: string, name: string) => {
    if (!window.confirm(`¿Enviar restablecimiento de contraseña a ${name}? Se le pedirá cambiarla al ingresar.`))
      return;
    try {
      await resetPassword.mutateAsync(membershipId);
      ok(`Se envió el restablecimiento a ${name}.`);
    } catch {
      fail("No se pudo enviar el restablecimiento.");
    }
  };

  const onReminder = async (
    membershipId: string,
    name: string,
    channel: "push" | "email" | "both",
  ) => {
    const medio = channel === "email" ? "por correo" : channel === "both" ? "por push y correo" : "por push";
    try {
      await sendReminder.mutateAsync({ membershipId, channel });
      ok(`Recordatorio enviado a ${name} ${medio}.`);
    } catch {
      fail("No se pudo enviar el recordatorio.");
    }
  };

  const onSaveProfile = async () => {
    try {
      await editProfile.mutateAsync({
        membershipId: selectedMembershipId,
        first_name: edit.first_name,
        last_name: edit.last_name,
        birth_date: edit.birth_date || null,
        emergency_contact:
          edit.ec_name || edit.ec_phone || edit.ec_relation
            ? { name: edit.ec_name, phone: edit.ec_phone, relation: edit.ec_relation }
            : null,
      });
      ok("Perfil del atleta actualizado.");
    } catch {
      fail("No se pudo actualizar el perfil.");
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  // Retención y morosidad vive aquí: filtra el padrón por estado de pago / riesgo.
  const atRiskIds = new Set((atRisk.data ?? []).map((m) => m.id));
  const rows = (data ?? []).filter((m) => {
    if (filtro === "morosos") return m.payment_status === "overdue";
    if (filtro === "por_vencer") return m.payment_status === "due_soon";
    if (filtro === "en_riesgo") return atRiskIds.has(m.id);
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Atletas del gimnasio"
        subtitle="Solo se muestra la relación con ESTE gym (visibilidad por relación)."
        action={
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            onClick={() =>
              downloadCsv(
                "atletas-nucleo.csv",
                ["atleta", "estado", "plan", "cuota", "pago", "vence_en_dias", "puntos_comunidad"],
                rows.map((m) => [
                  m.athlete_name,
                  label(MEMBERSHIP_STATUS, m.status),
                  m.plan_name ?? "Sin plan",
                  m.effective_fee ?? "",
                  label(PAYMENT_STATUS, m.payment_status),
                  m.days_to_due ?? "",
                  m.community_points,
                ]),
              )
            }
          >
            Exportar CSV
          </Button>
        }
      />

      <Group justify="space-between" mb="md" wrap="wrap">
        <SegmentedControl
          value={filtro}
          onChange={setFiltro}
          data={[
            { label: "Todos", value: "todos" },
            { label: `Morosos`, value: "morosos" },
            { label: "Por vencer", value: "por_vencer" },
            { label: "En riesgo", value: "en_riesgo" },
          ]}
        />
        <Text c="dimmed" size="sm">
          {rows.length} {rows.length === 1 ? "atleta" : "atletas"}
        </Text>
      </Group>

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : !rows.length ? (
          <EmptyState
            title="Sin atletas"
            description={
              filtro === "todos"
                ? "Aprueba solicitudes o invita atletas al gym."
                : "Ningún atleta en este segmento. 💪"
            }
          />
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Atleta</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Plan</Table.Th>
                  <Table.Th>Miembro desde</Table.Th>
                  <Table.Th>Vencimiento</Table.Th>
                  <Table.Th>Puntos</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar src={m.athlete_photo} color="flame" radius="xl" size={36}>
                          {m.athlete_name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Text size="sm">{m.athlete_name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[m.status ?? ""] ?? "gray"} variant="light">
                        {label(MEMBERSHIP_STATUS, m.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{m.plan_name ?? "—"}</Table.Td>
                    <Table.Td>
                      {m.start_date ? new Date(m.start_date).toLocaleDateString("es-GT") : "—"}
                    </Table.Td>
                    <Table.Td>
                      <DueBadge days={m.days_to_due} date={m.renewal_date} />
                    </Table.Td>
                    <Table.Td>{m.community_points}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Button variant="default" size="xs" onClick={() => setSelectedMembershipId(m.id)}>
                          Ver detalle
                        </Button>
                        <Menu shadow="md" position="bottom-start" withinPortal>
                          <Menu.Target>
                            <Button
                              variant="light"
                              size="xs"
                              leftSection={<Bell size={14} />}
                              loading={sendReminder.isPending}
                            >
                              Recordatorio
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>Enviar por</Menu.Label>
                            <Menu.Item leftSection={<Smartphone size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "push")}>
                              Notificación push
                            </Menu.Item>
                            <Menu.Item leftSection={<Mail size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "email")}>
                              Correo
                            </Menu.Item>
                            <Menu.Item leftSection={<Bell size={14} />} onClick={() => onReminder(m.id, m.athlete_name, "both")}>
                              Ambos
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                        {(m.status as string) === "pending_leave" &&
                          (m.leave_initiated_by === "athlete" ? (
                            <>
                              <Button size="xs" color="red" loading={leaveDecision.isPending} onClick={() => leaveDecision.mutate({ membershipId: m.id, action: "approve" })}>
                                Confirmar baja
                              </Button>
                              <Button size="xs" variant="default" onClick={() => leaveDecision.mutate({ membershipId: m.id, action: "cancel" })}>
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button size="xs" variant="default" onClick={() => leaveDecision.mutate({ membershipId: m.id, action: "cancel" })}>
                              Cancelar baja propuesta
                            </Button>
                          ))}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {detail.data && (
        <Card mt="lg">
          <Group justify="space-between" align="flex-start">
            <Group>
              <Avatar src={detail.data.athlete_profile.photo} color="flame" radius="xl" size={56}>
                {detail.data.athlete_name?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <Title order={3}>
                  {detail.data.athlete_profile.full_name ?? detail.data.athlete_name}
                </Title>
                <Group gap="xs">
                  <Text c="dimmed" size="sm">
                    {detail.data.plan_name ?? "Sin plan"} · {label(MEMBERSHIP_STATUS, detail.data.status)}
                  </Text>
                  {detail.data.renewal_date && (
                    <>
                      <Text c="dimmed" size="sm">
                        · vence {detail.data.renewal_date}
                      </Text>
                      <DueBadge days={detail.data.days_to_due} date={detail.data.renewal_date} />
                    </>
                  )}
                </Group>
              </div>
            </Group>
            <Group gap="xs">
              <Menu shadow="md" position="bottom-start" withinPortal>
                <Menu.Target>
                  <Button variant="light" leftSection={<Bell size={16} />} loading={sendReminder.isPending}>
                    Recordatorio
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Enviar por</Menu.Label>
                  <Menu.Item leftSection={<Smartphone size={14} />} onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name, "push")}>
                    Notificación push
                  </Menu.Item>
                  <Menu.Item leftSection={<Mail size={14} />} onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name, "email")}>
                    Correo
                  </Menu.Item>
                  <Menu.Item leftSection={<Bell size={14} />} onClick={() => onReminder(selectedMembershipId, detail.data!.athlete_name, "both")}>
                    Ambos
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Button
                variant="default"
                leftSection={<KeyRound size={16} />}
                loading={resetPassword.isPending}
                onClick={() => onResetPassword(selectedMembershipId, detail.data!.athlete_name)}
              >
                Restablecer contraseña
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="md">
            <Text size="sm">
              <strong>Cumpleaños:</strong>{" "}
              {detail.data.athlete_profile.birth_date || <Text c="dimmed" span>Sin registrar</Text>}
            </Text>
            <Text size="sm">
              <strong>Contacto de emergencia:</strong>{" "}
              <EmergencyContact value={detail.data.athlete_profile.emergency_contact} />
            </Text>
            <Text size="sm">
              <strong>Nivel / objetivos:</strong>{" "}
              {detail.data.athlete_profile.sport_level || "Nivel sin registrar"} ·{" "}
              {detail.data.athlete_profile.goals || "Objetivos sin registrar"}
            </Text>
            <Text size="sm">
              <strong>Notas internas:</strong> {detail.data.internal_notes || "Sin notas"}
            </Text>
          </SimpleGrid>

          <Accordion variant="separated" mt="md">
            <Accordion.Item value="edit">
              <Accordion.Control>Editar datos del atleta</Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  <TextInput label="Nombre" value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.currentTarget.value })} />
                  <TextInput label="Apellido" value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.currentTarget.value })} />
                  <DateInput
                    label="Cumpleaños"
                    valueFormat="YYYY-MM-DD"
                    value={edit.birth_date ? new Date(edit.birth_date) : null}
                    onChange={(d) => setEdit({ ...edit, birth_date: d ? d.toLocaleDateString("en-CA") : "" })}
                  />
                  <TextInput label="Contacto (nombre)" value={edit.ec_name} onChange={(e) => setEdit({ ...edit, ec_name: e.currentTarget.value })} />
                  <TextInput label="Contacto (teléfono)" value={edit.ec_phone} onChange={(e) => setEdit({ ...edit, ec_phone: e.currentTarget.value })} />
                  <TextInput label="Parentesco" value={edit.ec_relation} onChange={(e) => setEdit({ ...edit, ec_relation: e.currentTarget.value })} />
                </SimpleGrid>
                <Button mt="sm" loading={editProfile.isPending} onClick={onSaveProfile}>
                  Guardar cambios
                </Button>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Title order={4} mt="lg" mb="xs">
            Pagos en este gimnasio
          </Title>
          {detail.data.payments.length === 0 ? (
            <Text c="dimmed" size="sm">Sin pagos registrados.</Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Método</Table.Th>
                  <Table.Th>Monto</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.data.payments.map((payment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>{new Date(payment.created_at).toLocaleDateString("es-GT")}</Table.Td>
                    <Table.Td>{payment.method}</Table.Td>
                    <Table.Td>Q{payment.amount}</Table.Td>
                    <Table.Td>{payment.status}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          <Title order={4} mt="lg" mb="xs">
            Asistencia en este gimnasio
          </Title>
          {detail.data.checkins.length === 0 ? (
            <Text c="dimmed" size="sm">Sin check-ins registrados.</Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Clase</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Método</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.data.checkins.map((checkin) => (
                  <Table.Tr key={checkin.id}>
                    <Table.Td>{checkin.class_type}</Table.Td>
                    <Table.Td>{new Date(checkin.starts_at).toLocaleString("es-GT")}</Table.Td>
                    <Table.Td>{checkin.method}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
