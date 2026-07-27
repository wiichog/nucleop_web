import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  FileInput,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { Download, Landmark, Paperclip } from "lucide-react";
import {
  useGymPayments,
  useGymStatement,
  useMemberships,
  useRegisterManualPayment,
} from "../api/hooks";
import type { Membership, Payment } from "../api/types";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { Money, PageHeader, SectionLabel, StatusBadge } from "../components/ui";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { errMsg } from "../lib/errors";
import { sortRecords } from "../lib/sortRecords";
import {
  FEL_STATUS,
  MEMBERSHIP_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TX_STATUS,
  label,
} from "../lib/labels";

/** Últimos 12 periodos ("YYYY-MM") para el selector del estado de cuenta. */
function periodosRecientes(): { value: string; label: string }[] {
  const hoy = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nombre = d.toLocaleDateString("es-GT", { month: "long", year: "numeric" });
    return { value, label: nombre.charAt(0).toUpperCase() + nombre.slice(1) };
  });
}

/** Cifra del estado de cuenta con su explicación (el gym tiene que poder auditarla). */
function Cifra({
  label: titulo,
  value,
  hint,
  c,
}: {
  label: string;
  value: string | number | null | undefined;
  hint: string;
  c?: string;
}) {
  return (
    <Tooltip label={hint} multiline w={260} withArrow position="top">
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: "0.08em" }}>
          {titulo}
        </Text>
        <Text fz={22} fw={700} c={c} style={{ fontVariantNumeric: "tabular-nums" }}>
          <Money value={value} decimals={2} fw={700} />
        </Text>
      </div>
    </Tooltip>
  );
}

/**
 * Estado de cuenta del gym con Nucleo: qué se cobró por la pasarela, cuánto fue
 * recargo de la plataforma y cuánto está pendiente de depósito o ya depositado.
 * Es la cifra que hoy el gimnasio no puede ver y que le genera desconfianza.
 */
function EstadoDeCuenta({ gymId }: { gymId: string }) {
  const periodos = useMemo(periodosRecientes, []);
  const [period, setPeriod] = useState(periodos[0].value);
  const statement = useGymStatement(gymId, period);
  const st = statement.data;
  const payout = st?.payout ?? null;

  return (
    <Card mb="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="sm">
        <div>
          <SectionLabel mb={2}>Cobranza · Nucleo</SectionLabel>
          <Title order={3}>Estado de cuenta</Title>
          <Text c="dimmed" size="sm">
            Solo el dinero que pasó por la pasarela (tarjeta). Los pagos manuales ya los cobraste
            vos y no entran aquí.
          </Text>
        </div>
        <Select
          aria-label="Periodo del estado de cuenta"
          value={period}
          onChange={(v) => v && setPeriod(v)}
          data={periodos}
          w={{ base: "100%", sm: 200 }}
          comboboxProps={{ withinPortal: true }}
        />
      </Group>

      {statement.isError ? (
        <PageError
          message={errMsg(statement.error, "No se pudo cargar el estado de cuenta.")}
          onRetry={() => statement.refetch()}
        />
      ) : statement.isLoading || !st ? (
        <PageLoading label="Calculando el periodo…" />
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, md: 5 }} spacing="lg">
            <Cifra
              label="Cobrado por tarjeta"
              value={st.gross_charged}
              hint="Total que se le cobró a tus atletas con tarjeta en el periodo: tu cuota + el recargo de Nucleo."
            />
            <Cifra
              label="Tu ingreso"
              value={st.gym_revenue}
              hint="La parte que es tuya (el precio de tus planes, servicios y productos). El recargo de Nucleo nunca sale de aquí."
            />
            <Cifra
              label="Recargo Nucleo"
              value={st.platform_surcharge}
              hint="Recargo de plataforma SUMADO encima de tu precio y pagado por el atleta. Nunca se deposita ni se te descuenta."
              c="dimmed"
            />
            <Cifra
              label="Reembolsos"
              value={st.refunds_total}
              hint="Devoluciones del periodo (registradas como movimientos negativos). Se restan de lo que se te deposita."
              c={Number(st.refunds_total) < 0 ? "red" : undefined}
            />
            <Cifra
              label={payout?.status === "executed" ? "Depositado" : "Pendiente de depósito"}
              value={st.net_to_deposit}
              hint="Neto que Nucleo te transfiere por el periodo: tu ingreso menos reembolsos."
              c={payout?.status === "executed" ? "teal" : "flame"}
            />
          </SimpleGrid>

          <Group gap="xs" mt="md" wrap="wrap">
            <Landmark size={16} />
            {payout?.status === "executed" ? (
              <Text size="sm">
                <Badge color="teal" variant="light" mr={6}>
                  Depositado
                </Badge>
                {payout.executed_at
                  ? `El ${new Date(payout.executed_at).toLocaleDateString("es-GT")}`
                  : "Ejecutado"}
                {payout.reference ? ` · Referencia: ${payout.reference}` : ""}
              </Text>
            ) : payout ? (
              <Text size="sm">
                <Badge color="yellow" variant="light" mr={6}>
                  Depósito generado
                </Badge>
                Nucleo ya calculó tu liquidación del periodo; la transferencia está en camino.
              </Text>
            ) : (
              <Text size="sm">
                <Badge color="gray" variant="light" mr={6}>
                  Sin depósito aún
                </Badge>
                El depósito se genera al cerrar el periodo.
              </Text>
            )}
            <Text size="sm" c="dimmed">
              · {st.payments_count} {st.payments_count === 1 ? "cobro" : "cobros"}
              {st.refunds_count > 0
                ? ` · ${st.refunds_count} ${st.refunds_count === 1 ? "reembolso" : "reembolsos"}`
                : ""}
            </Text>
          </Group>
        </>
      )}
    </Card>
  );
}

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
    try {
      await registerManual.mutateAsync({
        membership_id: membershipId,
        amount,
        method,
        proof_file: proofFile ?? undefined,
      });
      notifications.show({ color: "teal", message: "Pago registrado. La membresía queda al día." });
      setAmount("");
      setProofFile(null);
    } catch (error) {
      // Sin este catch la promesa quedaba rechazada sin dueño y el gym solo veía
      // un texto genérico: el backend manda el motivo real en `detail`.
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo registrar el pago. Verifica los datos."),
      });
    }
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
      <PageHeader kicker="Negocio · ERP" title="Membresías" subtitle="Registra pagos de membresía y revisa el historial." />

      <EstadoDeCuenta gymId={gymId} />

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
                textAlign: "right",
                render: (m) =>
                  m.effective_fee ? <Money value={m.effective_fee} decimals={2} block /> : "—",
              },
            ]}
          />
        </Card>
      )}
      {/* Sin el padrón el selector de membresía queda vacío y el gym no entiende
          por qué no puede registrar un pago: hay que decírselo. */}
      {memberships.isError && (
        <Card mb="lg">
          <PageError
            message="No se pudo cargar el padrón de atletas: el selector de membresía quedó vacío."
            onRetry={() => memberships.refetch()}
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
                {errMsg(registerManual.error, "No se pudo registrar el pago. Verifica los datos.")}
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
                {
                  accessor: "amount",
                  title: "Monto",
                  sortable: true,
                  textAlign: "right",
                  render: (p) => <Money value={p.amount} decimals={2} block />,
                },
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
                  render: (p) => <StatusBadge kind="paymentTx" status={p.status} size="sm" />,
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
