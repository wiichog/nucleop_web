import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useCreatePlan,
  useCreatePlanOffer,
  useDeletePlan,
  useDeletePlanOffer,
  usePlanOffers,
  usePlans,
  useServiceTypes,
  useTogglePlanOffer,
  useUpdatePlan,
} from "../api/hooks";
import type { Plan, PlanOffer } from "../api/types";
import { NoGymAssigned } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

const OFFER_LABEL: Record<string, string> = { percent: "Descuento %", free_months: "Meses gratis" };
const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);

export function PlansPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = usePlans(gymId);
  const serviceTypes = useServiceTypes(gymId);
  const serviceOptions = useMemo(
    () => (serviceTypes.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [serviceTypes.data],
  );
  const createPlan = useCreatePlan(gymId);
  const updatePlan = useUpdatePlan(gymId);
  const deletePlan = useDeletePlan(gymId);
  const offers = usePlanOffers(gymId);
  const createOffer = useCreatePlanOffer(gymId);
  const toggleOffer = useTogglePlanOffer(gymId);
  const deleteOffer = useDeletePlanOffer(gymId);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [sortOffers, setSortOffers] = useState<DataTableSortStatus<PlanOffer>>({
    columnAccessor: "name",
    direction: "asc",
  });
  const [sortPlans, setSortPlans] = useState<DataTableSortStatus<Plan>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const onDeletePlan = async (p: Plan) => {
    if (!window.confirm(`¿Eliminar el plan "${p.name}"? Las membresías con este plan quedarán sin plan.`)) return;
    try {
      await deletePlan.mutateAsync(p.id);
      notifications.show({ color: "teal", message: "Plan eliminado." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo eliminar el plan." });
    }
  };

  const onDeleteOffer = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la oferta "${name}"?`)) return;
    try {
      await deleteOffer.mutateAsync(id);
      notifications.show({ color: "teal", message: "Oferta eliminada." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo eliminar la oferta." });
    }
  };

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState<number | string>(30);
  const [classLimit, setClassLimit] = useState<number | string>("");
  const [specialAccess, setSpecialAccess] = useState(false);
  const [openGym, setOpenGym] = useState(false);
  const [noshowPoints, setNoshowPoints] = useState<number | string>(-10);
  const [planServices, setPlanServices] = useState<string[]>([]);

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
      service_types: planServices,
      noshow_penalty:
        Number.isFinite(points) && points !== 0
          ? { community_points: points, notify: true, message: "Penalización por no asistir a clase reservada." }
          : null,
    });
    setName("");
    setPrice("");
    setClassLimit("");
    setPlanServices([]);
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
        <MultiSelect
          mt="md"
          label="Servicios incluidos"
          description="Disciplinas del catálogo que esta suscripción incluye; el atleta lo ve en la app."
          placeholder={serviceOptions.length ? "Selecciona servicios" : "Crea servicios en Clases → Servicios"}
          data={serviceOptions}
          value={planServices}
          onChange={setPlanServices}
          searchable
          clearable
        />
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
        <DataTable<PlanOffer>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords((offers.data ?? []) as PlanOffer[], sortOffers)}
          fetching={offers.isLoading}
          noRecordsText="Crea promociones reutilizables para tus planes."
          sortStatus={sortOffers}
          onSortStatusChange={setSortOffers}
          columns={[
            { accessor: "name", title: "Oferta", sortable: true },
            {
              accessor: "offer_type",
              title: "Tipo",
              sortable: true,
              render: (o) => OFFER_LABEL[o.offer_type] ?? o.offer_type,
            },
            { accessor: "value", title: "Valor", render: (o) => (o.offer_type === "percent" ? `${o.value}%` : `${o.value} meses`) },
            { accessor: "plan_name", title: "Plan", sortable: true, render: (o) => o.plan_name ?? "Cualquiera" },
            { accessor: "valid_from", title: "Vigencia", render: (o) => `${o.valid_from || "—"} → ${o.valid_to || "—"}` },
            {
              accessor: "is_active",
              title: "Activa",
              sortable: true,
              render: (o) => (
                <Switch
                  checked={o.is_active}
                  onChange={() => toggleOffer.mutate({ offerId: o.id, is_active: !o.is_active })}
                  color="flame"
                />
              ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (o) => (
                <Button variant="light" color="red" size="xs" onClick={() => onDeleteOffer(o.id, o.name)}>
                  Eliminar
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card>
        <Title order={3} mb="sm">
          Planes
        </Title>
        <DataTable<Plan>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords((data ?? []) as Plan[], sortPlans)}
          fetching={isLoading}
          noRecordsText="Crea el primer plan para asignarlo a tus atletas."
          sortStatus={sortPlans}
          onSortStatusChange={setSortPlans}
          columns={[
            { accessor: "name", title: "Plan", sortable: true },
            { accessor: "price", title: "Precio", sortable: true, render: (p) => `Q${p.price}` },
            { accessor: "duration_days", title: "Duración (días)", sortable: true },
            {
              accessor: "service_type_names",
              title: "Servicios",
              render: (p) =>
                (p.service_type_names ?? []).length ? (
                  <Group gap={4}>
                    {(p.service_type_names ?? []).map((n) => (
                      <Badge key={n} variant="light" color="flame" size="sm">
                        {n}
                      </Badge>
                    ))}
                  </Group>
                ) : (
                  <Text c="dimmed" size="sm">—</Text>
                ),
            },
            { accessor: "auto_renew_default", title: "Renovación auto.", render: (p) => (p.auto_renew_default ? "Sí" : "No") },
            {
              accessor: "is_active",
              title: "Activo",
              sortable: true,
              render: (p) => (
                <Switch
                  checked={p.is_active}
                  onChange={() => updatePlan.mutate({ id: p.id, body: { is_active: !p.is_active } })}
                  color="flame"
                />
              ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (p) => (
                <Group gap="xs">
                  <Button variant="default" size="xs" onClick={() => setEditingPlan(p)}>
                    Editar
                  </Button>
                  <Button variant="light" color="red" size="xs" onClick={() => onDeletePlan(p)}>
                    Eliminar
                  </Button>
                </Group>
              ),
            },
          ]}
        />
      </Card>

      <EditPlanModal
        plan={editingPlan}
        serviceOptions={serviceOptions}
        saving={updatePlan.isPending}
        onClose={() => setEditingPlan(null)}
        onSave={async (body) => {
          if (!editingPlan) return;
          try {
            await updatePlan.mutateAsync({ id: editingPlan.id, body });
            notifications.show({ color: "teal", message: "Plan actualizado." });
            setEditingPlan(null);
          } catch {
            notifications.show({ color: "red", message: "No se pudo actualizar el plan." });
          }
        }}
      />
    </div>
  );
}

function EditPlanModal({
  plan,
  serviceOptions,
  saving,
  onClose,
  onSave,
}: {
  plan: Plan | null;
  serviceOptions: { value: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (body: {
    name: string;
    price: string;
    duration_days: number;
    class_limit: number | null;
    service_types: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState<number | string>(30);
  const [classLimit, setClassLimit] = useState<number | string>("");
  const [services, setServices] = useState<string[]>([]);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (plan && hydratedFor !== plan.id) {
    setHydratedFor(plan.id);
    setName(plan.name);
    setPrice(String(plan.price ?? ""));
    setDuration(plan.duration_days ?? 30);
    setClassLimit(plan.class_limit ?? "");
    setServices(plan.service_types ?? []);
  }

  return (
    <Modal opened={!!plan} onClose={onClose} title="Editar plan" centered>
      <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
      <TextInput label="Precio (Q)" value={price} onChange={(e) => setPrice(e.currentTarget.value)} mb="sm" />
      <NumberInput label="Duración (días)" value={duration} onChange={setDuration} min={1} mb="sm" />
      <NumberInput label="Límite de clases (vacío = sin límite)" value={classLimit} onChange={setClassLimit} min={0} mb="sm" />
      <MultiSelect
        label="Servicios incluidos"
        description="El atleta ve estos servicios como parte de su suscripción."
        placeholder={serviceOptions.length ? "Selecciona servicios" : "Crea servicios en Clases → Servicios"}
        data={serviceOptions}
        value={services}
        onChange={setServices}
        searchable
        clearable
        mb="md"
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!name || !price}
          loading={saving}
          onClick={() =>
            onSave({
              name,
              price,
              duration_days: Number(duration) || 30,
              class_limit: classLimit === "" ? null : Number(classLimit),
              service_types: services,
            })
          }
        >
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}
