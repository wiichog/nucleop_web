import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { LogIn } from "lucide-react";
import {
  usePlatformGyms,
  useUpdatePlatformGym,
  useUpsertPlatformSubscription,
} from "../api/hooks";
import { api } from "../api/client";
import { notifications } from "@mantine/notifications";
import type { GymAdmin } from "../api/types";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState } from "../components/EmptyState";
import { PageError } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard, MetricTile, Stagger, delayVar } from "../components/aurora";
import { PlatformBillingPanel } from "./PlatformBillingPanel";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

// ---------------------------------------------------------------------------
// Contrato del alta de gimnasios. Vive aquí (y no en `src/api/hooks.ts`) porque
// esta página es su único consumidor; la firma es la que se reportó al agente de
// contrato para moverlo a `src/api` sin tocar una línea de esta pantalla.
// ---------------------------------------------------------------------------

/** Cuerpo del alta COMPLETA: gym + suscripción SaaS + plan vendible + admin. */
interface AltaGimnasio {
  name: string;
  location_text?: string;
  address?: string;
  is_public?: boolean;
  saas_plan?: string;
  /** Cuota mensual que el gym le paga a Nucleo. */
  monthly_price?: string;
  /** Recargo de Nucleo en tarjeta (0.03 = 3%). Vacío = tasa por defecto. */
  commission_pct?: string | null;
  plan_name?: string;
  /** Precio del plan VENDIBLE que se crea para el gym. */
  plan_price?: string;
  admin_email?: string;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_phone?: string;
}

/** Respuesta del alta: el gym + qué se creó a su alrededor. */
type GymCreado = GymAdmin & {
  admin_email: string;
  admin_created: boolean;
  plan_id: string;
  subscription_id: string;
};

/** Administrador (`gym_admin`) del gimnasio, como lo lista la plataforma. */
interface GymStaffAdmin {
  id: string;
  user_id: string;
  email: string;
  phone: string | null;
  name: string;
  is_active: boolean;
  granted_at: string;
  /** `true` si ya puso su contraseña y puede entrar al panel. */
  claimed: boolean;
}

function useCrearGimnasioCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AltaGimnasio) =>
      (await api.post<GymCreado>("/platform/gyms", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-gyms"] }),
  });
}

/** Suspende o reactiva el gimnasio (`is_active` solo lo mueve plataforma). */
function useSetGymActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gymId, is_active }: { gymId: string; is_active: boolean }) =>
      (await api.patch<GymAdmin>(`/gym/${gymId}`, { is_active })).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["platform-gyms"] });
      qc.invalidateQueries({ queryKey: ["gym-config", vars.gymId] });
    },
  });
}

function useGymAdmins(gymId: string) {
  return useQuery({
    queryKey: ["gym-admins", gymId],
    queryFn: async () => (await api.get<GymStaffAdmin[]>(`/gym/${gymId}/admins`)).data,
    enabled: !!gymId,
  });
}

/** Invita (o reactiva) a un `gym_admin`. Idempotente: nunca duplica la identidad. */
function useInviteGymAdmin(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    }) => (await api.post<GymStaffAdmin>(`/gym/${gymId}/admins`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-admins", gymId] }),
  });
}

const SAAS_PLANS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const ALTA_VACIA = {
  name: "",
  location_text: "",
  address: "",
  is_public: true,
  saas_plan: "starter" as string | null,
  monthly_price: "299.00",
  commission_pct: "0.0300",
  plan_name: "Membresía mensual",
  plan_price: "650.00",
  admin_email: "",
  admin_first_name: "",
  admin_last_name: "",
  admin_phone: "",
};

