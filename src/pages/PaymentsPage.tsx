import { useMemo, useState, type ReactNode } from "react";
import {
  Anchor,
  Badge,
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { Download, FileText, Paperclip } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useGymChargebacks,
  useGymPayments,
  useGymStatement,
  useMemberships,
  useRegisterManualPayment,
  useRetryFel,
  useSubmitChargebackEvidence,
} from "../api/hooks";
import type { Chargeback, Membership, Payment } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { CountBadge, Money, PageHeader, StatusBadge } from "../components/ui";
import { Encabezado, nombreCorto, Tarjeta } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { sortRecords } from "../lib/sortRecords";
import {
  CHARGEBACK_STATUS,
  CHARGEBACK_STATUS_COLOR,
  FEL_STATUS,
  MEMBERSHIP_STATUS,
  PAYMENT_CONCEPT,
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
    const nombre = d.toLocaleDateString("es-GT", {
      month: "long",
      year: "numeric",
    });
    return { value, label: nombre.charAt(0).toUpperCase() + nombre.slice(1) };
  });
}

/**
 * Fecha corta en la zona del gimnasio; `—` si no vino. Una fecha sin hora
 * ("2026-10-01") se lee como día local: `new Date()` la toma como medianoche UTC
 * y en Guatemala salía el día anterior.
 */
function fecha(valor?: string | null): string {
  if (!valor) return "—";
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.exec(valor);
  const d = soloDia
    ? new Date(Number(valor.slice(0, 4)), Number(valor.slice(5, 7)) - 1, Number(valor.slice(8, 10)))
    : new Date(valor);
  return d.toLocaleDateString("es-GT");
}

