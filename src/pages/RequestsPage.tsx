import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { UserPlus } from "lucide-react";
import {
  useAssignPlan,
  useDecideJoinRequest,
  useJoinRequests,
  usePlanOffers,
  usePlans,
} from "../api/hooks";
import { JoinRequest, Membership } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { PageHeader, StatusBadge } from "../components/ui";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { InvitarAtletaModal } from "./usuarios/InvitarAtletaModal";

/**
 * Confirmación de «Asignar plan». La cuota se lee de la RESPUESTA del servidor,
 * no de lo que se tecleó: una oferta de porcentaje la recalcula allá, así que
 * repetir lo escrito prometería un monto que el gimnasio no va a cobrar (igual
 * que hace la ficha en Atletas).
 */
export function mensajeAsignacion(saved: Pick<Membership, "custom_fee" | "status">): string {
  const cuota = saved.custom_fee ?? null;
  return (
    (cuota === null
      ? "Plan asignado con el precio del plan (sin cuota personalizada)."
      : `Plan asignado con cuota de ${fmtQ(cuota, { decimals: 2 })}.`) +
    (saved.status === "active" ? " El atleta ya es miembro activo." : "")
  );
}

/** Todavía no se decide: aprobar, ofrecer prueba, pedir información o rechazar. */
const POR_DECIDIR = ["requested", "invited", "pending_approval"];
/** Ya se aceptó: falta asignarle plan para que quede activo. */
const FALTA_PLAN = ["approved_no_plan", "trial"];

type Decision = "approve" | "reject" | "offer_trial" | "request_info";

/**
 * Cada decisión con su botón, el campo que pide al elegirla y el botón que la
 * confirma. La nota viaja al historial de la membresía; en el rechazo y en
 * «pedir información» es lo que importa, por eso se pide justo ahí.
 */
const DECISIONES: Record<
  Decision,
  { boton: string; campo: string; confirmar: string; color?: string; variant: string; hecho: string }
> = {
  approve: {
    boton: "Aprobar",
    campo: "Nota (opcional)",
    confirmar: "Aprobar",
    variant: "filled",
    hecho: "Solicitud aprobada. Asígnale un plan para activar la membresía.",
  },
  offer_trial: {
    boton: "Ofrecer prueba",
    campo: "Nota (opcional)",
    confirmar: "Ofrecer prueba",
    variant: "light",
    hecho: "Prueba ofrecida al atleta.",
  },
  request_info: {
    boton: "Pedir información",
    campo: "¿Qué información necesitas?",
    confirmar: "Pedir información",
    variant: "default",
    hecho: "Se solicitó más información al atleta.",
  },
  reject: {
    boton: "Rechazar",
    campo: "Motivo del rechazo (opcional)",
    confirmar: "Rechazar solicitud",
    color: "red",
    variant: "light",
    hecho: "Solicitud rechazada.",
  },
};

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short" });

/**
 * Identidad del solicitante. Cuando es un REINGRESO (el atleta ya fue miembro de
 * este gimnasio) lo dice con todas sus letras y muestra lo que la relación trae
 * consigo: sus puntos de comunidad y desde cuándo es de la casa. Aprobar a ciegas
 * y aprobar a alguien que vuelve no son la misma decisión.
 */
export function Solicitante({ request }: { request: JoinRequest }) {
  if (!request.is_rejoin)
    return (
      <Text fw={600} size="sm" truncate>
        {request.athlete_name}
      </Text>
    );
  // `member_since` es "YYYY-MM-DD": el año basta y evita el corrimiento de un día
  // que produce `new Date("2023-05-01")` al pasarlo a la zona de Guatemala.
  const desde = request.member_since?.slice(0, 4);
  return (
    <Stack gap={2}>
      <Text fw={600} size="sm" truncate>
        {request.athlete_name}
      </Text>
      <Group gap={6} wrap="wrap">
        <Badge size="xs" color="grape" variant="light">
          Reingreso
        </Badge>
        <Text size="xs" c="dimmed">
          {request.community_points} pts de comunidad
          {desde ? ` · en el gym desde ${desde}` : ""}
        </Text>
      </Group>
    </Stack>
  );
}

/** Una solicitud en la bandeja: tocarla abre sus acciones. */
function Fila({ request, onOpen }: { request: JoinRequest; onOpen: () => void }) {
  const porDecidir = POR_DECIDIR.includes(request.status ?? "");
  return (
    <Tarjeta etiqueta={`Responder a ${request.athlete_name}`} onClick={onOpen} aviso={porDecidir}>
      <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Solicitante request={request} />
          {request.goal ? (
            <Text size="xs" c="dimmed" truncate mt={2}>
              {request.goal}
            </Text>
          ) : null}
        </div>
        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          <StatusBadge kind="membership" status={request.status} size="sm" />
          <Text size="xs" c="dimmed">
            {fechaCorta(request.created_at)}
          </Text>
        </Stack>
      </Group>
    </Tarjeta>
  );
}

