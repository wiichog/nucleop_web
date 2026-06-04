import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  useCreatePlan,
  useCreatePlanOffer,
  usePlanOffers,
  usePlans,
  useTogglePlanOffer,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const OFFER_LABEL: Record<string, string> = { percent: "Descuento %", free_months: "Meses gratis" };
const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);

export function PlansPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = usePlans(gymId);
  const createPlan = useCreatePlan(gymId);
  const offers = usePlanOffers(gymId);
  const createOffer = useCreatePlanOffer(gymId);
  const toggleOffer = useTogglePlanOffer(gymId);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState<number | string>(30);
  const [classLimit, setClassLimit] = useState<number | string>("");
  const [specialAccess, setSpecialAccess] = useState(false);
  const [openGym, setOpenGym] = useState(false);
  const [noshowPoints, setNoshowPoints] = useState<number | string>(-10);

  const [offerName, setOfferName] = useState("");
  const [offerType, setOfferType] = useState<"percent" | "free_months">("percent");
  const [offerValue, setOfferValue] = useState("");
  const [offerPlan, setOfferPlan] = useState<string | null>("");
  const [offerFrom, setOfferFrom] = useState<Date | null>(null);
  const [offerTo, setOfferTo] = useState<Date | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const points = Number(noshowPoints);
    await createPlan.mutateAsync({
      name,
      price,
      duration_days: Number(durationDays) || 30,
      class_limit: classLimit ? Number(classLimit) : null,
      special_classes_access: specialAccess,
      open_gym_access: openGym,
      noshow_penalty:
        Number.isFinite(points) && points !== 0
          ? { community_points: points, notify: true, message: "Penalización por no asistir a clase reservada." }
          : null,
    });
    setName("");
    setPrice("");
    setClassLimit("");
  };

  const onCreateOffer = async (event: FormEvent) => {
    event.preventDefault();
    await createOffer.mutateAsync({
      name: offerName,
      offer_type: offerType,
      value: offerValue,
      plan: offerPlan || null,
      valid_from: iso(offerFrom),
      valid_to: iso(offerTo),
    });
    setOfferName("");
    setOfferValue("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader title="Planes y cuotas" subtitle="Crea planes, promociones y aplícalas al asignar." />

      <Card mb="lg" component="form" onSubmit={onSubmit}>
        <Title order={3} mb="sm">
          Crear plan
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput label="Nombre" placeholder="Mensual CrossFit" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput label="Precio (Q)" placeholder="350" value={price} onChange={(e) => setPrice(e.currentTarget.value)} />
          <NumberInput label="Duración (días)" value={durationDays} onChange={setDurationDays} min={1} />
          <NumberInput label="Límite de clases" placeholder="Sin límite" value={classLimit} onChange={setClassLimit} min={0} />
        </SimpleGrid>
        <Group mt="md" gap="lg" align="center">
          <Checkbox label="Acceso a clases especiales" checked={specialAccess} onChange={(e) => setSpecialAccess(e.currentTarget.checked)} />
          <Checkbox label="Open gym" checked={openGym} onChange={(e) => setOpenGym(e.currentTarget.checked)} />
          <NumberInput label="Penalización no-show (pts)" value={noshowPoints} onChange={setNoshowPoints} w={170} />
          <Button type="submit" mt={22} loading={createPlan.isPending} disabled={!name || !price}>
            Crear plan
          </Button>
        </Group>
      </Card>

      <Card mb="lg" component="form" onSubmit={onCreateOffer}>
        <Title order={3} mb={4}>
          Crear oferta / promoción
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Ej.: “2 meses gratis” (meses gratis = 2) o “30% de fecha a fecha”. Se aplican al asignar el plan.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          <TextInput label="Nombre de la oferta" placeholder="Promo verano" value={offerName} onChange={(e) => setOfferName(e.currentTarget.value)} />
          <Select
            label="Tipo"
            value={offerType}
            onChange={(v) => setOfferType((v as "percent" | "free_months") ?? "percent")}
            data={[
              { value: "percent", label: "Descuento %" },
              { value: "free_months", label: "Meses gratis" },
            ]}
          />
          <TextInput
            label={offerType === "percent" ? "Porcentaje (0-100)" : "Meses gratis"}
            placeholder={offerType === "percent" ? "30" : "2"}
            value={offerValue}
            onChange={(e) => setOfferValue(e.currentTarget.value)}
          />
          <Select
            label="Plan (opcional)"
            placeholder="Cualquier plan"
            value={offerPlan}
            onChange={setOfferPlan}
            clearable
            data={(data ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
          <DateInput label="Válida desde" value={offerFrom} onChange={setOfferFrom} valueFormat="YYYY-MM-DD" clearable />
          <DateInput label="Válida hasta" value={offerTo} onChange={setOfferTo} valueFormat="YYYY-MM-DD" clearable />
        </SimpleGrid>
        <Button type="submit" mt="md" loading={createOffer.isPending} disabled={!offerName || !offerValue}>
          Crear oferta
        </Button>
      </Card>

      <Card mb="lg">
        <Title order={3} mb="sm">
          Ofertas
        </Title>
        {offers.isLoading ? (
          <PageLoading />
        ) : !(offers.data ?? []).length ? (
          <EmptyState title="Sin ofertas" description="Crea promociones reutilizables para tus planes." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Oferta</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Valor</Table.Th>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Vigencia</Table.Th>
                <Table.Th>Activa</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(offers.data ?? []).map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>{o.name}</Table.Td>
                  <Table.Td>{OFFER_LABEL[o.offer_type] ?? o.offer_type}</Table.Td>
                  <Table.Td>{o.offer_type === "percent" ? `${o.value}%` : `${o.value} meses`}</Table.Td>
                  <Table.Td>{o.plan_name ?? "Cualquiera"}</Table.Td>
                  <Table.Td>
                    {o.valid_from || "—"} → {o.valid_to || "—"}
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={o.is_active}
                      onChange={() => toggleOffer.mutate({ offerId: o.id, is_active: !o.is_active })}
                      color="flame"
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Card>
        <Title order={3} mb="sm">
          Planes
        </Title>
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState title="Sin planes" description="Crea el primer plan para asignarlo a tus atletas." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Duración (días)</Table.Th>
                <Table.Th>Renovación auto.</Table.Th>
                <Table.Th>Activo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{p.name}</Table.Td>
                  <Table.Td>Q{p.price}</Table.Td>
                  <Table.Td>{p.duration_days}</Table.Td>
                  <Table.Td>{p.auto_renew_default ? "Sí" : "No"}</Table.Td>
                  <Table.Td>{p.is_active ? "Sí" : "No"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
