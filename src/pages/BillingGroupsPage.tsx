import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Input,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useAddBillingGroupDependent,
  useAddBillingGroupMember,
  useBillingGroups,
  useCloseBillingGroup,
  useCreateBillingGroup,
  useMemberships,
  usePlans,
  useRemoveBillingGroupMember,
  useUpdateBillingGroup,
} from "../api/hooks";
import type { BillingGroup, BillingGroupKind, Membership, Plan } from "../api/types";
import { DetailSheet } from "../components/DetailSheet";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { GlassCard } from "../components/aurora";
import { Money, PageHeader, SectionLabel, StatusBadge } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";

/**
 * Plan familiar / empresarial: un titular paga UNA cuota por todo el grupo y cada
 * miembro conserva su propia membresía. Aquí el gym arma los grupos; el titular paga
 * desde su app (el panel no cobra con tarjeta).
 *
 * Mismo criterio que Clases: los grupos van al frente como tarjetas, «Nuevo grupo»
 * abre una ventana, tocar un grupo abre su ficha y lo pendiente sale en amarillo.
 */

const KIND_LABEL: Record<string, string> = { family: "Familiar", corporate: "Empresarial" };
const TERMINALES = new Set(["former_member", "rejected"]);
const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);
const vacioANull = (v: number | string) => (v === "" || v === null ? null : v);
const ok = (message: string) => notifications.show({ color: "teal", message });
const fail = (error: unknown, porDefecto: string) =>
  notifications.show({ color: "red", message: errMsg(error, porDefecto) });

export function BillingGroupsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [verCerrados, setVerCerrados] = useState(false);
  const grupos = useBillingGroups(gymId, verCerrados);
  const plans = usePlans(gymId);
  const memberships = useMemberships(gymId);
  const [creando, setCreando] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const planesGrupales = useMemo(
    () => ((plans.data ?? []) as Plan[]).filter((p) => p.group_kind && p.is_active),
    [plans.data],
  );
  const lista = ((grupos.data ?? []) as BillingGroup[])
    .slice()
    .sort(
      (a, b) =>
        Number(b.is_active ?? true) - Number(a.is_active ?? true) ||
        Number(!!b.open_payment) - Number(!!a.open_payment) ||
        a.name.localeCompare(b.name, "es"),
    );
  const conCuota = lista.filter((g) => g.is_active !== false && g.open_payment).length;
  // Se busca por id en la lista para que la ficha se refresque sola tras cada cambio.
  const abierto = lista.find((g) => g.id === abiertoId) ?? null;
  const sinPlanes = !plans.isLoading && !planesGrupales.length;

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader kicker="Usuarios · Cobro" title="Planes grupales" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Grupos"
          avisos={
            conCuota > 0 && (
              <Badge color="yellow" variant="light">
                {conCuota} con cuota pendiente
              </Badge>
            )
          }
        >
          <Switch
            label="Ver cerrados"
            checked={verCerrados}
            onChange={(e) => setVerCerrados(e.currentTarget.checked)}
            color="flame"
          />
          <Button onClick={() => setCreando(true)} disabled={!planesGrupales.length}>
            Nuevo grupo
          </Button>
        </Encabezado>

        {grupos.isError ? (
          <PageError message="No se pudieron cargar los planes grupales." onRetry={() => grupos.refetch()} />
        ) : sinPlanes && !lista.length ? (
          <Stack gap="sm" align="flex-start">
            <Text c="dimmed" size="sm">
              Primero crea un plan familiar o empresarial.
            </Text>
            <Button component={Link} to="/panel/planes" variant="light">
              Ir a Planes y cuotas
            </Button>
          </Stack>
        ) : grupos.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : lista.length === 0 ? (
          <Text c="dimmed" size="sm">
            {verCerrados ? "No hay grupos." : "Todavía no hay grupos. Usa «Nuevo grupo»."}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
            {lista.map((g) => (
              <TarjetaGrupo key={g.id} grupo={g} onClick={() => setAbiertoId(g.id)} />
            ))}
          </SimpleGrid>
        )}
      </GlassCard>

      <Modal opened={creando} onClose={() => setCreando(false)} title="Nuevo grupo" centered size="lg">
        {creando && (
          <GrupoForm
            gymId={gymId}
            plans={planesGrupales}
            memberships={(memberships.data ?? []) as Membership[]}
            onCancel={() => setCreando(false)}
            onDone={(g) => {
              setCreando(false);
              if (g) setAbiertoId(g.id);
            }}
          />
        )}
      </Modal>

      <DetailSheet opened={!!abierto} onClose={() => setAbiertoId(null)} title={abierto ? abierto.name : ""} size={560}>
        {abierto && (
          <FichaGrupo
            key={abierto.id}
            gymId={gymId}
            grupo={abierto}
            plans={planesGrupales}
            memberships={(memberships.data ?? []) as Membership[]}
            onClosed={() => setAbiertoId(null)}
          />
        )}
      </DetailSheet>
    </div>
  );
}