/** Un renglón de un desglose de dinero: concepto a la izquierda, monto a la derecha. */
function Renglon({
  concepto,
  valor,
  tono,
  fuerte,
  pie,
}: {
  concepto: string;
  valor: string | number | null | undefined;
  tono?: string;
  fuerte?: boolean;
  pie?: string;
}) {
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={fuerte ? 700 : 400}>
          {concepto}
        </Text>
        {pie && (
          <Text size="xs" c="dimmed">
            {pie}
          </Text>
        )}
      </Table.Td>
      <Table.Td ta="right" style={{ whiteSpace: "nowrap" }}>
        <Money value={valor} decimals={2} c={tono} fw={fuerte ? 700 : 600} />
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * Estado de cuenta del gym con Nucleo: qué se cobró por la pasarela, cuánto fue
 * recargo de la plataforma y cuánto está pendiente de depósito o ya depositado.
 * Es un desglose de dinero, así que va como renglones que se leen de arriba abajo
 * y no como cifras gigantes; la explicación de cada renglón vive en el manual.
 *
 * Se exporta para poder probarla suelta.
 */
export function EstadoDeCuenta({ gymId }: { gymId: string }) {
  const periodos = useMemo(periodosRecientes, []);
  const [period, setPeriod] = useState(periodos[0].value);
  const statement = useGymStatement(gymId, period);
  const st = statement.data;
  const payout = st?.payout ?? null;
  const depositado = payout?.status === "executed";

  // `component="div"` no hace falta: el Badge va en el renglón de avisos del
  // Encabezado (un Group), nunca dentro del <p> de un Text.
  const insignia = !st ? null : depositado ? (
    <Badge color="teal" variant="light">
      Depositado
    </Badge>
  ) : payout ? (
    <Badge color="yellow" variant="light">
      Depósito generado
    </Badge>
  ) : (
    <Badge color="gray" variant="light">
      Sin depósito aún
    </Badge>
  );

  return (
    <GlassCard padding={18}>
      <Encabezado titulo="Estado de cuenta" avisos={insignia}>
        <Select
          aria-label="Periodo del estado de cuenta"
          value={period}
          onChange={(v) => v && setPeriod(v)}
          data={periodos}
          w={{ base: "100%", sm: 200 }}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
      </Encabezado>

      {statement.isError ? (
        <PageError
          message={errMsg(statement.error, "No se pudo cargar el estado de cuenta.")}
          onRetry={() => statement.refetch()}
        />
      ) : statement.isLoading || !st ? (
        <Text size="sm" c="dimmed">
          Calculando…
        </Text>
      ) : (
        <>
          {depositado && (payout?.executed_at || payout?.reference) && (
            <Text size="sm" c="dimmed" mb="xs">
              {payout?.executed_at ? `Depositado el ${fecha(payout.executed_at)}` : "Depositado"}
              {payout?.reference ? ` · Ref. ${payout.reference}` : ""}
            </Text>
          )}
          <Table maw={560} verticalSpacing={6}>
            <Table.Tbody>
              <Renglon concepto="Cobrado por tarjeta" valor={st.gross_charged} />
              <Renglon concepto="Recargo Nucleo" valor={st.platform_surcharge} tono="dimmed" />
              <Renglon concepto="Tu ingreso" valor={st.gym_revenue} />
              {/* El backend YA suma los contracargos dentro de `refunds_total`:
                  restarlos aparte sería contarlos dos veces. Por eso el renglón se
                  llama por lo que es y el pie dice cuánto de eso fue disputa. */}
              <Renglon
                concepto="Reembolsos y contracargos"
                valor={st.refunds_total}
                tono={Number(st.refunds_total) < 0 ? "var(--nucleo-danger)" : undefined}
                pie={
                  (st.chargebacks_count ?? 0) > 0
                    ? `Incluye ${st.chargebacks_count} ${
                        st.chargebacks_count === 1 ? "contracargo" : "contracargos"
                      } por ${fmtQ(st.chargebacks_total, { decimals: 2 })}`
                    : undefined
                }
              />
              <Renglon
                concepto={depositado ? "Depositado" : "Pendiente de depósito"}
                valor={st.net_to_deposit}
                tono={depositado ? "var(--mantine-color-teal-5)" : undefined}
                fuerte
              />
            </Table.Tbody>
          </Table>
          {/* `refunds_count` ya CONTIENE los contracargos: se anuncian como
              "de los cuales", no como una segunda cifra que haya que sumar. */}
          <Text size="xs" c="dimmed" mt="xs">
            {st.payments_count} {st.payments_count === 1 ? "cobro" : "cobros"}
            {st.refunds_count > 0
              ? ` · ${st.refunds_count} ${st.refunds_count === 1 ? "devolución" : "devoluciones"}`
              : ""}
            {(st.chargebacks_count ?? 0) > 0 ? ` (${st.chargebacks_count} por contracargo)` : ""}
          </Text>
        </>
      )}
    </GlassCard>
  );
}

/** Serie y número de la factura ("A-1234"); `""` si el certificador no los dio. */
function serieYNumero(payment: Payment): string {
  return [payment.fel_serie, payment.fel_number].filter(Boolean).join("-");
}

/**
 * La factura electrónica de un pago, con sus datos de conciliación (serie, número
 * y referencia de la SAT), el enlace al documento y, cuando la emisión falló o no
 * llegó, el botón para emitirla desde el panel. Vive en la ventana del pago.
 *
 * Se exporta para poder probarla suelta.
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
        <Text size="xs" c="red" lineClamp={3} title={payment.fel_message}>
          {payment.fel_message}
        </Text>
      )}
      {payment.can_retry_fel && (
        <Button
          size="compact-sm"
          variant="light"
          mt={4}
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

/**
 * La factura en la fila de la tabla: el folio, o en amarillo si falta emitirla.
 * Se exporta para poder probarla suelta (la tabla no pinta celdas bajo jsdom).
 */
export function FacturaCorta({ payment }: { payment: Payment }) {
  // Lo que falta hacer manda sobre el folio: una emitida sin documento también
  // se puede recuperar, y en la tabla tiene que verse en amarillo.
  if (payment.can_retry_fel)
    return (
      <Badge size="sm" variant="light" color={payment.fel_status === "failed" ? "red" : "yellow"}>
        {payment.fel_status === "issued" ? "Sin documento" : label(FEL_STATUS, payment.fel_status)}
      </Badge>
    );
  const folio = serieYNumero(payment);
  if (payment.fel_status === "issued" && folio)
    return (
      <Text size="sm" className="a-tabular">
        {folio}
      </Text>
    );
  return (
    <Text size="sm" c="dimmed">
      {label(FEL_STATUS, payment.fel_status)}
    </Text>
  );
}

/**
 * Estado de una fila del historial. Un contracargo y un reembolso llegan los dos
 * como un `Payment` negativo en `refunded`, así que sin esto el panel pintaba
 * "Reembolsado" —una decisión del gimnasio— sobre plata que en realidad le quitó
 * el banco del atleta. `is_chargeback` (lo manda el backend) es lo único que los
 * separa, y para el gym significan cosas opuestas: uno lo decidió él, el otro se
 * lo impusieron y todavía puede pelearlo.
 *
 * Se exporta para poder probarla suelta.
 */
export function EstadoDePago({ payment }: { payment: Payment }) {
  if (payment.is_chargeback)
    return (
      <Badge color="red" variant="filled" size="sm">
        Contracargo
      </Badge>
    );
  return <StatusBadge kind="paymentTx" status={payment.status} size="sm" />;
}

/**
 * Columnas del CSV del historial. La conciliación contable se hace con serie,
 * número y referencia de la SAT: exportar solo el estado obligaba a copiarlos a
 * mano de la pantalla.
 */
export const ENCABEZADOS_CSV_PAGOS = [
  "fecha",
  "concepto",
  "monto",
  "método",
  "estado",
  // Un contracargo y un reembolso salían idénticos en el CSV ("Reembolsado"), y
  // para la contabilidad del gym no son lo mismo: uno lo decidió él y el otro se
  // lo impuso el banco.
  "tipo",
  "factura",
  "serie",
  "número",
  "referencia",
];

/**
 * Una fila del CSV. El «estado» dice lo mismo que la tabla (`EstadoDePago`): un
 * contracargo llega como `refunded` y con la etiqueta cruda salía «Reembolsado».
 */
export function filaCsvDePago(payment: Payment): Array<string | number | null | undefined> {
  return [
    new Date(payment.created_at).toLocaleString("es-GT"),
    label(PAYMENT_CONCEPT, payment.concept),
    payment.amount,
    label(PAYMENT_METHOD, payment.method),
    payment.is_chargeback ? "Contracargo" : label(PAYMENT_TX_STATUS, payment.status),
    payment.is_chargeback ? "Contracargo" : payment.refund_of ? "Reembolso" : "Cobro",
    label(FEL_STATUS, payment.fel_status),
    payment.fel_serie,
    payment.fel_number,
    payment.fel_reference,
  ];
}

/** Un dato de la ventana de detalle: rótulo tenue arriba, valor abajo. */
function Dato({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Text size="xs" c="dimmed">
        {rotulo}
      </Text>
      <div style={{ fontSize: "var(--mantine-font-size-sm)" }}>{children}</div>
    </div>
  );
}

/** Un contracargo sigue vivo mientras el banco no lo resuelve. */
const sinResolver = (c: Chargeback) => c.status === "open" || c.status === "submitted";

/**
 * Bandeja de disputas de tarjeta del gimnasio: tocar una abre su detalle y, si la
 * ventana del banco sigue abierta, el formulario para responder con evidencia.
 * El envío al proveedor lo hace Nucleo (Pagalo todavía no expone una API de
 * disputas); aquí se registra qué se contestó y cuándo.
 */
export function ContracargosDelGym({ gymId }: { gymId: string }) {
  const casos = useGymChargebacks(gymId);
  const enviarEvidencia = useSubmitChargebackEvidence(gymId);
  const [abierto, setAbierto] = useState<Chargeback | null>(null);
  const [notas, setNotas] = useState("");
  const [enlace, setEnlace] = useState("");

  const filas = casos.data ?? [];

  const abrir = (caso: Chargeback) => {
    setAbierto(caso);
    setNotas(caso.evidence_notes ?? "");
    setEnlace(caso.evidence_url ?? "");
  };

  const enviar = async () => {
    if (!abierto) return;
    try {
      await enviarEvidencia.mutateAsync({
        chargebackId: abierto.id,
        notes: notas.trim(),
        evidence_url: enlace.trim(),
      });
      setAbierto(null);
      notifications.show({
        color: "teal",
        message: "Evidencia registrada. Nucleo la presenta ante el proveedor de la pasarela.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(
          error,
          "No se pudo registrar la evidencia. Puede que la ventana para responder ya venciera.",
        ),
      });
    }
  };

  if (casos.isError) {
    // Un 403 no es una falla: la bandeja es del `gym_admin` y un coach entra a
    // esta misma pantalla. Cualquier otro error SÍ hay que decirlo, porque puede
    // haber una disputa con reloj corriendo que nadie está mirando.
    if (estadoHttp(casos.error) === 403) return null;
    return (
      <PageError
        message="No se pudieron cargar los contracargos: si un atleta disputó un cobro, no lo estás viendo."
        onRetry={() => casos.refetch()}
      />
    );
  }
  if (!casos.isLoading && filas.length === 0) return null;

  const pendientes = filas.filter(sinResolver).length;

  return (
    <GlassCard padding={18}>
      <Encabezado
        titulo="Contracargos"
        avisos={
          pendientes > 0 && (
            <Badge color="yellow" variant="light">
              {pendientes} sin resolver
            </Badge>
          )
        }
      />
      {casos.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando…
        </Text>
      ) : (
        <Stack gap={6}>
          {filas.map((c) => {
            const resuelto = c.status === "won" || c.status === "lost";
            return (
              <Tarjeta
                key={c.id}
                etiqueta={`Contracargo de ${c.athlete_name}, ${fmtQ(c.total_lost, { decimals: 2 })}`}
                onClick={() => abrir(c)}
                aviso={c.can_submit_evidence && !c.evidence_submitted_at}
                apagada={resuelto}
              >
                <Group gap="sm" wrap="nowrap" justify="space-between">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={600} truncate>
                      {nombreCorto(c.athlete_name) ?? "—"}
                      <Text span c="dimmed" fw={400}>
                        {" · "}
                        {label(PAYMENT_CONCEPT, c.concept)}
                      </Text>
                    </Text>
                    <Text
                      size="xs"
                      c={c.can_submit_evidence ? "var(--mantine-color-yellow-light-color)" : "dimmed"}
                    >
                      {resuelto
                        ? `Resuelto el ${fecha(c.resolved_at)}`
                        : c.can_submit_evidence
                          ? `Responder antes del ${fecha(c.evidence_due_at)}`
                          : c.evidence_submitted_at
                            ? `Evidencia enviada el ${fecha(c.evidence_submitted_at)}`
                            : "Ventana cerrada"}
                    </Text>
                  </div>
                  <Badge color={CHARGEBACK_STATUS_COLOR[c.status] ?? "gray"} variant="light" size="sm">
                    {label(CHARGEBACK_STATUS, c.status)}
                  </Badge>
                  <Money value={c.total_lost} decimals={2} c="var(--nucleo-danger)" />
                </Group>
              </Tarjeta>
            );
          })}
        </Stack>
      )}

      <Modal
        opened={!!abierto}
        onClose={() => setAbierto(null)}
        title={abierto ? `Contracargo · ${nombreCorto(abierto.athlete_name) ?? ""}` : "Contracargo"}
        centered
      >
        {abierto && (
          <Stack gap="md">
            <Group gap="lg" wrap="wrap" align="flex-start">
              <Dato rotulo="Recibido">{fecha(abierto.created_at)}</Dato>
              <Dato rotulo="Concepto">{label(PAYMENT_CONCEPT, abierto.concept)}</Dato>
              <Dato rotulo="Perdido">
                <Money value={abierto.total_lost} decimals={2} c="var(--nucleo-danger)" />
                <Text size="xs" c="dimmed">
                  Tu cuota {fmtQ(abierto.amount, { decimals: 2 })} + recargo{" "}
                  {fmtQ(abierto.surcharge, { decimals: 2 })}
                </Text>
              </Dato>
              <Dato rotulo="Estado">
                <Badge color={CHARGEBACK_STATUS_COLOR[abierto.status] ?? "gray"} variant="light" size="sm">
                  {label(CHARGEBACK_STATUS, abierto.status)}
                </Badge>
              </Dato>
            </Group>
            <Dato rotulo="Motivo del banco">{abierto.reason || abierto.reason_code || "—"}</Dato>
            {abierto.status === "won" || abierto.status === "lost" ? (
              <Dato rotulo="Resuelto">{fecha(abierto.resolved_at)}</Dato>
            ) : (
              <Dato rotulo="Responder antes de">
                {fecha(abierto.evidence_due_at)}
                {!abierto.can_submit_evidence && " · ventana cerrada"}
              </Dato>
            )}
            {abierto.can_submit_evidence ? (
              <>
                <Textarea
                  label="Tu descargo"
                  placeholder="Asistió 12 veces en el periodo cobrado; el plan lo contrató el 3 de junio…"
                  value={notas}
                  onChange={(e) => setNotas(e.currentTarget.value)}
                  autosize
                  minRows={4}
                />
                <TextInput
                  label="Enlace a la evidencia (opcional)"
                  placeholder="https://…"
                  value={enlace}
                  onChange={(e) => setEnlace(e.currentTarget.value)}
                />
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setAbierto(null)}>
                    Cancelar
                  </Button>
                  <Button
                    loading={enviarEvidencia.isPending}
                    disabled={!notas.trim() && !enlace.trim()}
                    onClick={enviar}
                  >
                    {abierto.evidence_submitted_at ? "Ampliar evidencia" : "Enviar evidencia"}
                  </Button>
                </Group>
              </>
            ) : abierto.evidence_submitted_at ? (
              <Dato rotulo="Evidencia enviada">
                {fecha(abierto.evidence_submitted_at)}
                {abierto.evidence_notes && (
                  <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: "pre-wrap" }}>
                    {abierto.evidence_notes}
                  </Text>
                )}
              </Dato>
            ) : null}
          </Stack>
        )}
      </Modal>
    </GlassCard>
  );
}

