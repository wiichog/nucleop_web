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
import { notifications } from "@mantine/notifications";
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

// Extrae el mensaje real de la API (detail o error de campo) para no esconder la causa.
function inviteErrorMessage(err: unknown): string | null {
  const data = (err as { response?: { data?: unknown } } | undefined)?.response?.data;
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  // `detail` puede ser string (errores de negocio) u objeto de errores de campo.
  if (typeof obj.detail === "string") return obj.detail;
  const bag = (
    obj.detail && typeof obj.detail === "object" ? obj.detail : obj
  ) as Record<string, unknown>;
  for (const key of ["trial_start", "trial_end", "phone", "email"]) {
    const v = bag[key];
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    if (typeof v === "string") return v;
  }
  return null;
}

// Estados que siguen requiriendo gestión en la bandeja de Solicitudes. Al asignar un
// plan la membresía pasa a "active" y la solicitud desaparece de aquí (ya es miembro).
const ACTIONABLE_STATUSES = ["requested", "invited", "pending_approval", "approved_no_plan", "trial"];

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

  const ok = (m: string) => notifications.show({ color: "teal", message: m });
  const fail = (m: string) => notifications.show({ color: "red", message: m });

  const DECISION_MSG: Record<string, string> = {
    approve: "Solicitud aprobada. Asígnale un plan para activar la membresía.",
    offer_trial: "Prueba ofrecida al atleta.",
    request_info: "Se solicitó más información al atleta.",
    reject: "Solicitud rechazada.",
  };

  const onDecide = (decision: "approve" | "reject" | "offer_trial" | "request_info") =>
    decide.mutate(
      { requestId: request.id, decision, comment },
      {
        onSuccess: () => ok(DECISION_MSG[decision]),
        onError: () => fail("No se pudo completar la acción. Inténtalo de nuevo."),
      },
    );

  const onAssign = () =>
    planId &&
    membershipId &&
    assign.mutate(
      { membershipId, planId, customFee, offerId: offerId ?? undefined },
      {
        onSuccess: () => ok("Plan asignado: el atleta ya es miembro activo."),
        onError: () => fail("No se pudo asignar el plan. Inténtalo de nuevo."),
      },
    );

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
            <Button size="xs" loading={decide.isPending} onClick={() => onDecide("approve")}>
              Aprobar
            </Button>
            {status !== "invited" && (
              <Button size="xs" variant="light" onClick={() => onDecide("offer_trial")}>
                Ofrecer prueba
              </Button>
            )}
            <Button size="xs" variant="default" onClick={() => onDecide("request_info")}>
              Pedir información
            </Button>
            <Button size="xs" color="red" variant="light" onClick={() => onDecide("reject")}>
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
            <Button size="xs" disabled={!planId} loading={assign.isPending} onClick={onAssign}>
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
          {/* No se permiten fechas en el pasado (el backend lo revalida). */}
          <DateInput
            label="Desde"
            value={trialStart}
            onChange={setTrialStart}
            valueFormat="YYYY-MM-DD"
            minDate={new Date()}
            clearable
          />
          <DateInput
            label="Hasta"
            value={trialEnd}
            onChange={setTrialEnd}
            valueFormat="YYYY-MM-DD"
            minDate={trialStart ?? new Date()}
            clearable
          />
        </Group>
        {invite.isError && (
          <Text c="red" size="sm" mt="sm">
            {inviteErrorMessage(invite.error) ?? "No se pudo enviar la invitación. Verifica los datos."}
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
              (r) =>
                // Solo solicitudes accionables: las ya resueltas (activa, rechazada,
                // baja) salen de la bandeja y viven en "Atletas".
                ACTIONABLE_STATUSES.includes(r.status ?? "") &&
                (!search.trim() || (r.athlete_name ?? "").toLowerCase().includes(search.trim().toLowerCase())),
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
