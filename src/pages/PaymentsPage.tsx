import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Card,
  FileInput,
  Grid,
  Group,
  Select,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { Download, Paperclip } from "lucide-react";
import { useGymPayments, useMemberships, useRegisterManualPayment } from "../api/hooks";
import type { Membership, Payment } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { sortRecords } from "../lib/sortRecords";
import {
  FEL_STATUS,
  MEMBERSHIP_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TX_STATUS,
  label,
} from "../lib/labels";

export function PaymentsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const payments = useGymPayments(gymId);
  const memberships = useMemberships(gymId);
  const registerManual = useRegisterManualPayment(gymId);

  const [membershipId, setMembershipId] = useState<string | null>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Payment>>({
    columnAccessor: "created_at",
    direction: "desc",
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!membershipId) return;
    await registerManual.mutateAsync({
      membership_id: membershipId,
      amount,
      method,
      proof_file: proofFile ?? undefined,
    });
    setAmount("");
    setProofFile(null);
  };

  if (!gymId) return <NoGymAssigned />;
  if (payments.isError) return <PageError onRetry={() => payments.refetch()} />;

  const q = search.trim().toLowerCase();
  const rows = sortRecords(
    (payments.data ?? []).filter(
      (p) =>
        !q ||
        (p.concept ?? "").toLowerCase().includes(q) ||
        label(PAYMENT_METHOD, p.method).toLowerCase().includes(q) ||
        label(PAYMENT_TX_STATUS, p.status).toLowerCase().includes(q),
    ),
    sortStatus,
  );

  // Morosos: membresías con la cuota vencida (las marca el job actualizar_estado_pago).
  const morosos = (memberships.data ?? []).filter((m) => m.payment_status === "overdue");

  return (
    <div>
      <PageHeader title="Membresías" subtitle="Registra pagos de membresía y revisa el historial." />
      {morosos.length > 0 && (
        <Card withBorder mb="lg">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <Title order={3}>Morosos</Title>
              <Badge color="red" variant="light">
                {morosos.length}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">
              Cuotas vencidas — da seguimiento o registra el pago.
            </Text>
          </Group>
          <DataTable<Membership>
            minHeight={80}
            highlightOnHover
            records={morosos}
            idAccessor="id"
            noRecordsText="Sin morosos."
            columns={[
              { accessor: "athlete_name", title: "Atleta" },
              { accessor: "plan_name", title: "Plan", render: (m) => m.plan_name ?? "—" },
              {
                accessor: "renewal_date",
                title: "Venció",
                render: (m) =>
                  m.renewal_date ? new Date(m.renewal_date).toLocaleDateString("es-GT") : "—",
              },
              {
                accessor: "effective_fee",
                title: "Cuota",
                render: (m) => (m.effective_fee ? `Q${m.effective_fee}` : "—"),
              },
            ]}
          />
        </Card>
      )}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card component="form" onSubmit={onSubmit}>
            <Title order={3} mb={4}>
              Registrar pago manual
            </Title>
            <Text c="dimmed" size="sm" mb="md">
              Efectivo o transferencia. No genera comisión, pero activa la membresía.
            </Text>
            <Select
              label="Membresía"
              placeholder="Selecciona…"
              value={membershipId}
              onChange={setMembershipId}
              searchable
              mb="sm"
              data={(memberships.data ?? []).map((m) => ({
                value: m.id,
                label: `${m.athlete_name} (${label(MEMBERSHIP_STATUS, m.status)})`,
              }))}
            />
            <Select
              label="Método"
              value={method}
              onChange={(v) => setMethod((v as "cash" | "bank_transfer") ?? "cash")}
              mb="sm"
              data={[
                { value: "cash", label: "Efectivo" },
                { value: "bank_transfer", label: "Transferencia" },
              ]}
            />
            {method === "bank_transfer" && (
              <FileInput
                label="Comprobante"
                placeholder="Adjuntar comprobante"
                leftSection={<Paperclip size={16} />}
                accept="image/*,.pdf"
                value={proofFile}
                onChange={setProofFile}
                clearable
                mb="sm"
              />
            )}
            <TextInput
              label="Monto (Q)"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
              mb="md"
            />
            {registerManual.isError && (
              <Text c="red" size="sm" mb="sm">
                No se pudo registrar el pago. Verifica los datos.
              </Text>
            )}
            <Button type="submit" fullWidth disabled={!membershipId || !amount} loading={registerManual.isPending}>
              Registrar pago
            </Button>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card>
            <Group justify="space-between" mb="sm">
              <Title order={3}>Historial</Title>
              <Button
                variant="default"
                size="xs"
                leftSection={<Download size={16} />}
                onClick={() =>
                  downloadCsv(
                    "pagos-nucleo.csv",
                    ["fecha", "concepto", "monto", "método", "estado", "factura"],
                    (payments.data ?? []).map((payment) => [
                      new Date(payment.created_at).toLocaleString("es-GT"),
                      payment.concept,
                      payment.amount,
                      label(PAYMENT_METHOD, payment.method),
                      label(PAYMENT_TX_STATUS, payment.status),
                      label(FEL_STATUS, payment.fel_status),
                    ]),
                  )
                }
              >
                Exportar CSV
              </Button>
            </Group>
            <TextInput
              placeholder="Buscar por concepto, método o estado…"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              mb="md"
              w={{ base: "100%", sm: 300 }}
            />
            <DataTable<Payment>
              minHeight={160}
              highlightOnHover
              striped
              records={rows}
              fetching={payments.isLoading}
              idAccessor="id"
              noRecordsText="Los pagos con tarjeta y manuales aparecerán aquí."
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
              columns={[
                {
                  accessor: "created_at",
                  title: "Fecha",
                  sortable: true,
                  render: (p) => new Date(p.created_at).toLocaleDateString("es-GT"),
                },
                { accessor: "concept", title: "Concepto", sortable: true },
                { accessor: "amount", title: "Monto", sortable: true, render: (p) => `Q${p.amount}` },
                {
                  accessor: "method",
                  title: "Método",
                  sortable: true,
                  render: (p) => label(PAYMENT_METHOD, p.method),
                },
                {
                  accessor: "status",
                  title: "Estado",
                  sortable: true,
                  render: (p) => label(PAYMENT_TX_STATUS, p.status),
                },
                {
                  accessor: "failure_message",
                  title: "Motivo",
                  render: (p) =>
                    p.status === "failed" && p.failure_message ? (
                      <Text size="xs" c="red" lineClamp={2} title={p.failure_message}>
                        {p.failure_message}
                        {p.attempts_count && p.attempts_count > 1
                          ? ` (${p.attempts_count} intentos)`
                          : ""}
                      </Text>
                    ) : (
                      ""
                    ),
                },
                {
                  accessor: "fel_status",
                  title: "Factura (FEL)",
                  sortable: true,
                  render: (p) => label(FEL_STATUS, p.fel_status),
                },
              ]}
            />
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}
