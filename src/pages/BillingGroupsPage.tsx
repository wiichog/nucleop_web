import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
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
import { Users } from "lucide-react";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
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
import type { BillingGroup, BillingGroupKind, Membership } from "../api/types";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Money, PageHeader, SectionLabel, StatusBadge } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { sortRecords } from "../lib/sortRecords";

const KIND_LABEL: Record<string, string> = { family: "Familiar", corporate: "Empresarial" };
const TERMINALES = new Set(["former_member", "rejected"]);
const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);
const vacioANull = (v: number | string) => (v === "" || v === null ? null : v);

/**
 * Plan familiar / empresarial: un titular paga UNA cuota por todo el grupo y cada
 * miembro conserva su propia membresía. Aquí el gym arma los grupos; el titular paga
 * desde su app (el panel no cobra con tarjeta).
 */
export function BillingGroupsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [verCerrados, setVerCerrados] = useState(false);
  const grupos = useBillingGroups(gymId, verCerrados);
  const plans = usePlans(gymId);
  const memberships = useMemberships(gymId);
  const [creando, setCreando] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [orden, setOrden] = useState<DataTableSortStatus<BillingGroup>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const planesGrupales = useMemo(
    () => (plans.data ?? []).filter((p) => p.group_kind && p.is_active),
    [plans.data],
  );
  // Se busca por id en la lista para que la ficha se refresque sola tras cada cambio.
  const abierto = (grupos.data ?? []).find((g) => g.id === abiertoId) ?? null;

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        kicker="Usuarios · Cobro"
        title="Planes grupales"
        subtitle="Familias y convenios con empresas: una sola persona paga el paquete y cada miembro entrena con su propia membresía."
        action={
          <Button onClick={() => setCreando(true)} disabled={!planesGrupales.length}>
            Crear grupo
          </Button>
        }
      />

      {grupos.isError && (
        <div style={{ marginBottom: "calc(16 * var(--u))" }}>
          <PageError
            message="No se pudieron cargar los planes grupales."
            onRetry={() => grupos.refetch()}
          />
        </div>
      )}

      {!plans.isLoading && !planesGrupales.length ? (
        <GlassCard padding={20}>
          <EmptyState
            icon={Users}
            title="Primero crea un plan familiar o empresarial"
            description="En Planes y cuotas, al crear un plan elige «Familiar» o «Empresarial» en «Tipo de plan» y define cuántas personas cubre. Después vuelve aquí a armar los grupos."
          />
        </GlassCard>
      ) : (
        <>
          <Group justify="flex-end" mb="sm">
            <Switch
              label="Ver grupos cerrados"
              checked={verCerrados}
              onChange={(e) => setVerCerrados(e.currentTarget.checked)}
              color="flame"
            />
          </Group>
          <GlassCard padding={10}>
            <DataTable<BillingGroup>
              minHeight={160}
              highlightOnHover
              striped
              idAccessor="id"
              records={sortRecords((grupos.data ?? []) as BillingGroup[], orden)}
              fetching={grupos.isLoading}
              noRecordsText="Todavía no hay grupos. Usa «Crear grupo»."
              sortStatus={orden}
              onSortStatusChange={setOrden}
              onRowClick={({ record }) => setAbiertoId(record.id)}
              columns={[
                {
                  accessor: "name",
                  title: "Grupo",
                  sortable: true,
                  render: (g) => (
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" fw={600}>{g.name}</Text>
                      <Badge variant="light" color="grape" size="sm">
                        {KIND_LABEL[g.kind] ?? g.kind}
                      </Badge>
                      {!g.is_active && (
                        <Badge variant="light" color="gray" size="sm">Cerrado</Badge>
                      )}
                    </Group>
                  ),
                },
                { accessor: "payer_name", title: "Titular (paga)", sortable: true },
                { accessor: "plan_name", title: "Plan", sortable: true },
                {
                  accessor: "effective_fee",
                  title: "Precio",
                  textAlign: "right",
                  render: (g) => <Money value={g.effective_fee} decimals={2} block />,
                },
                {
                  accessor: "seats_used",
                  title: "Cupos",
                  render: (g) => (g.seats ? `${g.seats_used} de ${g.seats}` : `${g.seats_used}`),
                },
                {
                  accessor: "renewal_date",
                  title: "Vence",
                  sortable: true,
                  render: (g) => g.renewal_date ?? <Text c="dimmed" size="sm">Sin pagar aún</Text>,
                },
                {
                  accessor: "payment_status",
                  title: "Pago",
                  // Un grupo cerrado ya no cobra: su estado de pago no dice nada.
                  render: (g) =>
                    !g.is_active ? (
                      <Text c="dimmed" size="sm">—</Text>
                    ) : (
                      <Group gap={4} wrap="nowrap">
                        {g.renewal_date && <StatusBadge kind="payment" status={g.payment_status} />}
                        {g.open_payment && (
                          <Badge variant="light" color="yellow" size="sm">Cuota pendiente</Badge>
                        )}
                      </Group>
                    ),
                },
              ]}
            />
          </GlassCard>
        </>
      )}

      <CreateGroupModal
        opened={creando}
        onClose={() => setCreando(false)}
        gymId={gymId}
        plans={planesGrupales}
        memberships={(memberships.data ?? []) as Membership[]}
        onCreated={(g) => {
          setCreando(false);
          setAbiertoId(g.id);
        }}
      />

      <DetailSheet
        opened={!!abierto}
        onClose={() => setAbiertoId(null)}
        title={abierto ? abierto.name : ""}
        size={560}
      >
        {abierto && (
          <GroupDetail
            key={abierto.id}
            gymId={gymId}
            grupo={abierto}
            memberships={(memberships.data ?? []) as Membership[]}
            onClosed={() => setAbiertoId(null)}
          />
        )}
      </DetailSheet>
    </div>
  );
}