function estadoHttp(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/** Lo que se le pasa a la ventana de pago manual: vacía, o con un moroso ya elegido. */
type Borrador = { membershipId: string | null; amount: number | "" };

/**
 * Ventana «Registrar pago»: efectivo o transferencia. No genera comisión, pero
 * activa la membresía (eso lo dice el manual, no la ventana).
 *
 * Se exporta para poder probarla suelta.
 */
export function RegistrarPagoModal({
  gymId,
  borrador,
  memberships,
  onClose,
}: {
  gymId: string;
  borrador: Borrador | null;
  memberships: Membership[];
  onClose: () => void;
}) {
  const registerManual = useRegisterManualPayment(gymId);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cargadoDe, setCargadoDe] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Al abrir (o abrir con otro moroso) se carga el borrador: el atleta y su cuota.
  if (borrador && cargadoDe !== borrador) {
    setCargadoDe(borrador);
    setMembershipId(borrador.membershipId);
    setAmount(borrador.amount);
    setMethod("cash");
    setProofFile(null);
    setError(null);
  }

  const montoValido = amount !== "" && Number(amount) > 0;

  const registrar = async () => {
    if (!membershipId || !montoValido) return;
    setError(null);
    try {
      await registerManual.mutateAsync({
        membership_id: membershipId,
        amount: String(amount),
        method,
        proof_file: method === "bank_transfer" ? (proofFile ?? undefined) : undefined,
      });
      notifications.show({
        color: "teal",
        message: "Pago registrado. La membresía queda al día.",
      });
      onClose();
    } catch (e) {
      // El backend manda el motivo real en `detail`.
      const motivo = errMsg(e, "No se pudo registrar el pago. Verifica los datos.");
      setError(motivo);
      notifications.show({ color: "red", message: motivo });
    }
  };

  return (
    <Modal opened={!!borrador} onClose={onClose} title="Registrar pago" centered>
      <Stack gap="sm">
        <Select
          label="Atleta"
          placeholder="Busca por nombre…"
          value={membershipId}
          onChange={setMembershipId}
          searchable
          data-autofocus={!borrador?.membershipId || undefined}
          nothingFoundMessage="Nadie con ese nombre"
          comboboxProps={{ withinPortal: true }}
          data={memberships.map((m) => ({
            value: m.id,
            label: `${m.athlete_name} (${label(MEMBERSHIP_STATUS, m.status)})`,
          }))}
        />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Método
          </Text>
          <SegmentedControl
            fullWidth
            value={method}
            onChange={(v) => setMethod(v as "cash" | "bank_transfer")}
            data={[
              { value: "cash", label: "Efectivo" },
              { value: "bank_transfer", label: "Transferencia" },
            ]}
          />
        </div>
        {method === "bank_transfer" && (
          <FileInput
            label="Comprobante"
            placeholder="Adjuntar comprobante"
            leftSection={<Paperclip size={16} />}
            accept="image/*,.pdf"
            value={proofFile}
            onChange={setProofFile}
            clearable
          />
        )}
        <NumberInput
          label="Monto"
          prefix="Q"
          min={0}
          decimalScale={2}
          thousandSeparator=","
          value={amount}
          onChange={(v) => setAmount(typeof v === "number" ? v : "")}
          data-autofocus={borrador?.membershipId ? true : undefined}
        />
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!membershipId || !montoValido}
            loading={registerManual.isPending}
            onClick={registrar}
          >
            Registrar pago
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Quién debe: las membresías con la cuota vencida (las marca el job
 * `actualizar_estado_pago`), la más atrasada primero. Tocar una abre «Registrar
 * pago» con el atleta y su cuota ya puestos.
 *
 * Se exporta para poder probarla suelta.
 */
export function PorCobrar({ gymId }: { gymId: string }) {
  const memberships = useMemberships(gymId);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [buscar, setBuscar] = useState("");

  const todas = memberships.data ?? [];
  const morosos = todas
    .filter((m) => m.payment_status === "overdue")
    .sort((a, b) => (a.renewal_date ?? "").localeCompare(b.renewal_date ?? ""));
  const q = buscar.trim().toLowerCase();
  const visibles = morosos.filter(
    (m) =>
      !q || (m.athlete_name ?? "").toLowerCase().includes(q) || (m.plan_name ?? "").toLowerCase().includes(q),
  );
  const deuda = morosos.reduce((acc, m) => acc + (Number(m.effective_fee) || 0), 0);

  return (
    <GlassCard padding={18}>
      <Encabezado
        titulo="Por cobrar"
        avisos={
          morosos.length > 0 && (
            <Badge color="yellow" variant="light">
              {morosos.length} {morosos.length === 1 ? "vencido" : "vencidos"} ·{" "}
              {fmtQ(deuda, { decimals: 2 })}
            </Badge>
          )
        }
      >
        {morosos.length > 8 && (
          <TextInput
            aria-label="Buscar moroso"
            placeholder="Buscar…"
            value={buscar}
            onChange={(e) => setBuscar(e.currentTarget.value)}
            w={{ base: "100%", sm: 200 }}
          />
        )}
        <Button onClick={() => setBorrador({ membershipId: null, amount: "" })}>Registrar pago</Button>
      </Encabezado>

      {/* Sin el padrón el selector de la ventana queda vacío y el gym no entiende
          por qué no puede registrar un pago: hay que decírselo. */}
      {memberships.isError ? (
        <PageError
          message="No se pudo cargar el padrón de atletas: no ves quién debe y el selector de atleta quedó vacío."
          onRetry={() => memberships.refetch()}
        />
      ) : memberships.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando…
        </Text>
      ) : morosos.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nadie debe. Todas las cuotas están al día.
        </Text>
      ) : visibles.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nadie coincide con «{buscar}».
        </Text>
      ) : (
        <Stack gap={6}>
          {visibles.map((m) => (
            <Tarjeta
              key={m.id}
              etiqueta={`Registrar pago de ${m.athlete_name}`}
              onClick={() =>
                setBorrador({
                  membershipId: m.id,
                  amount: Number(m.effective_fee) > 0 ? Number(m.effective_fee) : "",
                })
              }
              aviso
            >
              <Group gap="sm" wrap="nowrap" justify="space-between">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={600} truncate>
                    {m.athlete_name}
                    {m.plan_name ? (
                      <Text span c="dimmed" fw={400}>
                        {" · "}
                        {m.plan_name}
                      </Text>
                    ) : null}
                  </Text>
                  <Text size="xs" c="var(--mantine-color-yellow-light-color)">
                    Venció el {fecha(m.renewal_date)}
                  </Text>
                </div>
                {Number(m.effective_fee) > 0 ? <Money value={m.effective_fee} decimals={2} /> : null}
              </Group>
            </Tarjeta>
          ))}
        </Stack>
      )}

      <RegistrarPagoModal
        gymId={gymId}
        borrador={borrador}
        memberships={todas}
        onClose={() => setBorrador(null)}
      />
    </GlassCard>
  );
}