/** Un dato de la solicitud en una línea; si no vino, no ocupa lugar. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <Text size="sm">
      <Text span c="dimmed">
        {etiqueta}:
      </Text>{" "}
      {valor}
    </Text>
  );
}

/**
 * La ventana de una solicitud: lo que pidió la persona y, según dónde está, sus
 * cuatro decisiones (la nota se pide al elegir una) o la asignación del plan.
 */
function ResponderModal({
  request,
  gymId,
  onClose,
}: {
  request: JoinRequest | null;
  gymId: string;
  onClose: () => void;
}) {
  const decide = useDecideJoinRequest(gymId);
  const assign = useAssignPlan(gymId);
  const plans = usePlans(gymId);
  const offers = usePlanOffers(gymId);
  const [eleccion, setEleccion] = useState<Decision | null>(null);
  const [nota, setNota] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  // Cuota personalizada en GTQ. `""` (campo vacío) significa "sin cuota propia":
  // se manda `custom_fee: null` para QUITARLA y volver al precio del plan.
  const [customFee, setCustomFee] = useState<string | number>("");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [hidratadoPara, setHidratadoPara] = useState<JoinRequest | null>(null);

  if (request && hidratadoPara !== request) {
    setHidratadoPara(request);
    setEleccion(null);
    setNota("");
    setPlanId(null);
    setCustomFee("");
    setOfferId(null);
  }

  const ok = (m: string) => notifications.show({ color: "teal", message: m });
  const fail = (m: string) => notifications.show({ color: "red", message: m });

  if (!request) return <Modal opened={false} onClose={onClose} title="" />;

  const status = request.status ?? "";
  const membershipId = request.membership;
  const canDecide = POR_DECIDIR.includes(status);
  const needsPlan = !!membershipId && FALTA_PLAN.includes(status);
  const decisiones = (Object.keys(DECISIONES) as Decision[]).filter(
    (d) => d !== "offer_trial" || status !== "invited",
  );

  const onDecide = (decision: Decision) =>
    decide.mutate(
      { requestId: request.id, decision, comment: nota.trim() },
      {
        onSuccess: () => {
          ok(DECISIONES[decision].hecho);
          onClose();
        },
        onError: (error) => fail(errMsg(error, "No se pudo completar la acción. Inténtalo de nuevo.")),
      },
    );

  /**
   * Asigna el plan. La cuota personalizada viaja SIEMPRE (nunca se omite): con un
   * número la fija, y **vacía manda `null` para quitarla**.
   */
  const onAssign = () => {
    if (!planId || !membershipId) return;
    // El separador de miles es sólo presentación: el backend espera un decimal.
    const fee =
      typeof customFee === "number" ? String(customFee) : customFee.replace(/,/g, "").trim();
    assign.mutate(
      { membershipId, planId, customFee: fee === "" ? null : fee, offerId: offerId ?? undefined },
      {
        onSuccess: (saved) => {
          ok(mensajeAsignacion(saved));
          onClose();
        },
        onError: (error) => fail(errMsg(error, "No se pudo asignar el plan. Inténtalo de nuevo.")),
      },
    );
  };

  const elegida = eleccion ? DECISIONES[eleccion] : null;
  const precioPlan = (plans.data ?? []).find((p) => p.id === planId)?.price;

  return (
    <Modal opened onClose={onClose} title={request.athlete_name} centered size="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs" mb="sm">
        {request.is_rejoin ? (
          <Group gap={6} wrap="wrap">
            <Badge size="sm" color="grape" variant="light">
              Reingreso
            </Badge>
            <Text size="xs" c="dimmed">
              {request.community_points} pts de comunidad
              {request.member_since ? ` · en el gym desde ${request.member_since.slice(0, 4)}` : ""}
            </Text>
          </Group>
        ) : (
          <span />
        )}
        <StatusBadge kind="membership" status={request.status} />
      </Group>
      <Stack gap={4} mb="md">
        <Dato etiqueta="Objetivo" valor={request.goal} />
        <Dato etiqueta="Nivel" valor={request.level} />
        <Dato etiqueta="Horario preferido" valor={request.preferred_schedule} />
        <Dato etiqueta="Quiere prueba" valor={request.wants_trial ? "Sí" : null} />
        <Dato etiqueta="Mensaje" valor={request.comment} />
        <Dato etiqueta="Recibida" valor={new Date(request.created_at).toLocaleDateString("es-GT")} />
      </Stack>

      {canDecide && !elegida && (
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
          {decisiones.map((d) => (
            <Button
              key={d}
              variant={DECISIONES[d].variant}
              color={DECISIONES[d].color}
              onClick={() => setEleccion(d)}
            >
              {DECISIONES[d].boton}
            </Button>
          ))}
        </SimpleGrid>
      )}

      {canDecide && elegida && eleccion && (
        <Stack gap="sm">
          <Textarea
            label={elegida.campo}
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={500}
            data-autofocus
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setEleccion(null)} disabled={decide.isPending}>
              Volver
            </Button>
            <Button
              color={elegida.color}
              loading={decide.isPending}
              onClick={() => onDecide(eleccion)}
            >
              {elegida.confirmar}
            </Button>
          </Group>
        </Stack>
      )}

      {needsPlan && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Plan"
              placeholder="Selecciona plan"
              value={planId}
              onChange={setPlanId}
              // Sin el catálogo el selector queda vacío y parece que el gym no
              // tiene planes: hay que decir que la carga falló.
              error={plans.isError ? "No se pudieron cargar los planes." : undefined}
              // Los planes grupales se asignan creando el grupo (Planes grupales),
              // no a una persona suelta: el backend los rechaza aquí.
              data={(plans.data ?? [])
                .filter((plan) => !plan.group_kind)
                .map((plan) => ({ value: plan.id, label: plan.name }))}
              comboboxProps={{ withinPortal: true }}
            />
            {/* Numérico y con la moneda a la vista: "350 al mes" o "Q350" en texto
                libre viajaban al backend como cuota inválida. */}
            <NumberInput
              label="Cuota personalizada"
              prefix="Q"
              min={0}
              decimalScale={2}
              allowNegative={false}
              thousandSeparator=","
              placeholder={precioPlan ?? "Precio del plan"}
              value={customFee}
              onChange={setCustomFee}
            />
            <Select
              label="Oferta"
              placeholder="Sin oferta"
              value={offerId}
              onChange={setOfferId}
              clearable
              data={(offers.data ?? [])
                .filter((o) => o.is_active && (!o.plan || o.plan === planId))
                .map((o) => ({
                  value: o.id,
                  label: `${o.name} (${o.offer_type === "percent" ? `${o.value}%` : `${o.value} meses`})`,
                }))}
              comboboxProps={{ withinPortal: true }}
            />
          </SimpleGrid>
          <Group justify="flex-end" mt="md" gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!planId} loading={assign.isPending} onClick={onAssign}>
              Asignar plan
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}

