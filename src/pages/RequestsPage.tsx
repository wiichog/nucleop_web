import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Select,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useAssignPlan,
  useDecideJoinRequest,
  useInviteAthlete,
  useJoinRequests,
  usePlanOffers,
  usePlans,
} from "../api/hooks";
import { JoinRequest } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);

function RequestActions({ request, gymId }: { request: JoinRequest; gymId: string }) {
  const decide = useDecideJoinRequest(gymId);
  const assign = useAssignPlan(gymId);
  const plans = usePlans(gymId);
  const offers = usePlanOffers(gymId);
  const [planId, setPlanId] = useState<string | null>("");
  const [customFee, setCustomFee] = useState("");
  const [offerId, setOfferId] = useState<string | null>("");
  const [comment, setComment] = useState("");
  const status = request.status ?? "";
  const membershipId = request.membership;
  const canDecide = ["requested", "invited", "pending_approval"].includes(status);

  return (
    <Stack gap="xs">
      {canDecide && (
        <TextInput
          placeholder="Comentario para el atleta (opcional)"
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
          size="xs"
        />
      )}
      <Group gap="xs">
        {canDecide && (
          <>
            <Button size="xs" onClick={() => decide.mutate({ requestId: request.id, decision: "approve", comment })}>
              Aprobar
            </Button>
            {status !== "invited" && (
              <Button size="xs" variant="light" onClick={() => decide.mutate({ requestId: request.id, decision: "offer_trial", comment })}>
                Ofrecer prueba
              </Button>
            )}
            <Button size="xs" variant="default" onClick={() => decide.mutate({ requestId: request.id, decision: "request_info", comment })}>
              Pedir información
            </Button>
            <Button size="xs" color="red" variant="light" onClick={() => decide.mutate({ requestId: request.id, decision: "reject", comment })}>
              Rechazar
            </Button>
          </>
        )}
        {membershipId && ["approved_no_plan", "trial"].includes(status) && (
          <>
            <Select
              size="xs"
              placeholder="Selecciona plan"
              value={planId}
              onChange={setPlanId}
              data={(plans.data ?? []).map((plan) => ({ value: plan.id, label: plan.name }))}
            />
            <TextInput size="xs" placeholder="Cuota personalizada" value={customFee} onChange={(e) => setCustomFee(e.currentTarget.value)} w={140} />
            <Select
              size="xs"
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
            />
            <Button
              size="xs"
              disabled={!planId}
              loading={assign.isPending}
              onClick={() =>
                planId && assign.mutate({ membershipId, planId, customFee, offerId: offerId ?? undefined })
              }
            >
              Asignar plan
            </Button>
          </>
        )}
      </Group>
    </Stack>
  );
}

export function RequestsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const requests = useJoinRequests(gymId);
  const invite = useInviteAthlete(gymId);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", phone: "" });
  const [trialStart, setTrialStart] = useState<Date | null>(null);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<JoinRequest>>({
    columnAccessor: "athlete_name",
    direction: "asc",
  });

  if (!gymId) return <NoGymAssigned />;
  if (requests.isError) return <PageError onRetry={() => requests.refetch()} />;

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    await invite.mutateAsync({ ...form, trial_start: iso(trialStart), trial_end: iso(trialEnd) });
    setForm({ email: "", first_name: "", last_name: "", phone: "" });
    setTrialStart(null);
    setTrialEnd(null);
  };

  return (
    <div>
      <PageHeader title="Solicitudes e invitaciones" subtitle="Resuelve solicitudes e invita atletas al gym." />

      <Card mb="lg" component="form" onSubmit={onInvite}>
        <Title order={3} mb="sm">
          Invitar atleta
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput label="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} />
          <TextInput label="Nombre" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.currentTarget.value })} />
          <TextInput label="Apellido" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.currentTarget.value })} />
          <TextInput label="Teléfono (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} />
        </SimpleGrid>
        <Text c="dimmed" size="sm" mt="md" mb={4}>
          Periodo temporal (opcional): al aceptar la invitación, el atleta queda como <strong>temporal (prueba)</strong> entre estas fechas.
        </Text>
        <Group align="flex-end">
          <DateInput label="Desde" value={trialStart} onChange={setTrialStart} valueFormat="YYYY-MM-DD" clearable />
          <DateInput label="Hasta" value={trialEnd} onChange={setTrialEnd} valueFormat="YYYY-MM-DD" clearable />
        </Group>
        {invite.isError && (
          <Text c="red" size="sm" mt="sm">
            No se pudo enviar la invitación. Verifica el correo.
          </Text>
        )}
        <Button
          type="submit"
          mt="md"
          loading={invite.isPending}
          disabled={!form.email || !form.first_name || !form.last_name}
        >
          Enviar invitación
        </Button>
      </Card>

      <Card>
        <TextInput
          placeholder="Buscar atleta…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
          w={{ base: "100%", sm: 260 }}
        />
        <DataTable<JoinRequest>
          minHeight={160}
          highlightOnHover
          verticalSpacing="md"
          idAccessor="id"
          records={sortRecords(
            (requests.data ?? []).filter(
              (r) => !search.trim() || (r.athlete_name ?? "").toLowerCase().includes(search.trim().toLowerCase()),
            ),
            sortStatus,
          )}
          fetching={requests.isLoading}
          noRecordsText="Las nuevas solicitudes de unión aparecerán aquí."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "athlete_name", title: "Atleta", sortable: true },
            { accessor: "status", title: "Estado", sortable: true },
            { accessor: "goal", title: "Objetivo", render: (r) => r.goal || "—" },
            {
              accessor: "actions",
              title: "Acciones",
              render: (request) => <RequestActions request={request} gymId={gymId} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
