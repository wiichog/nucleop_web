import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  Ban,
  Bell,
  ChevronDown,
  KeyRound,
  LockOpen,
  LogOut,
  Mail,
  Pause,
  Play,
  Smartphone,
  UserPen,
} from "lucide-react";
import {
  useAssignPlan,
  useBlockMembership,
  useEditAthleteProfile,
  useGymLeaveDecision,
  useMembershipDetail,
  usePauseMembership,
  usePlanOffers,
  usePlans,
  useResetAthletePassword,
  useResumeMembership,
  useSendReminder,
  useUnblockMembership,
  useUpdateMembershipBilling,
} from "../../api/hooks";
import type { MembershipDetail } from "../../api/types";
import { DetailSheet } from "../../components/DetailSheet";
import { PageError, PageLoading } from "../../components/PageStatus";
import { PhoneInput } from "../../components/PhoneInput";
import { Money, StatusBadge } from "../../components/ui";
import { Tarjeta } from "../../components/Tarjeta";
import { errMsg } from "../../lib/errors";
import { MEMBERSHIP_STATUS, PAYMENT_METHOD, label } from "../../lib/labels";
import { fmtQ } from "../../lib/money";
import {
  BLOQUEABLES,
  LEAVE_ELIGIBLE,
  dondeSeGestiona,
  efectoDeAsignarPlan,
  ultimoBloqueo,
} from "./reglasAtletas";
import { Vencimiento } from "./Vencimiento";

const ok = (m: string) => notifications.show({ color: "teal", message: m });
const fail = (m: string) => notifications.show({ color: "red", message: m });

/** Los modales se abren por encima de la ficha (el drawer vive en z-index 200). */
const SOBRE_FICHA = 400;

type Canal = "push" | "email" | "both";
type MetodoCobro = "card" | "cash" | "bank_transfer";

/** Un dato de la persona en una línea: etiqueta tenue, valor normal. */
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Text size="sm">
      <Text span c="dimmed">
        {etiqueta}:
      </Text>{" "}
      {children}
    </Text>
  );
}