/**
 * Ventana de un pago: todo lo que trae el registro (lo que en la tabla no cabe)
 * y la factura con su botón de emitir o reintentar.
 */
function PagoModal({
  payment,
  onClose,
  onRetryFel,
  retrying,
}: {
  payment: Payment | null;
  onClose: () => void;
  onRetryFel: (p: Payment) => void;
  retrying: boolean;
}) {
  const p = payment;
  const comprobante = p ? p.proof_file || p.proof_url || "" : "";
  const recargo = p ? Number(p.surcharge ?? 0) : 0;
  return (
    <Modal
      opened={!!p}
      onClose={onClose}
      title={p ? `${label(PAYMENT_CONCEPT, p.concept)} · ${nombreCorto(p.athlete_name) ?? ""}` : "Pago"}
      centered
    >
      {p && (
        <Stack gap="md">
          <Group gap="lg" wrap="wrap" align="flex-start">
            <Dato rotulo="Fecha">{new Date(p.created_at).toLocaleString("es-GT")}</Dato>
            <Dato rotulo="Monto">
              <Money value={p.amount} decimals={2} c={p.is_chargeback ? "var(--nucleo-danger)" : undefined} />
            </Dato>
            {recargo !== 0 && (
              <Dato rotulo="Cobrado con recargo">
                <Money value={p.total_charged} decimals={2} />
                <Text size="xs" c="dimmed">
                  Recargo Nucleo {fmtQ(p.surcharge, { decimals: 2 })}
                </Text>
              </Dato>
            )}
            <Dato rotulo="Método">{label(PAYMENT_METHOD, p.method)}</Dato>
            <Dato rotulo="Estado">
              <EstadoDePago payment={p} />
            </Dato>
          </Group>

          {p.status === "failed" && p.failure_message && (
            <Dato rotulo="Motivo">
              <Text size="sm" c="red">
                {p.failure_message}
                {p.attempts_count && p.attempts_count > 1 ? ` (${p.attempts_count} intentos)` : ""}
              </Text>
            </Dato>
          )}
          {p.refund_of && !p.is_chargeback && (
            <Text size="sm" c="dimmed">
              Es un reembolso de un pago anterior.
            </Text>
          )}
          {(p.gateway_reference || comprobante) && (
            <Group gap="lg" wrap="wrap">
              {p.gateway_reference && <Dato rotulo="Referencia">{p.gateway_reference}</Dato>}
              {comprobante && (
                <Dato rotulo="Comprobante">
                  <Anchor href={comprobante} target="_blank" rel="noreferrer" size="sm">
                    Ver comprobante
                  </Anchor>
                </Dato>
              )}
            </Group>
          )}
          <Dato rotulo="Factura (FEL)">
            <CeldaFactura payment={p} onRetry={() => onRetryFel(p)} retrying={retrying} />
          </Dato>
        </Stack>
      )}
    </Modal>
  );
}