function CreateGroupModal({
  opened,
  onClose,
  gymId,
  plans,
  memberships,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  gymId: string;
  plans: { id: string; name: string; group_kind?: string; price: string; max_members?: number | null }[];
  memberships: Membership[];
  onCreated: (g: BillingGroup) => void;
}) {
  const crear = useCreateBillingGroup(gymId);
  const [kind, setKind] = useState<BillingGroupKind>("family");
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [titularPor, setTitularPor] = useState<"miembro" | "correo">("miembro");
  const [payerMembership, setPayerMembership] = useState<string | null>(null);
  const [payerEmail, setPayerEmail] = useState("");
  const [fee, setFee] = useState<number | string>("");
  const [seats, setSeats] = useState<number | string>("");
  const [nit, setNit] = useState("");
  const [razon, setRazon] = useState("");
  const [correoFactura, setCorreoFactura] = useState("");

  const planesDelTipo = plans.filter((p) => p.group_kind === kind);
  const opcionesTitular = memberships
    .filter((m) => !TERMINALES.has(m.status ?? ""))
    .map((m) => ({ value: m.id, label: m.athlete_name ?? "—" }));

  const reiniciar = () => {
    setName("");
    setPlanId(null);
    setPayerMembership(null);
    setPayerEmail("");
    setFee("");
    setSeats("");
    setNit("");
    setRazon("");
    setCorreoFactura("");
  };

  const listo =
    !!name.trim() &&
    !!planId &&
    (titularPor === "miembro" ? !!payerMembership : payerEmail.includes("@"));

  const enviar = async () => {
    try {
      const g = await crear.mutateAsync({
        kind,
        name: name.trim(),
        plan_id: planId!,
        ...(titularPor === "miembro"
          ? { payer_membership_id: payerMembership! }
          : { payer_email: payerEmail.trim() }),
        custom_fee: vacioANull(fee) === null ? null : String(fee),
        max_members: vacioANull(seats) === null ? null : Number(seats),
        billing_nit: nit.trim(),
        billing_name: razon.trim(),
        billing_email: correoFactura.trim(),
      });
      notifications.show({ color: "teal", message: `Grupo «${g.name}» creado. Ahora agrega a sus miembros.` });
      reiniciar();
      onCreated(g);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el grupo.") });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Crear grupo" centered size="lg">
      <Stack gap="sm">
        <SegmentedControl
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
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Nombre del grupo"
            placeholder={kind === "family" ? "Familia Pérez" : "Banco Ejemplo"}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
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
        </SimpleGrid>

        <div>
          <Text size="sm" fw={500} mb={4}>Titular (quien paga desde su app)</Text>
          <SegmentedControl
            size="xs"
            mb="xs"
            value={titularPor}
            onChange={(v) => setTitularPor(v as "miembro" | "correo")}
            data={[
              { value: "miembro", label: "Ya es del gimnasio" },
              { value: "correo", label: "Por su correo" },
            ]}
          />
          {titularPor === "miembro" ? (
            <Select
              placeholder="Busca al atleta"
              data={opcionesTitular}
              value={payerMembership}
              onChange={setPayerMembership}
              searchable
              nothingFoundMessage="Nadie con ese nombre"
            />
          ) : (
            <TextInput
              placeholder="correo@ejemplo.com"
              description="Tiene que tener ya una cuenta en Nucleo (por ejemplo, el contacto de recursos humanos que paga y no entrena)."
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.currentTarget.value)}
            />
          )}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <NumberInput
            label="Precio pactado (Q, opcional)"
            description="Vacío = el precio del plan."
            value={fee}
            onChange={setFee}
            min={0}
            decimalScale={2}
          />
          <NumberInput
            label="Cupos pactados (opcional)"
            description="Vacío = los del plan."
            value={seats}
            onChange={setSeats}
            min={2}
          />
        </SimpleGrid>

        {kind === "corporate" && (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <TextInput label="NIT de la empresa" value={nit} onChange={(e) => setNit(e.currentTarget.value)} />
            <TextInput label="Razón social" value={razon} onChange={(e) => setRazon(e.currentTarget.value)} />
            <TextInput
              label="Correo para la factura"
              value={correoFactura}
              onChange={(e) => setCorreoFactura(e.currentTarget.value)}
            />
          </SimpleGrid>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} loading={crear.isPending} disabled={!listo}>
            Crear grupo
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function GroupDetail({
  gymId,
  grupo,
  memberships,
  onClosed,
}: {
  gymId: string;
  grupo: BillingGroup;
  memberships: Membership[];
  onClosed: () => void;
}) {
  const agregar = useAddBillingGroupMember(gymId);
  const quitar = useRemoveBillingGroupMember(gymId);
  const dependiente = useAddBillingGroupDependent(gymId);
  const editar = useUpdateBillingGroup(gymId);
  const cerrar = useCloseBillingGroup(gymId);

  const [agregarPor, setAgregarPor] = useState<"miembro" | "correo">("miembro");
  const [nuevoMiembro, setNuevoMiembro] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");

  const [depNombre, setDepNombre] = useState("");
  const [depApellido, setDepApellido] = useState("");
  const [depNacimiento, setDepNacimiento] = useState<Date | null>(null);
  const [depTutor, setDepTutor] = useState<string | null>(null);

  const [edNombre, setEdNombre] = useState(grupo.name);
  const [edFee, setEdFee] = useState<number | string>(grupo.custom_fee ?? "");
  const [edSeats, setEdSeats] = useState<number | string>(grupo.max_members ?? "");
  const [edNit, setEdNit] = useState(grupo.billing_nit ?? "");
  const [edRazon, setEdRazon] = useState(grupo.billing_name ?? "");
  const [edCorreo, setEdCorreo] = useState(grupo.billing_email ?? "");

  const lleno = grupo.seats != null && grupo.seats_used >= grupo.seats;
  const activo = grupo.is_active;
  const enGrupo = new Set(grupo.members.map((m) => m.membership_id));
  const disponibles = memberships
    .filter((m) => !TERMINALES.has(m.status ?? "") && !m.billing_group && !enGrupo.has(m.id))
    .map((m) => ({ value: m.id, label: m.athlete_name ?? "—" }));
  // Tutores posibles: el titular y los adultos del grupo (un dependiente no tutela).
  const tutores = [
    { value: grupo.payer, label: `${grupo.payer_name} (titular)` },
    ...grupo.members
      .filter((m) => !m.is_dependent && m.athlete !== grupo.payer)
      .map((m) => ({ value: m.athlete, label: m.athlete_name })),
  ];

  const aviso = (ok: string) => notifications.show({ color: "teal", message: ok });
  const fallo = (error: unknown, porDefecto: string) =>
    notifications.show({ color: "red", message: errMsg(error, porDefecto) });

  const onAgregar = async () => {
    try {
      await agregar.mutateAsync({
        id: grupo.id,
        body:
          agregarPor === "miembro"
            ? { membership_id: nuevoMiembro! }
            : { email: correo.trim(), first_name: nombre.trim(), last_name: apellido.trim() },
      });
      aviso(agregarPor === "miembro" ? "Miembro agregado." : "Invitación enviada y agregado al grupo.");
      setNuevoMiembro(null);
      setCorreo("");
      setNombre("");
      setApellido("");
    } catch (error) {
      fallo(error, "No se pudo agregar al miembro.");
    }
  };

  const onQuitar = async (membershipId: string, quien: string) => {
    if (
      !window.confirm(
        `¿Sacar a ${quien} del grupo? Sigue siendo miembro del gimnasio con los días ya pagados, pero queda sin plan: asígnale uno individual antes de su próximo cobro.`,
      )
    )
      return;
    try {
      await quitar.mutateAsync({ id: grupo.id, membershipId });
      aviso(`${quien} salió del grupo.`);
    } catch (error) {
      fallo(error, "No se pudo sacar al miembro.");
    }
  };

  const onDependiente = async () => {
    try {
      await dependiente.mutateAsync({
        id: grupo.id,
        body: {
          first_name: depNombre.trim(),
          last_name: depApellido.trim(),
          birth_date: iso(depNacimiento),
          guardian_id: depTutor ?? grupo.payer,
        },
      });
      aviso(`${depNombre.trim()} quedó dado de alta como dependiente.`);
      setDepNombre("");
      setDepApellido("");
      setDepNacimiento(null);
    } catch (error) {
      fallo(error, "No se pudo dar de alta al dependiente.");
    }
  };

  const onGuardar = async () => {
    try {
      await editar.mutateAsync({
        id: grupo.id,
        body: {
          name: edNombre.trim(),
          custom_fee: vacioANull(edFee) === null ? null : String(edFee),
          max_members: vacioANull(edSeats) === null ? null : Number(edSeats),
          billing_nit: edNit.trim(),
          billing_name: edRazon.trim(),
          billing_email: edCorreo.trim(),
        },
      });
      aviso("Cambios guardados.");
    } catch (error) {
      fallo(error, "No se pudieron guardar los cambios.");
    }
  };

  const onCerrar = async () => {
    if (
      !window.confirm(
        `¿Cerrar el grupo «${grupo.name}»? Todos sus miembros siguen en el gimnasio con los días ya pagados, pero el titular deja de pagar por ellos y cada uno necesitará un plan individual.`,
      )
    )
      return;
    try {
      await cerrar.mutateAsync(grupo.id);
      aviso("Grupo cerrado.");
      onClosed();
    } catch (error) {
      fallo(error, "No se pudo cerrar el grupo.");
    }
  };

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Badge variant="light" color="grape">{KIND_LABEL[grupo.kind] ?? grupo.kind}</Badge>
        {!activo && <Badge variant="light" color="gray">Cerrado</Badge>}
        {grupo.renewal_date && <StatusBadge kind="payment" status={grupo.payment_status} />}
        {grupo.open_payment && <Badge variant="light" color="yellow">Cuota pendiente</Badge>}
      </Group>
      <Text size="sm">
        Paga <b>{grupo.payer_name}</b> desde su app: <Money value={grupo.effective_fee} decimals={2} /> por{" "}
        {grupo.plan_name}.{" "}
        {grupo.renewal_date ? `Pagado hasta el ${grupo.renewal_date}.` : "Todavía no ha pagado el primer ciclo."}
      </Text>

      <div>
        <SectionLabel mb={8} as="h3">
          Miembros {grupo.seats ? `(${grupo.seats_used} de ${grupo.seats})` : `(${grupo.seats_used})`}
        </SectionLabel>
        {grupo.members.length ? (
          <Stack gap={6}>
            {grupo.members.map((m) => (
              <Group key={m.membership_id} justify="space-between" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">{m.athlete_name}</Text>
                  {m.is_dependent && <Badge size="xs" variant="light" color="cyan">Dependiente</Badge>}
                  <StatusBadge kind="membership" status={m.status} size="xs" />
                </Group>
                {activo && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => onQuitar(m.membership_id, m.athlete_name)}
                  >
                    Quitar
                  </Button>
                )}
              </Group>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">Todavía no hay nadie. Agrega al primero abajo.</Text>
        )}
      </div>

      {activo && (
        <>
          <GlassCard padding={14}>
            <SectionLabel mb={8} as="h3">Agregar miembro</SectionLabel>
            {lleno ? (
              <Text size="sm" c="dimmed">
                El grupo ya ocupó todos sus cupos. Sube los «Cupos pactados» abajo para agregar a alguien más.
              </Text>
            ) : (
              <Stack gap="xs">
                <SegmentedControl
                  size="xs"
                  value={agregarPor}
                  onChange={(v) => setAgregarPor(v as "miembro" | "correo")}
                  data={[
                    { value: "miembro", label: "Ya es del gimnasio" },
                    { value: "correo", label: "Invitar por correo" },
                  ]}
                />
                {agregarPor === "miembro" ? (
                  <Select
                    placeholder="Busca al atleta"
                    data={disponibles}
                    value={nuevoMiembro}
                    onChange={setNuevoMiembro}
                    searchable
                    nothingFoundMessage="Nadie disponible con ese nombre"
                  />
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                    <TextInput placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.currentTarget.value)} />
                    <TextInput placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} />
                    <TextInput placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.currentTarget.value)} />
                  </SimpleGrid>
                )}
                <Group justify="flex-end">
                  <Button
                    size="xs"
                    onClick={onAgregar}
                    loading={agregar.isPending}
                    disabled={
                      agregarPor === "miembro"
                        ? !nuevoMiembro
                        : !correo.includes("@") || !nombre.trim() || !apellido.trim()
                    }
                  >
                    Agregar al grupo
                  </Button>
                </Group>
              </Stack>
            )}
          </GlassCard>

          {grupo.kind === "family" && !lleno && (
            <GlassCard padding={14}>
              <SectionLabel mb={4} as="h3">Agregar dependiente</SectionLabel>
              <Text size="xs" c="dimmed" mb="xs">
                Para un menor sin correo propio. No entra al app: los adultos del grupo le reservan y le marcan la
                asistencia desde su teléfono, y sus avisos le llegan a su tutor.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <TextInput placeholder="Nombre" value={depNombre} onChange={(e) => setDepNombre(e.currentTarget.value)} />
                <TextInput placeholder="Apellido" value={depApellido} onChange={(e) => setDepApellido(e.currentTarget.value)} />
                <DateInput
                  placeholder="Fecha de nacimiento (opcional)"
                  value={depNacimiento}
                  onChange={setDepNacimiento}
                  valueFormat="YYYY-MM-DD"
                  maxDate={new Date()}
                  clearable
                />
                <Select
                  placeholder="Tutor"
                  data={tutores}
                  value={depTutor ?? grupo.payer}
                  onChange={setDepTutor}
                  allowDeselect={false}
                />
              </SimpleGrid>
              <Group justify="flex-end" mt="xs">
                <Button
                  size="xs"
                  onClick={onDependiente}
                  loading={dependiente.isPending}
                  disabled={!depNombre.trim() || !depApellido.trim()}
                >
                  Dar de alta
                </Button>
              </Group>
            </GlassCard>
          )}

          <GlassCard padding={14}>
            <SectionLabel mb={8} as="h3">Datos del grupo</SectionLabel>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <TextInput label="Nombre del grupo" value={edNombre} onChange={(e) => setEdNombre(e.currentTarget.value)} />
              <NumberInput
                label="Precio pactado (Q)"
                description="Vacío = el precio del plan."
                value={edFee}
                onChange={setEdFee}
                min={0}
                decimalScale={2}
              />
              <NumberInput
                label="Cupos pactados"
                description="Vacío = los del plan."
                value={edSeats}
                onChange={setEdSeats}
                min={2}
              />
              <TextInput label="NIT para la factura" value={edNit} onChange={(e) => setEdNit(e.currentTarget.value)} />
              <TextInput label="Nombre en la factura" value={edRazon} onChange={(e) => setEdRazon(e.currentTarget.value)} />
              <TextInput label="Correo para la factura" value={edCorreo} onChange={(e) => setEdCorreo(e.currentTarget.value)} />
            </SimpleGrid>
            <Group justify="space-between" mt="sm">
              <Button size="xs" variant="light" color="red" onClick={onCerrar} loading={cerrar.isPending}>
                Cerrar grupo
              </Button>
              <Button size="xs" onClick={onGuardar} loading={editar.isPending} disabled={!edNombre.trim()}>
                Guardar cambios
              </Button>
            </Group>
          </GlassCard>
        </>
      )}
    </Stack>
  );
}
