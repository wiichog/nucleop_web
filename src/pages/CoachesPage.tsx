import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DetailSheet } from "../components/DetailSheet";
import {
  useCoachRequests,
  useDeactivateCoach,
  useDecideCoachRequest,
  useGymCoaches,
  useInviteCoach,
  useUpdateCoach,
} from "../api/hooks";
import type { Coach, CoachRequest } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";

const money = (v: string | number) => fmtQ(v, { decimals: 2 });
const nombre = (c: Coach) => c.name || c.email;

/**
 * El equipo de coaches. Arriba lo que espera tu decisión (quién pidió entrar), luego
 * tu equipo en tarjetas; tocar a un coach abre su perfil con sus acciones. Invitar es
 * un botón que abre una ventana. La tarifa y las liquidaciones viven en Pagos a coaches.
 */
export function CoachesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const coaches = useGymCoaches(gymId);
  const requests = useCoachRequests(gymId);
  const decideRequest = useDecideCoachRequest(gymId);
  const updateCoach = useUpdateCoach(gymId);
  const deactivateCoach = useDeactivateCoach(gymId);

  const [invitando, setInvitando] = useState(false);
  // Se guarda el id y no el objeto: así el perfil abierto refleja el cambio del
  // interruptor en cuanto la lista se refresca.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  /** Da o quita el permiso de subir workouts y VERIFICA contra la respuesta. */
  const onPermisoProgramacion = async (coach: Coach, permitido: boolean) => {
    try {
      const saved = (await updateCoach.mutateAsync({
        staffId: coach.staff_role,
        body: { can_program_wods: permitido },
      })) as Coach;
      if (saved.can_program_wods !== permitido) {
        notifications.show({
          color: "red",
          message: "La API no guardó el permiso. Avisa a soporte de Nucleo.",
        });
        return;
      }
      notifications.show({
        color: "teal",
        message: permitido
          ? `${nombre(coach)} ya puede subir el workout.`
          : `${nombre(coach)} ya no puede subir el workout; solo lo ve.`,
      });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo cambiar el permiso.") });
    }
  };

  /**
   * ¿Se está resolviendo ESTA solicitud (y, si se indica, con esta acción)? Un solo
   * isPending para toda la lista hacía girar los botones de todas las filas.
   */
  const decidiendo = (requestId: string, action?: "approve" | "reject" | "cancel") =>
    decideRequest.isPending &&
    decideRequest.variables?.requestId === requestId &&
    (action === undefined || decideRequest.variables?.action === action);

  /**
   * Aprueba o rechaza que un coach se una al gym. Sin feedback, el admin tocaba
   * "Aprobar", nada se movía y no sabía si había fallado o si el listado tardaba.
   */
  const onDecidir = (requestId: string, email: string, action: "approve" | "reject") => {
    decideRequest.mutate(
      { requestId, action },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message:
              action === "approve"
                ? `${email} ya es coach de tu gimnasio.`
                : `Solicitud de ${email} rechazada.`,
          }),
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, "No se pudo resolver la solicitud del coach."),
          }),
      },
    );
  };

  /** Retira una invitación que el coach todavía no contesta (no se borra: queda cancelada). */
  const onCancelarInvitacion = (requestId: string, email: string) => {
    if (!window.confirm(`¿Cancelar la invitación a ${email}? Ya no podrá aceptarla.`)) return;
    decideRequest.mutate(
      { requestId, action: "cancel" },
      {
        onSuccess: () =>
          notifications.show({ color: "teal", message: `Invitación a ${email} cancelada.` }),
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, "No se pudo cancelar la invitación."),
          }),
      },
    );
  };

  /** Da de baja a un coach: sus clases futuras quedan sin coach y sale del equipo. */
  const onDarDeBaja = async (coach: Coach) => {
    const quien = nombre(coach);
    if (
      !window.confirm(
        `¿Dar de baja a ${quien}? Sus clases futuras se quedarán sin coach y ya no aparecerá en tu equipo. Sus clases ya dadas y lo que se le debe no se borran.`,
      )
    )
      return;
    try {
      const { clases_liberadas: n } = await deactivateCoach.mutateAsync(coach.staff_role);
      setAbiertoId(null);
      notifications.show({
        color: "teal",
        message:
          n > 0
            ? `${quien} ya no está en tu equipo. ${n} ${n === 1 ? "clase quedó" : "clases quedaron"} sin coach.`
            : `${quien} ya no está en tu equipo.`,
      });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo dar de baja al coach.") });
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (coaches.isError) return <PageError onRetry={() => coaches.refetch()} />;

  const roster = coaches.data ?? [];
  const solicitudes = requests.data ?? [];
  const piden = solicitudes.filter((r) => r.direction === "coach_apply");
  const invitados = solicitudes.filter((r) => r.direction !== "coach_apply");
  const q = search.trim().toLowerCase();
  // Activos primero y, dentro, por nombre: el equipo que da clases va al frente.
  const visibles = roster
    .filter((c) => !q || nombre(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || nombre(a).localeCompare(nombre(b), "es"));
  const abierto = roster.find((c) => c.staff_role === abiertoId) ?? null;

  return (
    <div>
      <PageHeader kicker="Operación · Equipo" title="Coaches" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Tu equipo"
          avisos={
            piden.length > 0 && (
              <Badge color="yellow" variant="light">
                {piden.length} por aprobar
              </Badge>
            )
          }
        >
          {roster.length > 6 && (
            <TextInput
              placeholder="Buscar coach…"
              aria-label="Buscar coach"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={{ base: "100%", sm: 220 }}
            />
          )}
          <Button onClick={() => setInvitando(true)}>Invitar coach</Button>
        </Encabezado>

        {/* Un fallo aquí decía "no hay solicitudes": el coach que aplicó se
            quedaba esperando y el gym creía que nadie había pedido unirse. */}
        {requests.isError ? (
          <PageError
            message="No se pudieron cargar las solicitudes de coaches."
            onRetry={() => requests.refetch()}
          />
        ) : piden.length > 0 ? (
          <Stack gap={6} mb="lg">
            {piden.map((r) => (
              <Tarjeta key={r.id} aviso etiqueta={`${r.user_email} pidió unirse`}>
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Text size="sm" style={{ flex: 1, minWidth: 200 }}>
                    <b>{r.user_email}</b>{" "}
                    <Text span c="dimmed">
                      · Solicitó unirse
                    </Text>
                  </Text>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      loading={decidiendo(r.id, "approve")}
                      disabled={decidiendo(r.id)}
                      onClick={() => onDecidir(r.id, r.user_email, "approve")}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      loading={decidiendo(r.id, "reject")}
                      disabled={decidiendo(r.id)}
                      onClick={() => onDecidir(r.id, r.user_email, "reject")}
                    >
                      Rechazar
                    </Button>
                  </Group>
                </Group>
              </Tarjeta>
            ))}
          </Stack>
        ) : null}

        {coaches.isLoading ? (
          <Text size="sm" c="dimmed">
            Cargando…
          </Text>
        ) : visibles.length === 0 ? (
          <Text size="sm" c="dimmed">
            {roster.length ? "Ningún coach coincide con la búsqueda." : "Aún no tienes coaches. Invita al primero."}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
            {visibles.map((c) => (
              <TarjetaCoach key={c.staff_role} coach={c} onClick={() => setAbiertoId(c.staff_role)} />
            ))}
          </SimpleGrid>
        )}

        {invitados.length > 0 && (
          <>
            <Title order={4} mt="xl" mb="sm">
              Invitados
            </Title>
            <Stack gap={6}>
              {invitados.map((r) => (
                <Invitacion
                  key={r.id}
                  r={r}
                  cancelando={decidiendo(r.id)}
                  onCancelar={() => onCancelarInvitacion(r.id, r.user_email)}
                />
              ))}
            </Stack>
          </>
        )}
      </GlassCard>

      <InvitarCoachModal gymId={gymId} opened={invitando} onClose={() => setInvitando(false)} />

      <CoachProfileSheet
        coach={abierto}
        onClose={() => setAbiertoId(null)}
        onDarDeBaja={onDarDeBaja}
        dandoDeBaja={deactivateCoach.isPending}
        onPermiso={onPermisoProgramacion}
        guardandoPermiso={
          !!abierto && updateCoach.isPending && updateCoach.variables?.staffId === abierto.staff_role
        }
      />
    </div>
  );
}

/** Un coach del equipo. Tocarlo abre su perfil. */
function TarjetaCoach({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  return (
    <Tarjeta etiqueta={`Abrir perfil de ${nombre(coach)}`} onClick={onClick} apagada={!coach.is_active}>
      <Group gap="sm" wrap="nowrap">
        <Avatar src={coach.photo} radius="xl" size={38} color="flame">
          {nombre(coach).slice(0, 1).toUpperCase()}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>
            {nombre(coach)}
          </Text>
          <Text c="dimmed" size="xs" truncate>
            {coach.pay_type === "fixed" ? "Salario fijo" : "Por clase"}
            {coach.rating != null ? ` · ⭐ ${coach.rating.toFixed(1)} (${coach.rating_count})` : ""}
          </Text>
        </div>
      </Group>
      <Group gap={6} mt={8}>
        {!coach.is_active && (
          <Badge size="xs" variant="light" color="gray">
            Inactivo
          </Badge>
        )}
        {coach.can_program_wods && (
          <Badge size="xs" variant="light" color="flame">
            Sube el workout
          </Badge>
        )}
      </Group>
    </Tarjeta>
  );
}

/** Una invitación que tú mandaste: decide el coach; tú solo puedes retirarla. */
function Invitacion({
  r,
  cancelando,
  onCancelar,
}: {
  r: CoachRequest;
  cancelando: boolean;
  onCancelar: () => void;
}) {
  return (
    <Tarjeta etiqueta={`Invitación a ${r.user_email}`}>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm" style={{ flex: 1, minWidth: 200 }}>
          <b>{r.user_email}</b>{" "}
          <Text span c="dimmed">
            · Esperando que acepte
          </Text>
        </Text>
        <Button size="xs" variant="subtle" color="red" loading={cancelando} onClick={onCancelar}>
          Cancelar invitación
        </Button>
      </Group>
    </Tarjeta>
  );
}

/** La ventana de invitar: correo obligatorio, nombre y apellido opcionales. */
function InvitarCoachModal({ gymId, opened, onClose }: { gymId: string; opened: boolean; onClose: () => void }) {
  const inviteCoach = useInviteCoach(gymId);
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState("");

  const cerrar = () => {
    setError("");
    onClose();
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await inviteCoach.mutateAsync({ email: email.trim(), first_name: first, last_name: last });
      setEmail("");
      setFirst("");
      setLast("");
      notifications.show({
        color: "teal",
        message: "Invitación enviada. El coach debe reclamar su cuenta y aceptar.",
      });
      onClose();
    } catch {
      setError("No se pudo invitar (¿correo ya activo como coach?).");
    }
  };

  return (
    <Modal opened={opened} onClose={cerrar} title="Invitar coach" centered>
      <form onSubmit={onInvite}>
        <TextInput
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          data-autofocus
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="sm">
          <TextInput label="Nombre" value={first} onChange={(e) => setFirst(e.currentTarget.value)} />
          <TextInput label="Apellido" value={last} onChange={(e) => setLast(e.currentTarget.value)} />
        </SimpleGrid>
        {error && (
          <Text size="sm" mt="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end" mt="lg" gap="xs">
          <Button variant="default" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" loading={inviteCoach.isPending} disabled={!email.trim()}>
            Invitar
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

export function CoachProfileSheet({
  coach,
  onClose,
  onDarDeBaja,
  dandoDeBaja = false,
  onPermiso,
  guardandoPermiso = false,
}: {
  coach: Coach | null;
  onClose: () => void;
  onDarDeBaja: (coach: Coach) => void;
  dandoDeBaja?: boolean;
  /** Prende o apaga «Sube el workout». Sin él, el interruptor no se muestra. */
  onPermiso?: (coach: Coach, permitido: boolean) => void;
  guardandoPermiso?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <DetailSheet opened={!!coach} onClose={onClose} title="Perfil del coach">
      {coach && (
        <>
          <Group gap="md" mb="md">
            <Avatar src={coach.photo} radius="xl" size={64} color="flame">
              {nombre(coach).slice(0, 1).toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Text fw={600} fz="lg" ff="var(--a-font-display)" style={{ letterSpacing: "-0.015em" }}>
                {nombre(coach)}
              </Text>
              <Text c="dimmed" size="sm">
                {coach.email}
              </Text>
              <Group gap={6} mt={4}>
                <Badge variant="light" color={coach.is_active ? "teal" : "gray"}>
                  {coach.is_active ? "Activo" : "Inactivo"}
                </Badge>
                {coach.rating != null && (
                  <Text size="sm" className="a-tabular">
                    ⭐ {coach.rating.toFixed(1)}{" "}
                    <Text span c="dimmed" size="xs">
                      ({coach.rating_count})
                    </Text>
                  </Text>
                )}
              </Group>
            </div>
          </Group>
          {onPermiso && (
            <Switch
              mb="md"
              label="Sube el workout"
              checked={coach.can_program_wods}
              disabled={guardandoPermiso}
              onChange={(e) => onPermiso(coach, e.currentTarget.checked)}
              aria-label={`Permitir que ${nombre(coach)} suba el workout`}
            />
          )}
          <Divider mb="md" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <div>
              <SectionLabel mb={4}>Forma de pago</SectionLabel>
              <Text fw={600}>{coach.pay_type === "fixed" ? "Salario fijo" : "Por clase"}</Text>
            </div>
            <div>
              <SectionLabel mb={4}>
                {coach.pay_type === "fixed" ? "Salario fijo" : "Tarifa por clase"}
              </SectionLabel>
              <Text fw={600} className="a-tabular">
                {coach.pay_type === "fixed" ? money(coach.fixed_amount) : money(coach.per_class_rate)}
              </Text>
            </div>
          </SimpleGrid>
          <Group justify="space-between" mt="lg" gap="xs">
            <Button variant="subtle" color="red" loading={dandoDeBaja} onClick={() => onDarDeBaja(coach)}>
              Dar de baja
            </Button>
            <Button variant="default" onClick={() => navigate("/panel/coaches-pagos")}>
              Cambiar tarifa →
            </Button>
          </Group>
        </>
      )}
    </DetailSheet>
  );
}