/** Lo que el buscador de la tabla compara: atleta, concepto, método y estado. */
export function coincidePago(p: Payment, q: string): boolean {
  if (!q) return true;
  return (
    (p.athlete_name ?? "").toLowerCase().includes(q) ||
    (p.concept ?? "").toLowerCase().includes(q) ||
    label(PAYMENT_CONCEPT, p.concept).toLowerCase().includes(q) ||
    label(PAYMENT_METHOD, p.method).toLowerCase().includes(q) ||
    // Buscar "contracargo" tiene que traer las disputas: el estado crudo de esas
    // filas es "refunded" y con él nunca aparecían.
    (p.is_chargeback ? "contracargo" : label(PAYMENT_TX_STATUS, p.status).toLowerCase()).includes(q)
  );
}

function HistorialDePagos({ gymId }: { gymId: string }) {
  const payments = useGymPayments(gymId);
  const retryFel = useRetryFel(gymId);
  const [search, setSearch] = useState("");
  const [soloFacturas, setSoloFacturas] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Payment>>({
    columnAccessor: "created_at",
    direction: "desc",
  });

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

  if (payments.isError) return <PageError onRetry={() => payments.refetch()} />;

  const todos = payments.data ?? [];
  const facturasPendientes = todos.filter((p) => p.can_retry_fel).length;
  const q = search.trim().toLowerCase();
  const filtrado = !!q || soloFacturas;
  const rows = sortRecords(
    todos.filter((p) => coincidePago(p, q) && (!soloFacturas || p.can_retry_fel)),
    sortStatus,
  );
  // El abierto se busca en los datos frescos: tras reintentar la factura la
  // ventana muestra el folio nuevo sin cerrarse.
  const abierto = abiertoId ? (todos.find((p) => p.id === abiertoId) ?? null) : null;

  return (
    <GlassCard padding={18}>
      <Encabezado
        titulo="Pagos"
        avisos={
          facturasPendientes > 0 && (
            <Button
              size="compact-sm"
              color="yellow"
              variant={soloFacturas ? "filled" : "light"}
              aria-pressed={soloFacturas}
              onClick={() => setSoloFacturas((v) => !v)}
            >
              {facturasPendientes} {facturasPendientes === 1 ? "factura por emitir" : "facturas por emitir"}
            </Button>
          )
        }
      >
        <TextInput
          aria-label="Buscar pagos"
          placeholder="Atleta, concepto, método o estado…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={{ base: "100%", sm: 260 }}
        />
        <Button
          variant="default"
          leftSection={<Download size={16} />}
          disabled={rows.length === 0}
          // Baja lo mismo que se ve en la tabla (filtros y orden incluidos).
          onClick={() => downloadCsv("pagos-nucleo.csv", ENCABEZADOS_CSV_PAGOS, rows.map(filaCsvDePago))}
        >
          {filtrado ? "Exportar CSV (filtrado)" : "Exportar CSV"}
        </Button>
      </Encabezado>

      <DataTable<Payment>
        minHeight={160}
        highlightOnHover
        verticalSpacing="xs"
        records={rows}
        fetching={payments.isLoading}
        idAccessor="id"
        noRecordsText={filtrado ? "Ningún pago coincide." : "Todavía no hay pagos."}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        onRowClick={({ record }) => setAbiertoId(record.id)}
        columns={[
          {
            accessor: "created_at",
            title: "Fecha",
            sortable: true,
            render: (p) => new Date(p.created_at).toLocaleDateString("es-GT"),
          },
          {
            accessor: "athlete_name",
            title: "Atleta",
            sortable: true,
            render: (p) => nombreCorto(p.athlete_name) ?? "—",
          },
          {
            accessor: "concept",
            title: "Concepto",
            sortable: true,
            render: (p) => label(PAYMENT_CONCEPT, p.concept),
          },
          {
            accessor: "amount",
            title: "Monto",
            sortable: true,
            textAlign: "right",
            render: (p) => (
              <Money
                value={p.amount}
                decimals={2}
                c={p.is_chargeback ? "var(--nucleo-danger)" : undefined}
                block
              />
            ),
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
            render: (p) => <EstadoDePago payment={p} />,
          },
          {
            accessor: "fel_status",
            title: "Factura",
            sortable: true,
            render: (p) => <FacturaCorta payment={p} />,
          },
        ]}
      />

      <PagoModal
        payment={abierto}
        onClose={() => setAbiertoId(null)}
        onRetryFel={onRetryFel}
        retrying={retryFel.isPending && retryFel.variables === abierto?.id}
      />
    </GlassCard>
  );
}

