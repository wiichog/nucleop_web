import { FormEvent, useMemo, useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  FileInput,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { Download, FileText, Landmark, Paperclip } from "lucide-react";
import {
  useGymPayments,
  useGymStatement,
  useMemberships,
  useRegisterManualPayment,
  useRetryFel,
} from "../api/hooks";
import type { Membership, Payment } from "../api/types";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { BigMetric, GlassCard, Stagger } from "../components/aurora";
import { Money, PageHeader, SectionLabel, StatusBadge } from "../components/ui";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
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

/**
 * Cifra del estado de cuenta con su explicación (el gym tiene que poder
 * auditarla). El tooltip va DENTRO del vidrio: `GlassCard` es un componente y no
 * reenvía la ref que `Tooltip` necesita para posicionarse.
 */
function Cifra({
  label: titulo,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number | null | undefined;
  hint: string;
  /** Color CSS de la cifra (tokens de marca, no nombres de color de Mantine). */
  tone?: string;
}) {
  return (
    <GlassCard padding={18}>
      <Tooltip label={hint} multiline w={260} withArrow position="top">
        <div>
          <span className="a-kicker" style={{ lineHeight: 1.35 }}>
            {titulo}
          </span>
          <div
            className="a-metric a-metric--sm a-tabular"
            style={{
              marginTop: "calc(10 * var(--u))",
              // Escala propia: un monto con miles y decimales no cabe en la del tile.
              fontSize: "clamp(18px, calc(25 * var(--u)), 29px)",
              color: tone,
            }}
          >
            {fmtQ(value, { decimals: 2 })}
          </div>
        </div>
      </Tooltip>
    </GlassCard>
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
    <div style={{ marginBottom: "calc(20 * var(--u))" }}>
      <GlassCard padding={16} delay={0.6}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div style={{ minWidth: 0 }}>
            <SectionLabel mb={4} as="h2">Cobranza · Nucleo</SectionLabel>
            <Text fw={600} fz="lg" style={{ letterSpacing: "-0.02em" }}>
              Estado de cuenta
            </Text>
            <Text c="dimmed" size="sm" mt={4}>
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
      </GlassCard>

      {statement.isError ? (
        <div style={{ marginTop: "calc(16 * var(--u))" }}>
          <PageError
            message={errMsg(statement.error, "No se pudo cargar el estado de cuenta.")}
            onRetry={() => statement.refetch()}
          />
        </div>
      ) : statement.isLoading || !st ? (
        <PageLoading label="Calculando el periodo…" />
      ) : (
        <>
          {/* La cifra que manda en esta pantalla: lo que de verdad se cobró. */}
          <GlassCard
            variant="core"
            sheen
            padding={26}
            delay={0.72}
            style={{ marginTop: "calc(16 * var(--u))" }}
          >
            <BigMetric
              label="Cobrado por tarjeta"
              value={fmtQ(st.gross_charged, { decimals: 2 })}
              fz="clamp(30px, calc(54 * var(--u)), 64px)"
              hint="Total que se le cobró a tus atletas con tarjeta en el periodo: tu cuota + el recargo de Nucleo."
              delay={1.04}
            />

            <Group
              gap="xs"
              mt="lg"
              wrap="wrap"
              className="a-rise"
              style={{ animationDelay: "1.16s" }}
            >
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
          </GlassCard>

          <Stagger from={0.84} style={{ marginTop: "calc(16 * var(--u))" }}>
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              <Cifra
                label="Tu ingreso"
                value={st.gym_revenue}
                hint="La parte que es tuya (el precio de tus planes, servicios y productos). El recargo de Nucleo nunca sale de aquí."
              />
              <Cifra
                label="Recargo Nucleo"
                value={st.platform_surcharge}
                hint="Recargo de plataforma SUMADO encima de tu precio y pagado por el atleta. Nunca se deposita ni se te descuenta."
                tone="var(--mantine-color-dimmed)"
              />
              <Cifra
                label="Reembolsos"
                value={st.refunds_total}
                hint="Devoluciones del periodo (registradas como movimientos negativos). Se restan de lo que se te deposita."
                tone={Number(st.refunds_total) < 0 ? "var(--nucleo-danger)" : undefined}
              />
              <Cifra
                label={payout?.status === "executed" ? "Depositado" : "Pendiente de depósito"}
                value={st.net_to_deposit}
                hint="Neto que Nucleo te transfiere por el periodo: tu ingreso menos reembolsos."
                tone={
                  payout?.status === "executed"
                    ? "var(--mantine-color-teal-5)"
                    : "var(--nucleo-accent)"
                }
              />
            </SimpleGrid>
          </Stagger>
        </>
      )}
    </div>
  );
}

/** Serie y número de la factura ("A-1234"); `""` si el certificador no los dio. */
function serieYNumero(payment: Payment): string {
  return [payment.fel_serie, payment.fel_number].filter(Boolean).join("-");
}

/**
 * Celda de la factura electrónica. Antes solo pintaba el ESTADO ("Emitida"), que
 * para contabilidad no sirve de nada: la serie, el número y la referencia de la
 * SAT son los datos con los que se concilia, y sin el enlace al documento el gym
 * no podía ni descargar la factura. Cuando la emisión falló, el botón reintenta
 * desde aquí (antes eso solo existía en el Django admin).
 *
 * Se exporta para poder probarla suelta: `mantine-datatable` no pinta celdas bajo
 * jsdom, así que dentro de la tabla no hay nada que testear.
 */
export function CeldaFactura({
  payment,
  onRetry,
  retrying,
}: {
  payment: Payment;
  onRetry: () => void;
  retrying: boolean;
}) {
  const emitida = payment.fel_status === "issued";
  const folio = serieYNumero(payment);
  const documento = payment.fel_document_url || "";
  return (
    <Stack gap={2} style={{ minWidth: 150 }}>
      {emitida && folio ? (
        documento ? (
          <Anchor href={documento} target="_blank" rel="noreferrer" size="sm" fw={600}>
            <Group gap={4} wrap="nowrap" component="span">
              <FileText size={13} />
              {folio}
            </Group>
          </Anchor>
        ) : (
          <Text size="sm" fw={600}>
            {folio}
          </Text>
        )
      ) : (
        <Text size="sm">{label(FEL_STATUS, payment.fel_status)}</Text>
      )}
      {payment.fel_reference && (
        <Text size="xs" c="dimmed" lineClamp={1} title={payment.fel_reference}>
          Ref. {payment.fel_reference}
        </Text>
      )}
      {payment.fel_status === "failed" && payment.fel_message && (
        <Text size="xs" c="red" lineClamp={2} title={payment.fel_message}>
          {payment.fel_message}
        </Text>
      )}
      {payment.can_retry_fel && (
        <Button
          size="compact-xs"
          variant="light"
          mt={2}
          loading={retrying}
          onClick={onRetry}
          style={{ alignSelf: "flex-start" }}
        >
          {/* Tres situaciones distintas bajo el mismo botón: una emitida
              "reintentable" es la que perdió el documento (no se vuelve a
              certificar, solo se recupera el enlace); una pendiente nunca llegó a
              la SAT (típico si el worker no corrió), así que se EMITE. */}
          {emitida
            ? "Recuperar documento"
            : payment.fel_status === "failed"
              ? "Reintentar factura"
              : "Emitir factura"}
        </Button>
      )}
    </Stack>
  );
}

export function PaymentsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const payments = useGymPayments(gymId);
  const memberships = useMemberships(gymId);
  const registerManual = useRegisterManualPayment(gymId);
  const retryFel = useRetryFel(gymId);

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

  /**
   * Reintenta la emisión y dice QUÉ pasó. Un 502 trae el motivo del certificador
   * en `detail`: mostrarlo es la diferencia entre "no se pudo" y saber si hay que
   * corregir el NIT del atleta o esperar a que la SAT vuelva.
   */
  const onRetryFel = async (payment: Payment) => {
    try {
      const actualizado = await retryFel.mutateAsync(payment.id);
      const folio = serieYNumero(actualizado);
      notifications.show({
        color: "teal",
        message:
          actualizado.fel_status === "issued"
            ? `Factura lista${folio ? `: ${folio}` : ""}.`
            : "Se reintentó la emisión de la factura.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo emitir la factura. Inténtalo de nuevo."),
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
      <PageHeader
        kicker="Negocio · ERP"
        title="Membresías"
        subtitle="Cuánto entró por la pasarela, quién quedó debiendo la cuota y el registro de los pagos en efectivo o transferencia."
      />

      <EstadoDeCuenta gymId={gymId} />

      {morosos.length > 0 && (
        <div style={{ marginBottom: "calc(20 * var(--u))" }}>
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="xs" mb={10}>
            <Group gap="xs" align="center">
              <SectionLabel mb={0} as="h2">Morosos</SectionLabel>
              <Badge color="red" variant="light">
                {morosos.length}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">
              Cuotas vencidas — da seguimiento o registra el pago.
            </Text>
          </Group>
          <GlassCard padding={10} delay={0.96}>
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
          </GlassCard>
        </div>
      )}
      {/* Sin el padrón el selector de membresía queda vacío y el gym no entiende
          por qué no puede registrar un pago: hay que decírselo. */}
      {memberships.isError && (
        <div style={{ marginBottom: "calc(20 * var(--u))" }}>
          <PageError
            message="No se pudo cargar el padrón de atletas: el selector de membresía quedó vacío."
            onRetry={() => memberships.refetch()}
          />
        </div>
      )}

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <GlassCard padding={20} delay={1.08}>
            <form onSubmit={onSubmit}>
              <SectionLabel mb={6} as="h2">Registrar pago manual</SectionLabel>
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
              <Button
                type="submit"
                fullWidth
                disabled={!membershipId || !amount}
                loading={registerManual.isPending}
              >
                Registrar pago
              </Button>
            </form>
          </GlassCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <GlassCard padding={16} delay={1.2}>
            <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="sm">
              <SectionLabel mb={0} as="h2">Historial de pagos</SectionLabel>
              <Button
                variant="default"
                size="xs"
                leftSection={<Download size={16} />}
                onClick={() =>
                  downloadCsv(
                    "pagos-nucleo.csv",
                    // La conciliación contable se hace con serie, número y
                    // referencia de la SAT: exportar solo el estado obligaba a
                    // copiarlos a mano de la pantalla.
                    [
                      "fecha",
                      "concepto",
                      "monto",
                      "método",
                      "estado",
                      "factura",
                      "serie",
                      "número",
                      "referencia",
                    ],
                    (payments.data ?? []).map((payment) => [
                      new Date(payment.created_at).toLocaleString("es-GT"),
                      payment.concept,
                      payment.amount,
                      label(PAYMENT_METHOD, payment.method),
                      label(PAYMENT_TX_STATUS, payment.status),
                      label(FEL_STATUS, payment.fel_status),
                      payment.fel_serie,
                      payment.fel_number,
                      payment.fel_reference,
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
                  render: (p) => (
                    <CeldaFactura
                      payment={p}
                      onRetry={() => onRetryFel(p)}
                      retrying={retryFel.isPending && retryFel.variables === p.id}
                    />
                  ),
                },
              ]}
            />
          </GlassCard>
        </Grid.Col>
      </Grid>
    </div>
  );
}
