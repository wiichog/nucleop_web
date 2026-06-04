import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  Table,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  useCreatePlatformGym,
  usePlatformGyms,
  useUpdatePlatformGym,
  useUpsertPlatformSubscription,
} from "../api/hooks";
import type { GymAdmin } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

export function PlatformGymsPage() {
  const { isSuperuser } = useAuth();
  const gyms = usePlatformGyms(isSuperuser);
  const createGym = useCreatePlatformGym();
  const updateGym = useUpdatePlatformGym();
  const upsertSubscription = useUpsertPlatformSubscription();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState("");
  const [saasPlan, setSaasPlan] = useState<string | null>("starter");
  const [commission, setCommission] = useState("0.0300");
  const [fixedFee, setFixedFee] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>("active");
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null);

  if (!isSuperuser) return <EmptyState title="Acceso restringido" description="Se requiere rol de superadmin." />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createGym.mutateAsync({ name, location_text: location });
    setName("");
    setLocation("");
  };

  const edit = (gym: GymAdmin) => {
    setEditingId(gym.id);
    setSaasPlan(gym.saas_plan ?? "starter");
    setCommission(gym.platform_commission_pct ?? "0.0300");
    setFixedFee(gym.fixed_fee ?? "");
    setIsPublic(gym.is_public ?? true);
    setMonthlyPrice(gym.subscription?.monthly_price ?? "");
    setSubscriptionStatus(gym.subscription?.status ?? "active");
    setNextBillingDate(gym.subscription?.next_billing_date ? new Date(gym.subscription.next_billing_date) : null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
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
          next_billing_date: nextBillingDate ? nextBillingDate.toLocaleDateString("en-CA") : null,
        },
      });
    }
    setEditingId("");
  };

  return (
    <div>
      <PageHeader title="Plataforma: gimnasios" subtitle="Alta y revisión de gimnasios conectados a Nucleo." />

      <Card mb="lg" component="form" onSubmit={submit}>
        <Title order={3} mb="sm">
          Nuevo gimnasio
        </Title>
        <Group align="flex-end" gap="md">
          <TextInput label="Nombre del gimnasio" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput label="Ubicación" value={location} onChange={(e) => setLocation(e.currentTarget.value)} style={{ flex: 1, minWidth: 200 }} />
          <Button type="submit" disabled={!name} loading={createGym.isPending}>
            Crear gym
          </Button>
        </Group>
      </Card>

      {editingId && (
        <Card mb="lg" component="form" onSubmit={save}>
          <Title order={3} mb="sm">
            Editar gimnasio
          </Title>
          <Group align="flex-end" gap="md">
            <Select
              label="SaaS plan"
              value={saasPlan}
              onChange={setSaasPlan}
              data={[
                { value: "starter", label: "Starter" },
                { value: "growth", label: "Growth" },
                { value: "pro", label: "Pro" },
                { value: "enterprise", label: "Enterprise" },
              ]}
            />
            <TextInput label="Comisión" placeholder="0.0300" value={commission} onChange={(e) => setCommission(e.currentTarget.value)} w={120} />
            <TextInput label="Fee fijo" value={fixedFee} onChange={(e) => setFixedFee(e.currentTarget.value)} w={110} />
            <TextInput label="Suscripción mensual" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.currentTarget.value)} w={150} />
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
            <DateInput label="Próximo cobro" value={nextBillingDate} onChange={setNextBillingDate} valueFormat="YYYY-MM-DD" clearable />
            <Checkbox label="Público" checked={isPublic} onChange={(e) => setIsPublic(e.currentTarget.checked)} mb={8} />
            <Button type="submit" disabled={!commission} loading={updateGym.isPending || upsertSubscription.isPending}>
              Guardar
            </Button>
          </Group>
        </Card>
      )}

      <Card>
        <Table.ScrollContainer minWidth={820}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Gimnasio</Table.Th>
                <Table.Th>Ubicación</Table.Th>
                <Table.Th>SaaS</Table.Th>
                <Table.Th>Suscripción</Table.Th>
                <Table.Th>Comisión</Table.Th>
                <Table.Th>Fee fijo</Table.Th>
                <Table.Th>Público</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(gyms.data ?? []).map((gym) => (
                <Table.Tr key={gym.id}>
                  <Table.Td>{gym.name}</Table.Td>
                  <Table.Td>{gym.location_text || "—"}</Table.Td>
                  <Table.Td>{gym.saas_plan}</Table.Td>
                  <Table.Td>
                    {gym.subscription
                      ? `Q${gym.subscription.monthly_price} (${gym.subscription.status})`
                      : "—"}
                  </Table.Td>
                  <Table.Td>{gym.platform_commission_pct}</Table.Td>
                  <Table.Td>{gym.fixed_fee ?? "—"}</Table.Td>
                  <Table.Td>{gym.is_public ? "sí" : "no"}</Table.Td>
                  <Table.Td>
                    <Button variant="subtle" size="xs" onClick={() => edit(gym)}>
                      Editar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </div>
  );
}