export function PlatformGymsPage() {
  const navigate = useNavigate();
  const { isSuperuser, primaryGymId, setPrimaryGymId } = useAuth();
  const gyms = usePlatformGyms(isSuperuser);
  const crearGym = useCrearGimnasioCompleto();
  const updateGym = useUpdatePlatformGym();
  const setActivo = useSetGymActivo();
  const upsertSubscription = useUpsertPlatformSubscription();

  const [alta, setAlta] = useState(ALTA_VACIA);
  const [resumen, setResumen] = useState<GymCreado | null>(null);
  const [editingId, setEditingId] = useState("");
  const [saasPlan, setSaasPlan] = useState<string | null>("starter");
  const [commission, setCommission] = useState("0.0300");
  const [fixedFee, setFixedFee] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>("active");
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null);
  const [adminsDe, setAdminsDe] = useState<GymAdmin | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<GymAdmin>>({
    columnAccessor: "name",
    direction: "asc",
  });

  if (!isSuperuser)
    return <EmptyState title="Acceso restringido" description="Se requiere rol de superadmin." />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const creado = await crearGym.mutateAsync({
        name: alta.name.trim(),
        location_text: alta.location_text,
        address: alta.address,
        is_public: alta.is_public,
        saas_plan: alta.saas_plan ?? "starter",
        monthly_price: alta.monthly_price || undefined,
        commission_pct: alta.commission_pct || null,
        plan_name: alta.plan_name || undefined,
        plan_price: alta.plan_price || undefined,
        admin_email: alta.admin_email.trim(),
        admin_first_name: alta.admin_first_name,
        admin_last_name: alta.admin_last_name,
        admin_phone: alta.admin_phone,
      });
      setResumen(creado);
      setAlta(ALTA_VACIA);
      notifications.show({ color: "teal", message: `Gimnasio «${creado.name}» dado de alta.` });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el gimnasio.") });
    }
  };

  const edit = (gym: GymAdmin) => {
    setEditingId(gym.id);
    setSaasPlan(gym.saas_plan ?? "starter");
    setCommission(gym.platform_commission_pct ?? "0.0300");
    setFixedFee(gym.fixed_fee ?? "");
    setIsPublic(gym.is_public ?? true);
    setMonthlyPrice(gym.subscription?.monthly_price ?? "");
    setSubscriptionStatus(gym.subscription?.status ?? "active");
    setNextBillingDate(
      gym.subscription?.next_billing_date ? new Date(gym.subscription.next_billing_date) : null,
    );
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateGym.mutateAsync({
        gymId: editingId,
        body: {
          saas_plan: saasPlan ?? "starter",
          platform_commission_pct: commission,
          fixed_fee: fixedFee || null,
          is_public: isPublic,
        },
      });
      if (monthlyPrice) {
        await upsertSubscription.mutateAsync({
          gymId: editingId,
          body: {
            saas_plan: saasPlan ?? "starter",
            monthly_price: monthlyPrice,
            status: subscriptionStatus ?? "active",
            next_billing_date: nextBillingDate
              ? nextBillingDate.toLocaleDateString("en-CA")
              : null,
          },
        });
      }
      notifications.show({ color: "teal", message: "Gimnasio actualizado." });
      setEditingId("");
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo guardar el gimnasio.") });
    }
  };

  const cambiarEstado = async (gym: GymAdmin) => {
    const activo = gym.is_active !== false;
    const texto = activo
      ? `Suspender «${gym.name}». Sus atletas y su panel dejan de operar hasta que lo reactives. ¿Continuar?`
      : `Reactivar «${gym.name}»?`;
    if (!window.confirm(texto)) return;
    try {
      await setActivo.mutateAsync({ gymId: gym.id, is_active: !activo });
      notifications.show({
        color: "teal",
        message: activo ? "Gimnasio suspendido." : "Gimnasio reactivado.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo cambiar el estado del gimnasio."),
      });
    }
  };

  // Derivados solo para la retícula de KPIs: mismo criterio que las badges de la
  // tabla (`is_active === false` = suspendido, `is_public === false` = privado).
  const gymsList = (gyms.data ?? []) as GymAdmin[];
  const activos = gymsList.filter((g) => g.is_active !== false).length;
  const publicos = gymsList.filter((g) => g.is_public !== false).length;

  return (
    <div>
      <PageHeader
        kicker="Plataforma"
        title="La red, gimnasio por gimnasio"
        subtitle="Aquí se da de alta un gym, se ajusta su contrato con Nucleo y se revisa el estado de cuenta de la red."
      />

      <Tabs defaultValue="gimnasios" keepMounted={false}>
        <Tabs.List mb="lg" className="a-wipe-right" style={delayVar(0.56)}>
          <Tabs.Tab value="gimnasios">Gimnasios</Tabs.Tab>
          <Tabs.Tab value="cuenta">Estado de cuenta</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="gimnasios">
          {gyms.isError && <PageError onRetry={() => gyms.refetch()} />}

          {gymsList.length > 0 && (
            <Stagger
              from={0.6}
              style={{
                display: "grid",
                gap: "var(--mantine-spacing-md)",
                gridTemplateColumns: "repeat(auto-fit, minmax(calc(150 * var(--u)), 1fr))",
                marginBottom: "calc(20 * var(--u))",
              }}
            >
              <MetricTile label="Gimnasios en la red" value={gymsList.length} />
              <MetricTile label="Operando" value={activos} />
              <MetricTile
                label="Suspendidos"
                value={gymsList.length - activos}
                tone="var(--nucleo-danger)"
              />
              <MetricTile
                label="En el directorio"
                value={publicos}
                hint="Visibles para los atletas"
              />
            </Stagger>
          )}

          <Card mb="lg" component="form" onSubmit={submit} className="a-slide-r" style={delayVar(0.72)}>
            <Title order={3} mb={4}>
              Nuevo gimnasio
            </Title>
            <Text c="dimmed" size="sm" mb="md">
              El alta crea todo de una vez: el gimnasio, su suscripción con Nucleo, un plan
              vendible y el acceso del dueño. Un gym sin esas cuatro piezas no puede cobrar ni
              entrar al panel.
            </Text>
            <Stack gap="md">
              <SectionLabel>Datos del gimnasio</SectionLabel>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                <TextInput
                  label="Nombre"
                  value={alta.name}
                  onChange={(e) => setAlta((a) => ({ ...a, name: e.currentTarget.value }))}
                />
                <TextInput
                  label="Ubicación"
                  placeholder="Zona 10, Ciudad de Guatemala"
                  value={alta.location_text}
                  onChange={(e) => setAlta((a) => ({ ...a, location_text: e.currentTarget.value }))}
                />
                <TextInput
                  label="Dirección"
                  value={alta.address}
                  onChange={(e) => setAlta((a) => ({ ...a, address: e.currentTarget.value }))}
                />
              </SimpleGrid>

              <SectionLabel mt="xs">Contrato con Nucleo</SectionLabel>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                <Select
                  label="Plan SaaS"
                  value={alta.saas_plan}
                  onChange={(v) => setAlta((a) => ({ ...a, saas_plan: v }))}
                  data={SAAS_PLANS}
                />
                <TextInput
                  label="Cuota mensual (Q)"
                  description="Lo que el gym le paga a Nucleo"
                  value={alta.monthly_price}
                  onChange={(e) => setAlta((a) => ({ ...a, monthly_price: e.currentTarget.value }))}
                />
                <TextInput
                  label="Recargo en tarjeta"
                  description="0.0300 = 3% sumado encima del precio"
                  value={alta.commission_pct}
                  onChange={(e) => setAlta((a) => ({ ...a, commission_pct: e.currentTarget.value }))}
                />
              </SimpleGrid>

              <SectionLabel mt="xs">Primer plan vendible</SectionLabel>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Nombre del plan"
                  value={alta.plan_name}
                  onChange={(e) => setAlta((a) => ({ ...a, plan_name: e.currentTarget.value }))}
                />
                <TextInput
                  label="Precio del plan (Q)"
                  description="Lo que el atleta paga al gym"
                  value={alta.plan_price}
                  onChange={(e) => setAlta((a) => ({ ...a, plan_price: e.currentTarget.value }))}
                />
              </SimpleGrid>

              <SectionLabel mt="xs">Administrador del gimnasio</SectionLabel>
              <Text c="dimmed" size="sm">
                Se le manda un correo para que ponga su contraseña. Si el correo ya es de un
                usuario de Nucleo, se le añade el rol a esa misma cuenta (nunca se duplica).
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <TextInput
                  label="Correo"
                  value={alta.admin_email}
                  onChange={(e) => setAlta((a) => ({ ...a, admin_email: e.currentTarget.value }))}
                />
                <TextInput
                  label="Nombre"
                  value={alta.admin_first_name}
                  onChange={(e) =>
                    setAlta((a) => ({ ...a, admin_first_name: e.currentTarget.value }))
                  }
                />
                <TextInput
                  label="Apellido"
                  value={alta.admin_last_name}
                  onChange={(e) =>
                    setAlta((a) => ({ ...a, admin_last_name: e.currentTarget.value }))
                  }
                />
                <TextInput
                  label="Teléfono"
                  value={alta.admin_phone}
                  onChange={(e) => setAlta((a) => ({ ...a, admin_phone: e.currentTarget.value }))}
                />
              </SimpleGrid>

              <Group justify="space-between" align="center">
                <Checkbox
                  label="Visible en el directorio público"
                  checked={alta.is_public}
                  onChange={(e) => setAlta((a) => ({ ...a, is_public: e.currentTarget.checked }))}
                />
                <Button type="submit" disabled={!alta.name.trim()} loading={crearGym.isPending}>
                  Dar de alta
                </Button>
              </Group>
            </Stack>
          </Card>

          {resumen && (
            <Alert
              color="teal"
              variant="light"
              mb="lg"
              className="a-rise"
              title={`«${resumen.name}» ya puede operar`}
              withCloseButton
              onClose={() => setResumen(null)}
            >
              <Text size="sm">
                Se creó la suscripción, el plan vendible y{" "}
                {resumen.admin_email
                  ? `el acceso de ${resumen.admin_email}${
                      resumen.admin_created ? " (cuenta nueva; recibió el correo de bienvenida)" : " (ya tenía cuenta en Nucleo)"
                    }`
                  : "ningún administrador todavía: invítalo desde «Administradores»"}
                .
              </Text>
            </Alert>
          )}

          {editingId && (
            <Card mb="lg" component="form" onSubmit={save} className="a-rise">
              <Title order={3} mb="sm">
                Editar contrato
              </Title>
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  <Select label="SaaS plan" value={saasPlan} onChange={setSaasPlan} data={SAAS_PLANS} />
                  <TextInput
                    label="Recargo en tarjeta"
                    placeholder="0.0300"
                    value={commission}
                    onChange={(e) => setCommission(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Fee fijo"
                    value={fixedFee}
                    onChange={(e) => setFixedFee(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Suscripción mensual"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.currentTarget.value)}
                  />
                  <Select
                    label="Estado suscripción"
                    value={subscriptionStatus}
                    onChange={setSubscriptionStatus}
                    data={[
                      { value: "active", label: "Activa" },
                      { value: "paused", label: "Pausada" },
                      { value: "cancelled", label: "Cancelada" },
                    ]}
                  />
                  <DateInput
                    label="Próximo cobro"
                    value={nextBillingDate}
                    onChange={setNextBillingDate}
                    valueFormat="YYYY-MM-DD"
                    clearable
                  />
                </SimpleGrid>
                <Group justify="space-between" align="center">
                  <Checkbox
                    label="Público"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.currentTarget.checked)}
                  />
                  <Group gap="sm">
                    <Button variant="default" onClick={() => setEditingId("")}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={!commission}
                      loading={updateGym.isPending || upsertSubscription.isPending}
                    >
                      Guardar
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </Card>
          )}

          <SectionLabel as="h2">Gimnasios conectados</SectionLabel>
          <GlassCard padding={10} delay={0.84}>
            <DataTable<GymAdmin>
              minHeight={160}
              highlightOnHover
              striped
              idAccessor="id"
              records={sortRecords(gymsList, sortStatus)}
              fetching={gyms.isLoading}
              noRecordsText="Aún no hay gimnasios conectados."
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
              rowStyle={(g) => (g.is_active === false ? { opacity: 0.55 } : undefined)}
              columns={[
                { accessor: "name", title: "Gimnasio", sortable: true },
                {
                  accessor: "location_text",
                  title: "Ubicación",
                  sortable: true,
                  render: (g) => g.location_text || "—",
                },
                { accessor: "saas_plan", title: "SaaS", sortable: true },
                {
                  accessor: "subscription",
                  title: "Suscripción",
                  render: (g) =>
                    g.subscription
                      ? `${fmtQ(g.subscription.monthly_price)} (${g.subscription.status})`
                      : "—",
                },
                {
                  accessor: "platform_commission_pct",
                  title: "Recargo",
                  sortable: true,
                  textAlign: "right",
                  render: (g) =>
                    g.platform_commission_pct
                      ? `${(Number(g.platform_commission_pct) * 100).toFixed(2)}%`
                      : "—",
                },
                { accessor: "fixed_fee", title: "Fee fijo", render: (g) => g.fixed_fee ?? "—" },
                {
                  accessor: "is_active",
                  title: "Estado",
                  sortable: true,
                  render: (g) => (
                    <Group gap={4} wrap="nowrap">
                      <Badge color={g.is_active === false ? "red" : "teal"} variant="light">
                        {g.is_active === false ? "Suspendido" : "Activo"}
                      </Badge>
                      {g.is_public === false && (
                        <Badge color="gray" variant="light">
                          Privado
                        </Badge>
                      )}
                    </Group>
                  ),
                },
                {
                  accessor: "actions",
                  title: "",
                  render: (gym) => (
                    <RowActions
                      actions={[
                        { label: "Editar", variant: "subtle" as const, onClick: () => edit(gym) },
                        {
                          label: "Administradores",
                          variant: "subtle" as const,
                          onClick: () => setAdminsDe(gym),
                        },
                        {
                          label: gym.is_active === false ? "Reactivar" : "Suspender",
                          variant: "subtle" as const,
                          color: gym.is_active === false ? "teal" : "red",
                          loading: setActivo.isPending && setActivo.variables?.gymId === gym.id,
                          onClick: () => cambiarEstado(gym),
                        },
                        {
                          // Soporte: el superadmin entra al panel del cliente sin
                          // pedirle su contraseña (el backend ya lo autoriza).
                          label: gym.id === primaryGymId ? "Ir al panel" : "Entrar al panel",
                          icon: LogIn,
                          variant: "light" as const,
                          onClick: () => {
                            setPrimaryGymId(gym.id);
                            navigate("/panel");
                          },
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </GlassCard>
        </Tabs.Panel>

        <Tabs.Panel value="cuenta">
          <PlatformBillingPanel />
        </Tabs.Panel>
      </Tabs>

      <AdminsSheet gym={adminsDe} onClose={() => setAdminsDe(null)} />
    </div>
  );
}

/** Administradores del gimnasio: quién puede entrar a su panel, y alta de uno nuevo. */
function AdminsSheet({ gym, onClose }: { gym: GymAdmin | null; onClose: () => void }) {
  const gymId = gym?.id ?? "";
  const admins = useGymAdmins(gymId);
  const invitar = useInviteGymAdmin(gymId);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const onInvitar = async () => {
    try {
      await invitar.mutateAsync({
        email: email.trim(),
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      notifications.show({
        color: "teal",
        message: "Administrador dado de alta. Recibirá un correo para entrar.",
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo dar de alta al administrador."),
      });
    }
  };

  return (
    <DetailSheet
      opened={!!gym}
      onClose={onClose}
      title={gym ? `Administradores · ${gym.name}` : "Administradores"}
      size={520}
    >
        <Stack gap="md">
          <SectionLabel as="h2" mb={0}>Con acceso al panel</SectionLabel>
          <Text c="dimmed" size="sm">
            Quién puede entrar al panel de este gimnasio. «Sin reclamar» significa que todavía no
            ha puesto su contraseña.
          </Text>
          {admins.isError ? (
            <PageError onRetry={() => admins.refetch()} />
          ) : !(admins.data ?? []).length ? (
            <EmptyState
              title="Sin administradores"
              description="Este gimnasio no tiene a nadie que pueda entrar a su panel."
            />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Persona</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(admins.data ?? []).map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {a.name || a.email}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {a.email}
                        {a.phone ? ` · ${a.phone}` : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Badge color={a.is_active ? "teal" : "gray"} variant="light">
                          {a.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                        {!a.claimed && (
                          <Badge color="yellow" variant="light">
                            Sin reclamar
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <SectionLabel as="h2" mt="sm">Invitar administrador</SectionLabel>
          <Text c="dimmed" size="sm">
            Recibirá un correo para poner su contraseña. Si ese correo ya es de un usuario de
            Nucleo, se le suma el rol a esa misma cuenta (nunca se duplica la identidad).
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Correo"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <TextInput
              label="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
            />
            <TextInput
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
            />
            <TextInput
              label="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button onClick={onInvitar} disabled={!email.trim()} loading={invitar.isPending}>
              Invitar
            </Button>
          </Group>
        </Stack>
    </DetailSheet>
  );
}