export function RequestsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const requests = useJoinRequests(gymId);
  const [search, setSearch] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [abierta, setAbierta] = useState<JoinRequest | null>(null);

  if (!gymId) return <NoGymAssigned />;
  if (requests.isError) return <PageError onRetry={() => requests.refetch()} />;

  // Solo lo que todavía necesita que el gym haga algo: lo resuelto (activa,
  // rechazada, baja) sale de la bandeja y vive en "Atletas".
  const todas = (requests.data ?? []).filter((r) =>
    [...POR_DECIDIR, ...FALTA_PLAN].includes(r.status ?? ""),
  );
  const q = search.trim().toLowerCase();
  const visibles = todas
    .filter((r) => !q || (r.athlete_name ?? "").toLowerCase().includes(q))
    .sort((a, b) => (a.athlete_name ?? "").localeCompare(b.athlete_name ?? "", "es"));
  const porDecidir = visibles.filter((r) => POR_DECIDIR.includes(r.status ?? ""));
  const faltaPlan = visibles.filter((r) => FALTA_PLAN.includes(r.status ?? ""));
  // Los avisos cuentan la bandeja completa, no lo que deja ver la búsqueda.
  const nPorDecidir = todas.filter((r) => POR_DECIDIR.includes(r.status ?? "")).length;
  const nFaltaPlan = todas.length - nPorDecidir;

  return (
    <div>
      <PageHeader kicker="Usuarios · Bandeja" title="Solicitudes" />

      <GlassCard padding={18} delay={0.6}>
        <Encabezado
          titulo="Bandeja"
          avisos={
            <>
              {nPorDecidir > 0 && (
                <Badge color="yellow" variant="light">
                  {nPorDecidir} por decidir
                </Badge>
              )}
              {nFaltaPlan > 0 && (
                <Badge color="yellow" variant="light">
                  {nFaltaPlan} sin plan
                </Badge>
              )}
            </>
          }
        >
          {(todas.length > 5 || search) && (
            <TextInput
              placeholder="Buscar atleta…"
              aria-label="Buscar atleta"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={{ base: "100%", sm: 220 }}
            />
          )}
          <Button leftSection={<UserPlus size={16} />} onClick={() => setInvitando(true)}>
            Invitar atleta
          </Button>
        </Encabezado>

        {requests.isLoading ? (
          <Text size="sm" c="dimmed">
            Cargando…
          </Text>
        ) : porDecidir.length === 0 ? (
          <Text size="sm" c="dimmed">
            {q && nPorDecidir > 0 ? "Nadie coincide con la búsqueda." : "Nada pendiente."}
          </Text>
        ) : (
          <Stack gap={6}>
            {porDecidir.map((r) => (
              <Fila key={r.id} request={r} onOpen={() => setAbierta(r)} />
            ))}
          </Stack>
        )}

        {faltaPlan.length > 0 && (
          <>
            <Title order={4} mt="xl" mb="sm">
              Falta plan
            </Title>
            <Stack gap={6}>
              {faltaPlan.map((r) => (
                <Fila key={r.id} request={r} onOpen={() => setAbierta(r)} />
              ))}
            </Stack>
          </>
        )}
      </GlassCard>

      <ResponderModal request={abierta} gymId={gymId} onClose={() => setAbierta(null)} />
      <InvitarAtletaModal gymId={gymId} opened={invitando} onClose={() => setInvitando(false)} />
    </div>
  );
}