function TarjetaGrupo({ grupo: g, onClick }: { grupo: BillingGroup; onClick: () => void }) {
  const activo = g.is_active ?? true;
  const pendiente = activo && !!g.open_payment;
  return (
    <Tarjeta etiqueta={`Abrir ${g.name}`} onClick={onClick} aviso={pendiente} apagada={!activo}>
      <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          {g.name}
        </Text>
        <Badge size="xs" color={activo ? "grape" : "gray"} variant="light" style={{ flex: "0 0 auto" }}>
          {activo ? (KIND_LABEL[g.kind] ?? g.kind) : "Cerrado"}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed" truncate>
        Paga {g.payer_name}
      </Text>
      <Text fz={22} fw={700} mt={6} className="a-tabular">
        <Money value={g.effective_fee} />
      </Text>
      <Text size="xs" c="dimmed" truncate>
        {g.plan_name} · {g.seats ? `${g.seats_used} de ${g.seats}` : g.seats_used} personas
      </Text>
      {activo && (
        <Group gap={6} mt={6} wrap="wrap">
          {pendiente ? (
            <Badge size="xs" color="yellow" variant="light">
              Cuota pendiente
            </Badge>
          ) : g.renewal_date ? (
            <StatusBadge kind="payment" status={g.payment_status} size="xs" />
          ) : null}
          <Text size="xs" c="dimmed">
            {g.renewal_date ? `Hasta ${g.renewal_date}` : "Sin pagar aún"}
          </Text>
        </Group>
      )}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Alta y edición del grupo: el mismo formulario
// ---------------------------------------------------------------------------

/**
 * Sin `grupo`, el alta (tipo, plan, titular, precio, cupos y factura). Con `grupo`,
 * su edición: el tipo, el plan y el titular ya no cambian, y abajo va «Cerrar grupo».
 */
function GrupoForm({
  gymId,
  grupo,
  plans,
  memberships,
  onCancel,
  onDone,
}: {
  gymId: string;
  grupo?: BillingGroup;
  plans: Plan[];
  memberships: Membership[];
  onCancel: () => void;
  /** Tras crear, el grupo nuevo; tras guardar, el mismo; tras cerrarlo, null. */
  onDone: (g: BillingGroup | null) => void;
}) {
  const crear = useCreateBillingGroup(gymId);
  const editar = useUpdateBillingGroup(gymId);
  const cerrar = useCloseBillingGroup(gymId);

  const [kind, setKind] = useState<BillingGroupKind>(grupo?.kind ?? "family");
  const [name, setName] = useState(grupo?.name ?? "");
  const [planId, setPlanId] = useState<string | null>(null);
  const [titularPor, setTitularPor] = useState<"miembro" | "correo">("miembro");
  const [payerMembership, setPayerMembership] = useState<string | null>(null);
  const [payerEmail, setPayerEmail] = useState("");
  const [fee, setFee] = useState<number | string>(grupo?.custom_fee ?? "");
  const [seats, setSeats] = useState<number | string>(grupo?.max_members ?? "");
  const [nit, setNit] = useState(grupo?.billing_nit ?? "");
  const [razon, setRazon] = useState(grupo?.billing_name ?? "");
  const [correoFactura, setCorreoFactura] = useState(grupo?.billing_email ?? "");

  const planesDelTipo = plans.filter((p) => p.group_kind === kind);
  const opcionesTitular = memberships
    .filter((m) => !TERMINALES.has(m.status ?? ""))
    .map((m) => ({ value: m.id, label: m.athlete_name ?? "—" }));

  const listo = grupo
    ? !!name.trim()
    : !!name.trim() && !!planId && (titularPor === "miembro" ? !!payerMembership : payerEmail.includes("@"));

  const datosFactura = {
    billing_nit: nit.trim(),
    billing_name: razon.trim(),
    billing_email: correoFactura.trim(),
  };

  const enviar = async () => {
    if (grupo) {
      try {
        await editar.mutateAsync({
          id: grupo.id,
          body: {
            name: name.trim(),
            custom_fee: vacioANull(fee) === null ? null : String(fee),
            max_members: vacioANull(seats) === null ? null : Number(seats),
            ...datosFactura,
          },
        });
        ok("Cambios guardados.");
        onDone(grupo);
      } catch (error) {
        fail(error, "No se pudieron guardar los cambios.");
      }
      return;
    }
    try {
      const g = await crear.mutateAsync({
        kind,
        name: name.trim(),
        plan_id: planId!,
        ...(titularPor === "miembro" ? { payer_membership_id: payerMembership! } : { payer_email: payerEmail.trim() }),
        custom_fee: vacioANull(fee) === null ? null : String(fee),
        max_members: vacioANull(seats) === null ? null : Number(seats),
        ...datosFactura,
      });
      ok(`Grupo «${g.name}» creado. Ahora agrega a sus miembros.`);
      onDone(g);
    } catch (error) {
      fail(error, "No se pudo crear el grupo.");
    }
  };

  const onCerrar = async () => {
    if (!grupo) return;
    if (
      !window.confirm(
        `¿Cerrar el grupo «${grupo.name}»? Todos sus miembros siguen en el gimnasio con los días ya pagados, pero el titular deja de pagar por ellos y cada uno necesitará un plan individual.`,
      )
    )
      return;
    try {
      await cerrar.mutateAsync(grupo.id);
      ok("Grupo cerrado.");
      onDone(null);
    } catch (error) {
      fail(error, "No se pudo cerrar el grupo.");
    }
  };

  return (
    <Stack gap="sm">
      {!grupo && (
        <SegmentedControl
          fullWidth
          aria-label="Tipo de grupo"
          value={kind}
          onChange={(v) => {
            setKind(v as BillingGroupKind);
            setPlanId(null);
          }}
          data={[
            { value: "family", label: "Familiar" },
            { value: "corporate", label: "Empresarial" },
          ]}
        />
      )}
      <SimpleGrid cols={{ base: 1, sm: grupo ? 1 : 2 }} spacing="sm">
        <TextInput
          label="Nombre del grupo"
          placeholder={kind === "family" ? "Familia Pérez" : "Banco Ejemplo"}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {!grupo && (
          <Select
            label="Plan"
            placeholder={planesDelTipo.length ? "Selecciona plan" : "No hay planes de este tipo"}
            data={planesDelTipo.map((p) => ({
              value: p.id,
              label: `${p.name} · ${p.max_members ?? "?"} personas`,
            }))}
            value={planId}
            onChange={setPlanId}
          />
        )}
      </SimpleGrid>

      {!grupo && (
        <Input.Wrapper label="Titular (quien paga desde su app)">
          <SegmentedControl
            fullWidth
            size="xs"
            mb="xs"
            aria-label="Cómo elegir al titular"
            value={titularPor}
            onChange={(v) => setTitularPor(v as "miembro" | "correo")}
            data={[
              { value: "miembro", label: "Ya es del gimnasio" },
              { value: "correo", label: "Por su correo" },
            ]}
          />
          {titularPor === "miembro" ? (
            <Select
              aria-label="Titular"
              placeholder="Busca al atleta"
              data={opcionesTitular}
              value={payerMembership}
              onChange={setPayerMembership}
              searchable
              nothingFoundMessage="Nadie con ese nombre"
            />
          ) : (
            <TextInput
              aria-label="Correo del titular"
              placeholder="correo@ejemplo.com"
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.currentTarget.value)}
            />
          )}
        </Input.Wrapper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <NumberInput
          label="Precio pactado (Q)"
          placeholder="El del plan"
          prefix="Q"
          value={fee}
          onChange={setFee}
          min={0}
          decimalScale={2}
        />
        <NumberInput label="Cupos pactados" placeholder="Los del plan" value={seats} onChange={setSeats} min={2} />
      </SimpleGrid>

      {/* En el alta, la factura a nombre de alguien solo aplica a la empresa; ya
          creado, cualquier grupo puede corregir sus datos de factura. */}
      {(grupo || kind === "corporate") && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput
            label={grupo ? "NIT para la factura" : "NIT de la empresa"}
            value={nit}
            onChange={(e) => setNit(e.currentTarget.value)}
          />
          <TextInput
            label={grupo ? "Nombre en la factura" : "Razón social"}
            value={razon}
            onChange={(e) => setRazon(e.currentTarget.value)}
          />
          <TextInput
            label="Correo para la factura"
            value={correoFactura}
            onChange={(e) => setCorreoFactura(e.currentTarget.value)}
          />
        </SimpleGrid>
      )}

      <Group justify="space-between" mt="sm">
        {grupo ? (
          <Button variant="subtle" color="red" onClick={onCerrar} loading={cerrar.isPending}>
            Cerrar grupo
          </Button>
        ) : (
          <span />
        )}
        <Group gap="xs">
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={enviar} loading={crear.isPending || editar.isPending} disabled={!listo}>
            {grupo ? "Guardar cambios" : "Crear grupo"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Ficha del grupo: quién está y lo que se hace con él
// ---------------------------------------------------------------------------

type Vista = "ficha" | "miembro" | "nino" | "editar";

function FichaGrupo({
  gymId,
  grupo,
  plans,
  memberships,
  onClosed,
}: {
  gymId: string;
  grupo: BillingGroup;
  plans: Plan[];
  memberships: Membership[];
  onClosed: () => void;
}) {
  const quitar = useRemoveBillingGroupMember(gymId);
  const [vista, setVista] = useState<Vista>("ficha");

  const activo = grupo.is_active ?? true;
  const lleno = grupo.seats != null && grupo.seats_used >= grupo.seats;
  const volver = () => setVista("ficha");

  const onQuitar = async (membershipId: string, quien: string) => {
    if (
      !window.confirm(
        `¿Sacar a ${quien} del grupo? Sigue siendo miembro del gimnasio con los días ya pagados, pero queda sin plan: asígnale uno individual antes de su próximo cobro.`,
      )
    )
      return;
    try {
      await quitar.mutateAsync({ id: grupo.id, membershipId });
      ok(`${quien} salió del grupo.`);
    } catch (error) {
      fail(error, "No se pudo sacar al miembro.");
    }
  };

  if (vista !== "ficha") {
    const titulo = { miembro: "Agregar miembro", nino: "Agregar niño", editar: "Editar grupo" }[vista];
    return (
      <Stack gap="sm">
        <Group gap={6} wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" onClick={volver} aria-label="Volver a la ficha">
            <ArrowLeft size={16} />
          </ActionIcon>
          <SectionLabel as="h3">{titulo}</SectionLabel>
        </Group>
        {vista === "miembro" && <AgregarMiembro gymId={gymId} grupo={grupo} memberships={memberships} onDone={volver} />}
        {vista === "nino" && <AgregarDependiente gymId={gymId} grupo={grupo} onDone={volver} />}
        {vista === "editar" && (
          <GrupoForm
            gymId={gymId}
            grupo={grupo}
            plans={plans}
            memberships={memberships}
            onCancel={volver}
            onDone={(g) => (g ? volver() : onClosed())}
          />
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Badge variant="light" color="grape">{KIND_LABEL[grupo.kind] ?? grupo.kind}</Badge>
        {!activo && <Badge variant="light" color="gray">Cerrado</Badge>}
        {activo && grupo.renewal_date && <StatusBadge kind="payment" status={grupo.payment_status} />}
        {activo && grupo.open_payment && <Badge variant="light" color="yellow">Cuota pendiente</Badge>}
      </Group>
      <Text size="sm">
        Paga <b>{grupo.payer_name}</b> desde su app: <Money value={grupo.effective_fee} decimals={2} /> por{" "}
        {grupo.plan_name}.{" "}
        {grupo.renewal_date ? `Pagado hasta el ${grupo.renewal_date}.` : "Todavía no ha pagado el primer ciclo."}
      </Text>

      <div>
        <Group justify="space-between" mb={8} wrap="wrap" gap="xs">
          <SectionLabel as="h3">
            Miembros {grupo.seats ? `(${grupo.seats_used} de ${grupo.seats})` : `(${grupo.seats_used})`}
          </SectionLabel>
          {activo && (
            <Group gap="xs" wrap="wrap">
              <Button size="xs" onClick={() => setVista("miembro")} disabled={lleno}>
                Agregar miembro
              </Button>
              {grupo.kind === "family" && (
                <Button size="xs" variant="light" onClick={() => setVista("nino")} disabled={lleno}>
                  Agregar niño
                </Button>
              )}
            </Group>
          )}
        </Group>
        {activo && lleno && (
          <Text size="xs" c="dimmed" mb={8}>
            Grupo lleno: sube los «Cupos pactados» en «Editar grupo».
          </Text>
        )}
        {grupo.members.length ? (
          <Stack gap={6}>
            {grupo.members.map((m) => (
              <Group key={m.membership_id} justify="space-between" wrap="wrap" gap="xs">
                <Group gap={6} wrap="wrap" style={{ minWidth: 0 }}>
                  <Text size="sm">{m.athlete_name}</Text>
                  {m.is_dependent && (
                    <Badge size="xs" variant="light" color="cyan">
                      Dependiente
                    </Badge>
                  )}
                  <StatusBadge kind="membership" status={m.status} size="xs" />
                </Group>
                {activo && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => onQuitar(m.membership_id, m.athlete_name)}
                    aria-label={`Quitar a ${m.athlete_name}`}
                  >
                    Quitar
                  </Button>
                )}
              </Group>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Todavía no hay nadie.
          </Text>
        )}
      </div>

      {activo && (
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setVista("editar")}>
            Editar grupo
          </Button>
        </Group>
      )}
    </Stack>
  );
}

function AgregarMiembro({
  gymId,
  grupo,
  memberships,
  onDone,
}: {
  gymId: string;
  grupo: BillingGroup;
  memberships: Membership[];
  onDone: () => void;
}) {
  const agregar = useAddBillingGroupMember(gymId);
  const [por, setPor] = useState<"miembro" | "correo">("miembro");
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");

  const enGrupo = new Set(grupo.members.map((m) => m.membership_id));
  const disponibles = memberships
    .filter((m) => !TERMINALES.has(m.status ?? "") && !m.billing_group && !enGrupo.has(m.id))
    .map((m) => ({ value: m.id, label: m.athlete_name ?? "—" }));

  const onAgregar = async () => {
    try {
      await agregar.mutateAsync({
        id: grupo.id,
        body:
          por === "miembro"
            ? { membership_id: membershipId! }
            : { email: correo.trim(), first_name: nombre.trim(), last_name: apellido.trim() },
      });
      ok(por === "miembro" ? "Miembro agregado." : "Invitación enviada y agregado al grupo.");
      onDone();
    } catch (error) {
      fail(error, "No se pudo agregar al miembro.");
    }
  };

  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        aria-label="Cómo agregarlo"
        value={por}
        onChange={(v) => setPor(v as "miembro" | "correo")}
        data={[
          { value: "miembro", label: "Ya es del gimnasio" },
          { value: "correo", label: "Invitar por correo" },
        ]}
      />
      {por === "miembro" ? (
        <Select
          aria-label="Atleta"
          placeholder="Busca al atleta"
          data={disponibles}
          value={membershipId}
          onChange={setMembershipId}
          searchable
          nothingFoundMessage="Nadie disponible con ese nombre"
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
          <TextInput label="Correo" value={correo} onChange={(e) => setCorreo(e.currentTarget.value)} />
          <TextInput label="Nombre" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} />
          <TextInput label="Apellido" value={apellido} onChange={(e) => setApellido(e.currentTarget.value)} />
        </SimpleGrid>
      )}
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          onClick={onAgregar}
          loading={agregar.isPending}
          disabled={por === "miembro" ? !membershipId : !correo.includes("@") || !nombre.trim() || !apellido.trim()}
        >
          Agregar al grupo
        </Button>
      </Group>
    </Stack>
  );
}

function AgregarDependiente({ gymId, grupo, onDone }: { gymId: string; grupo: BillingGroup; onDone: () => void }) {
  const dependiente = useAddBillingGroupDependent(gymId);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [nacimiento, setNacimiento] = useState<Date | null>(null);
  const [tutor, setTutor] = useState<string | null>(null);

  // Tutores posibles: el titular y los adultos del grupo (un dependiente no tutela).
  const tutores = [
    { value: grupo.payer, label: `${grupo.payer_name} (titular)` },
    ...grupo.members
      .filter((m) => !m.is_dependent && m.athlete !== grupo.payer)
      .map((m) => ({ value: m.athlete, label: m.athlete_name })),
  ];

  const onAlta = async () => {
    try {
      await dependiente.mutateAsync({
        id: grupo.id,
        body: {
          first_name: nombre.trim(),
          last_name: apellido.trim(),
          birth_date: iso(nacimiento),
          guardian_id: tutor ?? grupo.payer,
        },
      });
      ok(`${nombre.trim()} quedó dado de alta como dependiente.`);
      onDone();
    } catch (error) {
      fail(error, "No se pudo dar de alta al dependiente.");
    }
  };

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <TextInput label="Nombre" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} />
        <TextInput label="Apellido" value={apellido} onChange={(e) => setApellido(e.currentTarget.value)} />
        <DateInput
          label="Fecha de nacimiento"
          placeholder="Opcional"
          value={nacimiento}
          onChange={setNacimiento}
          valueFormat="YYYY-MM-DD"
          maxDate={new Date()}
          clearable
        />
        <Select label="Tutor" data={tutores} value={tutor ?? grupo.payer} onChange={setTutor} allowDeselect={false} />
      </SimpleGrid>
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={onAlta} loading={dependiente.isPending} disabled={!nombre.trim() || !apellido.trim()}>
          Dar de alta
        </Button>
      </Group>
    </Stack>
  );
}
