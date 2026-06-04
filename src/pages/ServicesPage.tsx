import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { Trash2 } from "lucide-react";
import {
  useCreateService,
  useDeleteService,
  useGymServices,
  useUpdateService,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

export function ServicesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const services = useGymServices(gymId);
  const create = useCreateService(gymId);
  const update = useUpdateService(gymId);
  const remove = useDeleteService(gymId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState<"included" | "extra">("included");
  const [chargeType, setChargeType] = useState<"recurring" | "one_time">("recurring");
  const [price, setPrice] = useState<number | string>("");
  const [durationDays, setDurationDays] = useState<number | string>(30);
  const [classTypes, setClassTypes] = useState<string[]>([]);

  if (!gymId) return <NoGymAssigned />;
  if (services.isError) return <PageError onRetry={() => services.refetch()} />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name,
      description,
      access_type: accessType,
      charge_type: chargeType,
      price: accessType === "extra" ? String(price || 0) : "0",
      duration_days: Number(durationDays) || 30,
      class_types: classTypes,
    });
    setName("");
    setDescription("");
    setPrice("");
    setClassTypes([]);
  };

  return (
    <div>
      <PageHeader
        title="Servicios"
        subtitle="Pilates, CrossFit, personal trainer, sala de masajes… incluidos en la membresía o con pago extra."
      />

      <Card mb="lg" component="form" onSubmit={onSubmit}>
        <Title order={3} mb="sm">
          Nuevo servicio
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          <TextInput label="Nombre" placeholder="Pilates" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Select
            label="Acceso"
            value={accessType}
            onChange={(v) => setAccessType((v as "included" | "extra") ?? "included")}
            data={[
              { value: "included", label: "Incluido en la membresía" },
              { value: "extra", label: "Requiere pago extra" },
            ]}
          />
          {accessType === "extra" && (
            <Select
              label="Tipo de cobro"
              value={chargeType}
              onChange={(v) => setChargeType((v as "recurring" | "one_time") ?? "recurring")}
              data={[
                { value: "recurring", label: "Membresía recurrente" },
                { value: "one_time", label: "Pase único" },
              ]}
            />
          )}
          {accessType === "extra" && (
            <NumberInput label="Precio (Q)" value={price} onChange={setPrice} min={0} />
          )}
          <NumberInput label="Vigencia (días)" value={durationDays} onChange={setDurationDays} min={1} />
          <TagsInput
            label="Tipos de clase del servicio"
            placeholder="CrossFit, WOD…"
            value={classTypes}
            onChange={setClassTypes}
          />
        </SimpleGrid>
        <Textarea label="Descripción" mt="sm" value={description} onChange={(e) => setDescription(e.currentTarget.value)} autosize minRows={2} />
        <Button type="submit" mt="md" loading={create.isPending} disabled={!name}>
          Crear servicio
        </Button>
      </Card>

      <Card>
        <Title order={3} mb="sm">
          Servicios
        </Title>
        {services.isLoading ? (
          <PageLoading />
        ) : !(services.data ?? []).length ? (
          <EmptyState title="Sin servicios" description="Crea el primer servicio del gym." />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {(services.data ?? []).map((s) => (
              <Card key={s.id} withBorder>
                <Group justify="space-between" mb={4}>
                  <Text fw={600}>{s.name}</Text>
                  <Badge color={s.access_type === "included" ? "teal" : "flame"} variant="light">
                    {s.access_type === "included"
                      ? "Incluido"
                      : `Q${s.price} ${s.charge_type === "recurring" ? "/mes" : "pase"}`}
                  </Badge>
                </Group>
                {s.description ? (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {s.description}
                  </Text>
                ) : null}
                {s.class_types.length > 0 && (
                  <Group gap={4} mt="xs">
                    {s.class_types.map((ct) => (
                      <Badge key={ct} size="xs" variant="default">
                        {ct}
                      </Badge>
                    ))}
                  </Group>
                )}
                <Group justify="space-between" mt="md">
                  <Switch
                    checked={s.is_active}
                    onChange={() => update.mutate({ id: s.id, is_active: !s.is_active })}
                    label="Activo"
                    color="flame"
                  />
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    leftSection={<Trash2 size={14} />}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el servicio "${s.name}"?`)) remove.mutate(s.id);
                    }}
                  >
                    Eliminar
                  </Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Card>
    </div>
  );
}