const PESTANAS = ["cobrar", "pagos", "cuenta", "contracargos"] as const;
type Pestana = (typeof PESTANAS)[number];

export function PaymentsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const memberships = useMemberships(gymId);
  // La misma consulta que la bandeja: aquí solo decide si la pestaña existe y su contador.
  const disputas = useGymChargebacks(gymId);

  const pedida = searchParams.get("tab") as Pestana | null;
  const tab: Pestana = pedida && PESTANAS.includes(pedida) ? pedida : "cobrar";
  const setTab = (t: string | null) =>
    setSearchParams(t && t !== "cobrar" ? { tab: t } : {}, { replace: true });

  if (!gymId) return <NoGymAssigned />;

  const vencidos = (memberships.data ?? []).filter((m) => m.payment_status === "overdue").length;
  const casos = disputas.data ?? [];
  const disputasSinResolver = casos.filter(sinResolver).length;
  // Un 403 (coach) no ve la pestaña; cualquier otro error SÍ: puede haber una
  // disputa con reloj corriendo que no se está viendo.
  const verContracargos = casos.length > 0 || (disputas.isError && estadoHttp(disputas.error) !== 403);

  return (
    <div>
      <PageHeader kicker="Negocio · ERP" title="Membresías" />
      <Tabs value={tab === "contracargos" && !verContracargos ? "cobrar" : tab} onChange={setTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="cobrar">
            <Group gap={6} wrap="nowrap">
              Por cobrar
              {vencidos > 0 && (
                <Badge size="sm" color="yellow" variant="light" circle={vencidos < 10}>
                  {vencidos > 99 ? "99+" : vencidos}
                </Badge>
              )}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="pagos">Pagos</Tabs.Tab>
          <Tabs.Tab value="cuenta">Estado de cuenta</Tabs.Tab>
          {verContracargos && (
            <Tabs.Tab value="contracargos">
              <Group gap={6} wrap="nowrap">
                Contracargos
                <CountBadge count={disputasSinResolver} />
              </Group>
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="cobrar">
          <PorCobrar gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="pagos">
          <HistorialDePagos gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="cuenta">
          <EstadoDeCuenta gymId={gymId} />
        </Tabs.Panel>
        {verContracargos && (
          <Tabs.Panel value="contracargos">
            <ContracargosDelGym gymId={gymId} />
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}