function contactoEmergencia(value?: Record<string, unknown> | null): string | null {
  if (!value || Object.keys(value).length === 0) return null;
  const name = (value.name as string) || "";
  const phone = (value.phone as string) || "";
  const relation = (value.relation as string) || "";
  return [name || "—", relation ? `(${relation})` : "", phone ? `· ${phone}` : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * La ficha de una persona: arriba quién es y en qué está; si hay algo pendiente
 * (pidió su baja, está bloqueada o congelada) va primero y con su botón; después
 * las acciones del admin y, al final, sus datos, pagos y asistencia en ESTE gym.
 *
 * Todo lo que escribe va por endpoints de solo admin (`required_roles =
 * [GYM_ADMIN]`): al coach se le enseña la ficha y sus pagos, no se le ofrecen
 * botones que el servidor le va a rechazar.
 */
export function FichaAtleta({
  gymId,
  membershipId,
  esAdmin,
  onClose,
}: {
  gymId: string;
  membershipId: string;
  esAdmin: boolean;
  onClose: () => void;
}) {
  const detail = useMembershipDetail(gymId, membershipId);
  const resetPassword = useResetAthletePassword(gymId);
  const sendReminder = useSendReminder(gymId);
  const updateBilling = useUpdateMembershipBilling(gymId);
  const leaveDecision = useGymLeaveDecision(gymId);
  const resume = useResumeMembership(gymId);
  const unblock = useUnblockMembership(gymId);

  const [modal, setModal] = useState<"plan" | "congelar" | "bloquear" | "datos" | null>(null);

  // Cobro de la relación: el plan trae `auto_renew_default`, pero el gym necesita
  // corregirlo por atleta (el que sí quiere cobro automático, el que paga en caja).
  const [billing, setBilling] = useState<{ auto_renew: boolean; payment_method_pref: MetodoCobro }>({
    auto_renew: false,
    payment_method_pref: "cash",
  });
  useEffect(() => {
    const m = detail.data;
    if (!m) return;
    setBilling({
      auto_renew: !!m.auto_renew,
      payment_method_pref: (m.payment_method_pref as MetodoCobro) ?? "cash",
    });
  }, [detail.data?.id, detail.data?.auto_renew, detail.data?.payment_method_pref]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Guarda la preferencia de cobro y VERIFICA contra la respuesta del servidor:
   * si la API ignoró el campo, se revierte el switch en vez de cantar un éxito
   * falso (el error clásico de "parece hecho pero no lo está").
   */
  const onBillingChange = async (patch: Partial<typeof billing>) => {
    const anterior = billing;
    setBilling({ ...billing, ...patch });
    try {
      const saved = await updateBilling.mutateAsync({ membershipId, ...patch });
      const aplicado =
        (patch.auto_renew === undefined || !!saved.auto_renew === patch.auto_renew) &&
        (patch.payment_method_pref === undefined ||
          saved.payment_method_pref === patch.payment_method_pref);
      if (!aplicado) {
        setBilling(anterior);
        fail("La API no guardó la preferencia de cobro. Avisa a soporte de Nucleo.");
        return;
      }
      ok("Preferencia de cobro actualizada.");
    } catch (error) {
      setBilling(anterior);
      fail(errMsg(error, "No se pudo actualizar la preferencia de cobro."));
    }
  };

  const onReminder = async (name: string, channel: Canal) => {
    const medio = channel === "email" ? "por correo" : channel === "both" ? "por push y correo" : "por push";
    try {
      await sendReminder.mutateAsync({ membershipId, channel });
      ok(`Recordatorio enviado a ${name} ${medio}.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo enviar el recordatorio."));
    }
  };

  const onResetPassword = async (name: string) => {
    if (!window.confirm(`¿Enviar restablecimiento de contraseña a ${name}? Se le pedirá cambiarla al ingresar.`))
      return;
    try {
      await resetPassword.mutateAsync(membershipId);
      ok(`Se envió el restablecimiento a ${name}.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo enviar el restablecimiento."));
    }
  };

  const onReanudar = async (nombre: string) => {
    if (
      !window.confirm(
        `¿Reanudar la membresía de ${nombre}? El vencimiento se correrá los días que estuvo congelada.`,
      )
    )
      return;
    try {
      await resume.mutateAsync(membershipId);
      ok("Membresía reanudada. El vencimiento se corrió los días de la pausa.");
    } catch (error) {
      fail(errMsg(error, "No se pudo reanudar la membresía."));
    }
  };

  /**
   * Levanta el bloqueo. El backend devuelve la membresía al estado que tenía
   * ANTES de la sanción, no la "activa": por eso el mensaje sale de la respuesta.
   */
  const onDesbloquear = async (nombre: string) => {
    if (!window.confirm(`¿Levantar el bloqueo de ${nombre}? Volverá al estado que tenía antes.`))
      return;
    try {
      const saved = await unblock.mutateAsync({ membershipId });
      ok(
        `Bloqueo levantado. ${nombre} queda con la membresía ${label(
          MEMBERSHIP_STATUS,
          saved.status,
        ).toLowerCase()}.`,
      );
    } catch (error) {
      fail(errMsg(error, "No se pudo levantar el bloqueo."));
    }
  };

  /** Handoff de baja (aprobar / cancelar), con su resultado a la vista. */
  const onLeave = (nombre: string, action: "approve" | "cancel") => {
    leaveDecision.mutate(
      { membershipId, action },
      {
        onSuccess: () =>
          ok(
            action === "approve"
              ? `Baja confirmada. ${nombre} ya no es miembro del gimnasio.`
              : `Baja cancelada. ${nombre} sigue siendo miembro.`,
          ),
        onError: (error) =>
          fail(
            errMsg(
              error,
              action === "approve" ? "No se pudo confirmar la baja." : "No se pudo cancelar la baja.",
            ),
          ),
      },
    );
  };

  const onDesligar = (nombre: string) => {
    if (
      !window.confirm(
        `¿Desligar a ${nombre}? Se enviará una solicitud de baja (handoff) que el atleta debe confirmar en su app antes de cerrar la relación.`,
      )
    )
      return;
    leaveDecision.mutate(
      { membershipId, action: "request" },
      {
        onSuccess: () => ok(`Baja solicitada a ${nombre}. Queda pendiente de su confirmación.`),
        onError: (error) => fail(errMsg(error, "No se pudo solicitar la baja.")),
      },
    );
  };

  const m = detail.data;
  const nombre = m?.athlete_name ?? "el atleta";
  const status = (m?.status as string) ?? "";
  const efectoPlan = efectoDeAsignarPlan(status);
  const enGrupo = !!m?.billing_group_name;
  const puedePlan = !!m && !enGrupo && efectoPlan !== "cerrado";
  const puedeCongelar = status === "active";
  const puedeBloquear = BLOQUEABLES.has(status);
  const puedeDesligar = LEAVE_ELIGIBLE.has(status);
  const editable = !!m?.athlete_profile.profile_editable_by_gym;
  const bloqueo = status === "blocked" ? ultimoBloqueo(m?.status_history) : undefined;

  return (
    <>
      <DetailSheet opened={!!membershipId} onClose={onClose} title="Ficha del atleta" size={580}>
        {detail.isError ? (
          // Antes un fallo de la ficha dejaba el loader girando para siempre.
          <PageError
            message={errMsg(detail.error, "No se pudo cargar la ficha del atleta.")}
            onRetry={() => detail.refetch()}
          />
        ) : !m ? (
          <PageLoading label="Cargando ficha…" />
        ) : (
          <Stack gap="md">
            {/* Quién es y en qué está. */}
            <Group gap="sm" wrap="nowrap" align="center">
              <Avatar src={m.athlete_profile.photo} color="flame" radius="xl" size={56}>
                {m.athlete_name?.[0]?.toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Title order={3} style={{ overflowWrap: "anywhere" }}>
                  {m.athlete_profile.full_name ?? m.athlete_name}
                </Title>
                <Group gap={6} wrap="wrap" mt={4}>
                  <StatusBadge kind="membership" status={m.status} size="sm" />
                  <Text size="sm" c="dimmed">
                    {m.plan_name ?? "Sin plan"}
                    {m.renewal_date ? ` · vence ${m.renewal_date}` : ""}
                  </Text>
                  <Vencimiento
                    days={m.days_to_due}
                    date={m.renewal_date}
                    graceUntil={m.payment_grace_until}
                  />
                  {enGrupo && (
                    <Badge variant="light" color="grape" size="sm">
                      {m.billing_group_name}
                    </Badge>
                  )}
                </Group>
              </div>
            </Group>

            {/* Lo pendiente, primero y con su botón. */}
            {esAdmin && status === "pending_leave" && (
              <Tarjeta etiqueta="Baja pendiente" aviso>
                {m.leave_initiated_by === "athlete" ? (
                  <Group justify="space-between" wrap="wrap" gap="sm">
                    <Text size="sm" fw={600}>
                      Pidió su baja.
                    </Text>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        color="red"
                        loading={leaveDecision.isPending}
                        onClick={() => onLeave(nombre, "approve")}
                      >
                        Confirmar baja
                      </Button>
                      <Button size="xs" variant="default" onClick={() => onLeave(nombre, "cancel")}>
                        Cancelar
                      </Button>
                    </Group>
                  </Group>
                ) : (
                  <Group justify="space-between" wrap="wrap" gap="sm">
                    <Text size="sm" fw={600}>
                      Esperando que confirme la baja.
                    </Text>
                    <Button
                      size="xs"
                      variant="default"
                      loading={leaveDecision.isPending}
                      onClick={() => onLeave(nombre, "cancel")}
                    >
                      Cancelar baja propuesta
                    </Button>
                  </Group>
                )}
              </Tarjeta>
            )}
            {esAdmin && status === "blocked" && (
              <Tarjeta etiqueta="Acceso bloqueado" aviso>
                <Group justify="space-between" wrap="wrap" gap="sm" align="flex-start">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Text size="sm" fw={600}>
                      Acceso bloqueado
                    </Text>
                    <Text size="sm" c="dimmed">
                      {bloqueo
                        ? `${bloqueo.comment || "Sin motivo registrado."} (${new Date(
                            bloqueo.changed_at,
                          ).toLocaleDateString("es-GT")})`
                        : "Sin motivo registrado."}
                    </Text>
                  </div>
                  <Button
                    size="xs"
                    leftSection={<LockOpen size={14} />}
                    loading={unblock.isPending}
                    onClick={() => onDesbloquear(nombre)}
                  >
                    Levantar bloqueo
                  </Button>
                </Group>
              </Tarjeta>
            )}
            {esAdmin && status === "paused" && (
              <Tarjeta etiqueta="Membresía congelada" aviso>
                <Group justify="space-between" wrap="wrap" gap="sm" align="flex-start">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Text size="sm" fw={600}>
                      Congelada{m.paused_at ? ` desde el ${m.paused_at}` : ""}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {m.pause_until ? `Vuelve el ${m.pause_until}.` : "Sin fecha de retorno."}{" "}
                      {m.pause_reason ? `Motivo: ${m.pause_reason}` : ""}
                    </Text>
                  </div>
                  <Button
                    size="xs"
                    leftSection={<Play size={14} />}
                    loading={resume.isPending}
                    onClick={() => onReanudar(nombre)}
                  >
                    Reanudar membresía
                  </Button>
                </Group>
              </Tarjeta>
            )}

            {/* Acciones del admin: las de todos los días a la vista, el resto en «Más». */}
            {esAdmin && (
              <Group gap="xs" wrap="wrap">
                {puedePlan && (
                  <Button size="sm" onClick={() => setModal("plan")}>
                    Plan y cuota
                  </Button>
                )}
                <Menu shadow="md" position="bottom-start" withinPortal zIndex={SOBRE_FICHA}>
                  <Menu.Target>
                    <Button
                      size="sm"
                      variant="light"
                      leftSection={<Bell size={15} />}
                      loading={sendReminder.isPending}
                    >
                      Recordatorio
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Enviar por</Menu.Label>
                    <Menu.Item leftSection={<Smartphone size={14} />} onClick={() => onReminder(nombre, "push")}>
                      Notificación push
                    </Menu.Item>
                    <Menu.Item leftSection={<Mail size={14} />} onClick={() => onReminder(nombre, "email")}>
                      Correo
                    </Menu.Item>
                    <Menu.Item leftSection={<Bell size={14} />} onClick={() => onReminder(nombre, "both")}>
                      Ambos
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Menu shadow="md" position="bottom-start" withinPortal zIndex={SOBRE_FICHA}>
                  <Menu.Target>
                    <Button size="sm" variant="default" rightSection={<ChevronDown size={14} />}>
                      Más
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {editable && (
                      <Menu.Item leftSection={<UserPen size={14} />} onClick={() => setModal("datos")}>
                        Completar datos
                      </Menu.Item>
                    )}
                    {puedeCongelar && (
                      <Menu.Item leftSection={<Pause size={14} />} onClick={() => setModal("congelar")}>
                        Congelar membresía
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<KeyRound size={14} />}
                      onClick={() => onResetPassword(nombre)}
                    >
                      Restablecer contraseña
                    </Menu.Item>
                    {(puedeBloquear || puedeDesligar) && <Menu.Divider />}
                    {puedeBloquear && (
                      <Menu.Item color="red" leftSection={<Ban size={14} />} onClick={() => setModal("bloquear")}>
                        Bloquear acceso
                      </Menu.Item>
                    )}
                    {puedeDesligar && (
                      <Menu.Item color="red" leftSection={<LogOut size={14} />} onClick={() => onDesligar(nombre)}>
                        Desligar atleta
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            )}
            {esAdmin && enGrupo && (
              <Text size="sm" c="dimmed">
                Lo paga el plan grupal «{m.billing_group_name}»: su plan y su cuota se manejan en
                Planes grupales.
              </Text>
            )}
            {esAdmin && !enGrupo && efectoPlan === "cerrado" && !["blocked", "pending_leave"].includes(status) && (
              <Text size="sm" c="dimmed">
                {dondeSeGestiona(status)}
              </Text>
            )}

            {/* Sus datos: los globales los edita el atleta desde su app. */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={6}>
              <Dato etiqueta="Cumpleaños">
                {m.athlete_profile.birth_date || <Text span c="dimmed">Sin registrar</Text>}
              </Dato>
              <Dato etiqueta="Emergencia">
                {contactoEmergencia(m.athlete_profile.emergency_contact) ?? (
                  <Text span c="dimmed">Sin contacto</Text>
                )}
              </Dato>
              <Dato etiqueta="Objetivos">
                {m.athlete_profile.goals || <Text span c="dimmed">Sin registrar</Text>}
              </Dato>
              <Dato etiqueta="Miembro desde">
                {m.start_date ? new Date(`${m.start_date}T00:00:00`).toLocaleDateString("es-GT") : "—"}
              </Dato>
              <Dato etiqueta="Puntos">{m.community_points ?? 0}</Dato>
              <Dato etiqueta="Notas internas">
                {m.internal_notes || <Text span c="dimmed">Sin notas</Text>}
              </Dato>
            </SimpleGrid>

            {/* Cobro: se guarda al cambiarlo. Un miembro de plan grupal lo cobra el titular. */}
            {esAdmin && !enGrupo && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Switch
                  label="Renovación automática"
                  checked={billing.auto_renew}
                  disabled={updateBilling.isPending}
                  onChange={(e) => onBillingChange({ auto_renew: e.currentTarget.checked })}
                />
                <Select
                  label="Cobro preferido"
                  value={billing.payment_method_pref}
                  disabled={updateBilling.isPending}
                  onChange={(v) => v && onBillingChange({ payment_method_pref: v as MetodoCobro })}
                  data={[
                    { value: "card", label: "Tarjeta" },
                    { value: "cash", label: "Efectivo" },
                    { value: "bank_transfer", label: "Transferencia" },
                  ]}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: true, zIndex: SOBRE_FICHA }}
                />
              </SimpleGrid>
            )}

            <Historial detalle={m} />
          </Stack>
        )}
      </DetailSheet>

      {m && esAdmin && (
        <>
          <PlanYCuotaModal
            gymId={gymId}
            detalle={m}
            opened={modal === "plan"}
            onClose={() => setModal(null)}
          />
          <CongelarModal
            gymId={gymId}
            membershipId={membershipId}
            nombre={nombre}
            opened={modal === "congelar"}
            onClose={() => setModal(null)}
          />
          <BloquearModal
            gymId={gymId}
            membershipId={membershipId}
            nombre={nombre}
            opened={modal === "bloquear"}
            onClose={() => setModal(null)}
          />
          <DatosModal
            gymId={gymId}
            detalle={m}
            opened={modal === "datos"}
            onClose={() => setModal(null)}
          />
        </>
      )}
    </>
  );
}

/** Pagos y asistencia en ESTE gimnasio, en dos pestañas para no alargar la ficha. */
function Historial({ detalle }: { detalle: MembershipDetail }) {
  return (
    <Tabs defaultValue="pagos" keepMounted={false}>
      <Tabs.List>
        <Tabs.Tab value="pagos">Pagos · {detalle.payments.length}</Tabs.Tab>
        <Tabs.Tab value="asistencia">Asistencia · {detalle.checkins.length}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="pagos" pt="xs">
        {detalle.payments.length === 0 ? (
          <Text c="dimmed" size="sm">
            Sin pagos registrados.
          </Text>
        ) : (
          <Table verticalSpacing={6}>
            <Table.Tbody>
              {detalle.payments.map((payment) => (
                <Table.Tr key={payment.id}>
                  <Table.Td>{new Date(payment.created_at).toLocaleDateString("es-GT")}</Table.Td>
                  <Table.Td>{label(PAYMENT_METHOD, payment.method)}</Table.Td>
                  <Table.Td ta="right">
                    <Money value={payment.amount} decimals={2} />
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge kind="paymentTx" status={payment.status} size="sm" />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Tabs.Panel>
      <Tabs.Panel value="asistencia" pt="xs">
        {detalle.checkins.length === 0 ? (
          <Text c="dimmed" size="sm">
            Sin check-ins registrados.
          </Text>
        ) : (
          <Table verticalSpacing={6}>
            <Table.Tbody>
              {detalle.checkins.map((checkin) => (
                <Table.Tr key={checkin.id}>
                  <Table.Td>{checkin.class_type}</Table.Td>
                  <Table.Td>{new Date(checkin.starts_at).toLocaleString("es-GT")}</Table.Td>
                  <Table.Td>{checkin.method}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Tabs.Panel>
    </Tabs>
  );
}

/**
 * Plan y cuota de un socio que YA está adentro. La cuota vacía significa "sin
 * cuota propia": se manda `custom_fee: null` para QUITARLA, no se omite.
 * El aviso de lo que pasa al guardar NO es decorativo: asignar plan a una
 * relación que no está activa la ACTIVA y le fija vencimiento nuevo.
 */
function PlanYCuotaModal({
  gymId,
  detalle,
  opened,
  onClose,
}: {
  gymId: string;
  detalle: MembershipDetail;
  opened: boolean;
  onClose: () => void;
}) {
  const plans = usePlans(gymId);
  const offers = usePlanOffers(gymId);
  const assignPlan = useAssignPlan(gymId);
  const [form, setForm] = useState<{ planId: string | null; fee: string | number; offerId: string | null }>({
    planId: null,
    fee: "",
    offerId: null,
  });
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (opened && !abiertoAntes) {
    setAbiertoAntes(true);
    setForm({ planId: detalle.plan ?? null, fee: detalle.custom_fee ?? "", offerId: null });
  } else if (!opened && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const efecto = efectoDeAsignarPlan(detalle.status);
  const nombre = detalle.athlete_name;

  /**
   * Se VERIFICA contra la respuesta antes de cantar éxito, y el mensaje nombra
   * el estado que devolvió la API, porque asignar plan a una relación no activa
   * la ACTIVA (y eso el operador tiene que verlo escrito).
   */
  const onGuardar = async () => {
    if (!form.planId) return;
    // El separador de miles es presentación: el backend espera un decimal.
    const cuota = typeof form.fee === "number" ? String(form.fee) : form.fee.replace(/,/g, "").trim();
    try {
      const saved = await assignPlan.mutateAsync({
        membershipId: detalle.id,
        planId: form.planId,
        customFee: cuota === "" ? null : cuota,
        offerId: form.offerId ?? undefined,
      });
      if (saved.plan !== form.planId) {
        fail("La API no guardó el plan. Avisa a soporte de Nucleo.");
        return;
      }
      const plan = (plans.data ?? []).find((p) => p.id === form.planId);
      const activada = saved.status === "active" && efecto !== "solo_plan";
      // La cuota se lee de la RESPUESTA: una oferta de porcentaje la recalcula.
      const cuotaGuardada = saved.custom_fee ?? null;
      ok(
        `${nombre}: plan ${plan?.name ?? "actualizado"}` +
          (cuotaGuardada === null
            ? " con el precio del plan (sin cuota personalizada)."
            : ` con cuota de ${fmtQ(cuotaGuardada, { decimals: 2 })}.`) +
          (activada ? ` La membresía quedó activa y vence el ${saved.renewal_date}.` : ""),
      );
      onClose();
    } catch (error) {
      fail(errMsg(error, "No se pudo guardar el plan."));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Plan y cuota · ${nombre}`} centered size="lg" zIndex={SOBRE_FICHA}>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Select
          label="Plan"
          placeholder="Selecciona plan"
          value={form.planId}
          onChange={(planId) => setForm({ ...form, planId })}
          // Sin catálogo el selector queda vacío y parece que el gym no tiene planes.
          error={plans.isError ? "No se pudieron cargar los planes." : undefined}
          // Los planes grupales van por "Planes grupales", no a una persona.
          data={(plans.data ?? [])
            .filter((p) => !p.group_kind)
            .map((p) => ({ value: p.id, label: `${p.name} · ${fmtQ(p.price, { decimals: 2 })}` }))}
          comboboxProps={{ withinPortal: true, zIndex: SOBRE_FICHA + 1 }}
        />
        <NumberInput
          label="Cuota personalizada"
          prefix="Q"
          min={0}
          decimalScale={2}
          allowNegative={false}
          thousandSeparator=","
          placeholder={(plans.data ?? []).find((p) => p.id === form.planId)?.price ?? "Precio del plan"}
          value={form.fee}
          onChange={(fee) => setForm({ ...form, fee })}
        />
        <Select
          label="Oferta"
          placeholder="Sin oferta"
          value={form.offerId}
          onChange={(offerId) => setForm({ ...form, offerId })}
          clearable
          data={(offers.data ?? [])
            .filter((o) => o.is_active && (!o.plan || o.plan === form.planId))
            .map((o) => ({
              value: o.id,
              label: `${o.name} (${o.offer_type === "percent" ? `${o.value}%` : `${o.value} meses`})`,
            }))}
          comboboxProps={{ withinPortal: true, zIndex: SOBRE_FICHA + 1 }}
        />
      </SimpleGrid>
      {efecto === "solo_plan" ? (
        <Text size="sm" c="dimmed" mt="sm">
          Hoy paga {fmtQ(detalle.effective_fee, { decimals: 2 })}. No cambia el vencimiento (
          {detalle.renewal_date ?? "sin fecha"}).
        </Text>
      ) : (
        <Alert color="yellow" variant="light" mt="sm">
          Al guardar queda ACTIVA con vencimiento nuevo desde hoy, sin registrar pago.
          {efecto === "activa_y_descongela" &&
            " Además pierde los días congelados: para eso usa «Reanudar membresía»."}
        </Alert>
      )}
      <Group justify="flex-end" mt="lg" gap="xs">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!form.planId} loading={assignPlan.isPending} onClick={onGuardar}>
          Guardar plan y cuota
        </Button>
      </Group>
    </Modal>
  );
}

/**
 * Congelar: el vencimiento NO se mueve al pausar; el backend lo corre al reanudar
 * por los días exactos de la pausa. El motivo es nota INTERNA del gym.
 */
function CongelarModal({
  gymId,
  membershipId,
  nombre,
  opened,
  onClose,
}: {
  gymId: string;
  membershipId: string;
  nombre: string;
  opened: boolean;
  onClose: () => void;
}) {
  const pause = usePauseMembership(gymId);
  const [form, setForm] = useState({ reason: "", return_date: "" });
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (opened && !abiertoAntes) {
    setAbiertoAntes(true);
    setForm({ reason: "", return_date: "" });
  } else if (!opened && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const onPausar = async () => {
    try {
      await pause.mutateAsync({
        membershipId,
        reason: form.reason.trim(),
        return_date: form.return_date || null,
      });
      onClose();
      ok(`Membresía de ${nombre} congelada. Al reanudar se le devuelven los días pausados.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo congelar la membresía."));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Congelar · ${nombre}`} centered zIndex={SOBRE_FICHA}>
      <Textarea
        label="Motivo (solo lo ve tu equipo)"
        placeholder="Viaje de dos semanas…"
        maxLength={200}
        autosize
        minRows={2}
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.currentTarget.value })}
        mb="sm"
        data-autofocus
      />
      <DateInput
        label="Vuelve el (opcional)"
        valueFormat="YYYY-MM-DD"
        clearable
        minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
        value={form.return_date ? new Date(`${form.return_date}T00:00:00`) : null}
        onChange={(d) => setForm({ ...form, return_date: d ? d.toLocaleDateString("en-CA") : "" })}
        popoverProps={{ withinPortal: true, zIndex: SOBRE_FICHA + 1 }}
        mb="lg"
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button color="flame" leftSection={<Pause size={16} />} loading={pause.isPending} onClick={onPausar}>
          Congelar membresía
        </Button>
      </Group>
    </Modal>
  );
}

/**
 * Bloquear: el motivo queda en el historial de la membresía (append-only). Se
 * pide aparte y no con un `confirm` porque es el registro permanente del POR QUÉ.
 */
function BloquearModal({
  gymId,
  membershipId,
  nombre,
  opened,
  onClose,
}: {
  gymId: string;
  membershipId: string;
  nombre: string;
  opened: boolean;
  onClose: () => void;
}) {
  const block = useBlockMembership(gymId);
  const [motivo, setMotivo] = useState("");
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (opened && !abiertoAntes) {
    setAbiertoAntes(true);
    setMotivo("");
  } else if (!opened && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const onBloquear = async () => {
    try {
      await block.mutateAsync({ membershipId, reason: motivo.trim() });
      onClose();
      ok(`Acceso de ${nombre} bloqueado. Se le avisó y no podrá reservar ni entrar.`);
    } catch (error) {
      fail(errMsg(error, "No se pudo bloquear la membresía."));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Bloquear acceso · ${nombre}`} centered zIndex={SOBRE_FICHA}>
      <Textarea
        label="Motivo (queda en el historial, no se edita)"
        placeholder="Incumplimiento del reglamento…"
        maxLength={200}
        autosize
        minRows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.currentTarget.value)}
        mb="lg"
        data-autofocus
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button color="red" leftSection={<Ban size={16} />} loading={block.isPending} onClick={onBloquear}>
          Bloquear acceso
        </Button>
      </Group>
    </Modal>
  );
}

/**
 * Nombre, cumpleaños y contacto de emergencia son datos GLOBALES de la persona.
 * El backend solo deja escribirlos mientras el alta que hizo el gym siga sin
 * reclamar (`profile_editable_by_gym`); por eso solo se ofrece en ese caso.
 */
function DatosModal({
  gymId,
  detalle,
  opened,
  onClose,
}: {
  gymId: string;
  detalle: MembershipDetail;
  opened: boolean;
  onClose: () => void;
}) {
  const editProfile = useEditAthleteProfile(gymId);
  const [edit, setEdit] = useState({ first_name: "", last_name: "", birth_date: "", ec_name: "", ec_phone: "", ec_relation: "" });
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (opened && !abiertoAntes) {
    setAbiertoAntes(true);
    const a = detalle.athlete_profile;
    const ec = (a.emergency_contact ?? {}) as Record<string, string>;
    setEdit({
      first_name: a.first_name ?? "",
      last_name: a.last_name ?? "",
      birth_date: a.birth_date ?? "",
      ec_name: ec.name ?? "",
      ec_phone: ec.phone ?? "",
      ec_relation: ec.relation ?? "",
    });
  } else if (!opened && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const onGuardar = async () => {
    try {
      await editProfile.mutateAsync({
        membershipId: detalle.id,
        first_name: edit.first_name,
        last_name: edit.last_name,
        birth_date: edit.birth_date || null,
        emergency_contact:
          edit.ec_name || edit.ec_phone || edit.ec_relation
            ? { name: edit.ec_name, phone: edit.ec_phone, relation: edit.ec_relation }
            : null,
      });
      ok("Perfil del atleta actualizado.");
      onClose();
    } catch (error) {
      fail(errMsg(error, "No se pudo actualizar el perfil."));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Completar datos" centered size="lg" zIndex={SOBRE_FICHA}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput label="Nombre" value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.currentTarget.value })} />
        <TextInput label="Apellido" value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.currentTarget.value })} />
        <DateInput
          label="Cumpleaños"
          valueFormat="YYYY-MM-DD"
          value={edit.birth_date ? new Date(`${edit.birth_date}T00:00:00`) : null}
          onChange={(d) => setEdit({ ...edit, birth_date: d ? d.toLocaleDateString("en-CA") : "" })}
          popoverProps={{ withinPortal: true, zIndex: SOBRE_FICHA + 1 }}
        />
        <TextInput label="Contacto (nombre)" value={edit.ec_name} onChange={(e) => setEdit({ ...edit, ec_name: e.currentTarget.value })} />
        <PhoneInput label="Contacto (teléfono)" value={edit.ec_phone} onChange={(ec_phone) => setEdit({ ...edit, ec_phone })} />
        <TextInput label="Parentesco" value={edit.ec_relation} onChange={(e) => setEdit({ ...edit, ec_relation: e.currentTarget.value })} />
      </SimpleGrid>
      <Group justify="flex-end" mt="lg" gap="xs">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button loading={editProfile.isPending} onClick={onGuardar}>
          Guardar cambios
        </Button>
      </Group>
    </Modal>
  );
}
