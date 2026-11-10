import { useState, type ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useCoachPayouts,
  useGeneratePayout,
  useGymCoaches,
  usePayPayout,
  useUpdateCoach,
} from "../api/hooks";
import type { Coach, CoachPayout } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Money, PageHeader } from "../components/ui";
import { Encabezado, nombreCorto, Tarjeta } from "../components/Tarjeta";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { fechaIso as iso, motivoPeriodoInvalido } from "../lib/periodo";
import { sortRecords } from "../lib/sortRecords";

const money = (v: string | number) => fmtQ(v, { decimals: 2 });

/**
 * Fila de la tabla «Liquidaciones». La liquidación solo trae el correo del
 * coach; el nombre sale de la lista de coaches del gym (`coach` es el mismo
 * `staff_role`). Si el coach ya no está en la lista, se queda el correo.
 */
type FilaLiquidacion = CoachPayout & { coach_name: string };

export function filasLiquidacion(
  payouts: CoachPayout[],
  coaches: { staff_role: string; name: string }[],
): FilaLiquidacion[] {
  const nombres = new Map(coaches.map((c) => [c.staff_role, c.name]));
  return payouts.map((p) => ({
    ...p,
    coach_name: nombres.get(p.coach) || p.coach_email,
  }));
}

/** "2026-10-01" → "1/10/2026", sin pasar por UTC (en Guatemala salía el día anterior). */
function dia(valor: string): string {
  const [a, m, d] = valor.split("-").map(Number);
  return a && m && d ? new Date(a, m - 1, d).toLocaleDateString("es-GT") : valor;
}
const periodo = (p: CoachPayout) => `${dia(p.period_start)} – ${dia(p.period_end)}`;

/** Lo que cobra el coach, en una línea: «Por clase · Q75.00» o «Fijo · Q3,000.00». */
function formaDePago(c: Coach): string {
  return c.pay_type === "fixed"
    ? `Fijo · ${money(c.fixed_amount)}`
    : `Por clase · ${money(c.per_class_rate)}`;
}

type CambiosCoach = Parameters<ReturnType<typeof useUpdateCoach>["mutate"]>[0]["body"];

/**
 * Lo que cambió en la ventana del coach, con el mismo formato que mandaban los
 * campos de la tabla vieja (montos como texto, comisión de 0 a 1). Solo viaja lo
 * que cambió: si alguien más editó otro campo, no se pisa.
 *
 * Se exporta para poder probarla suelta.
 */
export function cambiosDeCoach(
  c: Coach,
  v: {
    pay_type: "per_class" | "fixed";
    per_class_rate: number | "";
    fixed_amount: number | "";
    offers_pt: boolean;
    pt_price: number | "";
    pt_commission_pct: number | "";
  },
): CambiosCoach {
  const body: CambiosCoach = {};
  const n = (x: number | "") => (x === "" ? 0 : x);
  if (v.pay_type !== c.pay_type) body.pay_type = v.pay_type;
  if (n(v.per_class_rate) !== Number(c.per_class_rate)) body.per_class_rate = String(n(v.per_class_rate));
  if (n(v.fixed_amount) !== Number(c.fixed_amount)) body.fixed_amount = String(n(v.fixed_amount));
  if (v.offers_pt !== c.offers_pt) body.offers_pt = v.offers_pt;
  if (n(v.pt_price) !== Number(c.pt_price)) body.pt_price = String(n(v.pt_price));
  const pct = Math.min(Math.max(n(v.pt_commission_pct), 0), 100);
  if (pct !== Math.round(Number(c.pt_commission_pct) * 100)) body.pt_commission_pct = pct / 100;
  return body;
}

/**
 * Ventana del coach: cómo se le paga y su personal trainer. Se guarda con un
 * botón (antes cada campo se guardaba solo al salir de él). Si el guardado falla,
 * la ventana sigue abierta con lo escrito y la tarjeta conserva lo guardado: la
 * pantalla nunca muestra como vigente un número que el servidor rechazó.
 */
function CoachModal({ coach, gymId, onClose }: { coach: Coach | null; gymId: string; onClose: () => void }) {
  const updateCoach = useUpdateCoach(gymId);
  const [cargadoDe, setCargadoDe] = useState<Coach | null>(null);
  const [payType, setPayType] = useState<"per_class" | "fixed">("per_class");
  const [rate, setRate] = useState<number | "">(0);
  const [fixed, setFixed] = useState<number | "">(0);
  const [offersPt, setOffersPt] = useState(false);
  const [ptPrice, setPtPrice] = useState<number | "">(0);
  const [ptPct, setPtPct] = useState<number | "">(0);
  const [guardando, setGuardando] = useState(false);

  if (coach && cargadoDe?.staff_role !== coach.staff_role) {
    setCargadoDe(coach);
    setPayType(coach.pay_type);
    setRate(Number(coach.per_class_rate));
    setFixed(Number(coach.fixed_amount));
    setOffersPt(coach.offers_pt);
    setPtPrice(Number(coach.pt_price));
    setPtPct(Math.round(Number(coach.pt_commission_pct) * 100));
  }
  if (!coach && cargadoDe) setCargadoDe(null);

  const num = (v: string | number) => (typeof v === "number" ? v : "");
  const precio = ptPrice === "" ? 0 : ptPrice;
  const pct = Math.min(Math.max(ptPct === "" ? 0 : ptPct, 0), 100) / 100;

  const guardar = () => {
    if (!coach) return;
    const body = cambiosDeCoach(coach, {
      pay_type: payType,
      per_class_rate: rate,
      fixed_amount: fixed,
      offers_pt: offersPt,
      pt_price: ptPrice,
      pt_commission_pct: ptPct,
    });
    if (Object.keys(body).length === 0) return onClose();
    setGuardando(true);
    updateCoach.mutate(
      { staffId: coach.staff_role, body },
      {
        onSuccess: () => {
          notifications.show({
            color: "teal",
            message: `Pago de ${nombreCorto(coach.name) ?? coach.email} guardado.`,
          });
          onClose();
        },
        onError: (error) =>
          notifications.show({
            color: "red",
            title: "No se pudo guardar el cambio de nómina del coach",
            message: errMsg(error, "Intenta de nuevo."),
          }),
        onSettled: () => setGuardando(false),
      },
    );
  };

  return (
    <Modal opened={!!coach} onClose={onClose} title={coach ? coach.name || coach.email : "Coach"} centered>
      {coach && (
        <Stack gap="sm">
          <div>
            <Text size="sm" fw={500} mb={4}>
              Forma de pago
            </Text>
            <SegmentedControl
              fullWidth
              value={payType}
              onChange={(v) => setPayType(v as "per_class" | "fixed")}
              data={[
                { value: "per_class", label: "Por clase" },
                { value: "fixed", label: "Fijo" },
              ]}
            />
          </div>
          {payType === "per_class" ? (
            <NumberInput
              label="Tarifa por clase"
              prefix="Q"
              min={0}
              decimalScale={2}
              thousandSeparator=","
              value={rate}
              onChange={(v) => setRate(num(v))}
            />
          ) : (
            <NumberInput
              label="Salario fijo"
              prefix="Q"
              min={0}
              decimalScale={2}
              thousandSeparator=","
              value={fixed}
              onChange={(v) => setFixed(num(v))}
            />
          )}

          <Switch
            mt="sm"
            label="Ofrece personal trainer"
            checked={offersPt}
            onChange={(e) => setOffersPt(e.currentTarget.checked)}
          />
          {offersPt && (
            <>
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                <NumberInput
                  label="Precio de la sesión"
                  prefix="Q"
                  min={0}
                  decimalScale={2}
                  thousandSeparator=","
                  value={ptPrice}
                  onChange={(v) => setPtPrice(num(v))}
                />
                <NumberInput
                  label="Comisión del trainer"
                  suffix="%"
                  min={0}
                  max={100}
                  value={ptPct}
                  onChange={(v) => setPtPct(num(v))}
                />
              </SimpleGrid>
              <Text size="sm" c="dimmed">
                Trainer {money((precio * pct).toFixed(2))} · Gym {money((precio * (1 - pct)).toFixed(2))}
              </Text>
            </>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button loading={guardando} onClick={guardar}>
              Guardar
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

/** Ventana «Generar liquidación»: el periodo, y nada más. */
function GenerarModal({ gymId, opened, onClose }: { gymId: string; opened: boolean; onClose: () => void }) {
  const generate = useGeneratePayout(gymId);
  const today = new Date();
  const [from, setFrom] = useState<Date | null>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [to, setTo] = useState<Date | null>(today);
  /** Sin fechas o con el rango al revés no se genera nada: se dice por qué. */
  const periodoInvalido = motivoPeriodoInvalido(from, to);

  const onGenerate = async () => {
    if (periodoInvalido) {
      notifications.show({
        color: "red",
        title: "Revisa el periodo a liquidar",
        message: periodoInvalido.mensaje,
      });
      return;
    }
    try {
      const result = await generate.mutateAsync({
        period_start: iso(from),
        period_end: iso(to),
      });
      if (result.length > 0) {
        const total = result.reduce((acc, p) => acc + Number(p.total), 0);
        notifications.show({
          color: "teal",
          title: "Liquidación generada",
          message: `${result.length} ${result.length === 1 ? "liquidación" : "liquidaciones"} por un total de ${money(total)}.`,
        });
        onClose();
      } else {
        notifications.show({
          color: "yellow",
          title: "No hay nada que liquidar en ese periodo",
          message:
            "Revisa que las clases ya hayan pasado, tengan coach y al menos un check-in; que la tarifa del coach por clase sea mayor a Q0; y que las clases de coaches con salario fijo estén marcadas como «pagar extra».",
          autoClose: 12000,
        });
      }
    } catch (err) {
      notifications.show({
        color: "red",
        title: "No se pudo generar la liquidación",
        message: errMsg(err, "Revisa las fechas e intenta de nuevo."),
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Generar liquidación" centered>
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <DatePickerInput
            label="Desde"
            value={from}
            onChange={setFrom}
            valueFormat="DD/MM/YYYY"
            error={periodoInvalido?.desde}
            popoverProps={{ withinPortal: true }}
          />
          <DatePickerInput
            label="Hasta"
            value={to}
            onChange={setTo}
            valueFormat="DD/MM/YYYY"
            error={periodoInvalido?.hasta}
            popoverProps={{ withinPortal: true }}
          />
        </SimpleGrid>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={generate.isPending} disabled={!!periodoInvalido} onClick={onGenerate}>
            Generar liquidación
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** Ventana de una liquidación: su detalle y, si sigue abierta, «Marcar pagada». */
function LiquidacionModal({
  fila,
  gymId,
  onClose,
}: {
  fila: FilaLiquidacion | null;
  gymId: string;
  onClose: () => void;
}) {
  const payPayout = usePayPayout(gymId);

  /** Marca la liquidación como pagada (sale como gasto de nómina). */
  const onPagar = (p: FilaLiquidacion) =>
    payPayout.mutate(p.id, {
      onSuccess: () => {
        notifications.show({
          color: "teal",
          message: `Liquidación de ${p.coach_name} marcada como pagada.`,
        });
        onClose();
      },
      onError: (error) =>
        notifications.show({
          color: "red",
          message: errMsg(error, "No se pudo marcar la liquidación como pagada."),
        }),
    });

  return (
    <Modal opened={!!fila} onClose={onClose} title={fila ? fila.coach_name : "Liquidación"} centered>
      {fila && (
        <Stack gap="md">
          <Group gap="lg" wrap="wrap" align="flex-start">
            <Dato rotulo="Periodo">{periodo(fila)}</Dato>
            <Dato rotulo="Pagos">{fila.earnings_count}</Dato>
            <Dato rotulo="Total">
              <Money value={fila.total} decimals={2} />
            </Dato>
            <Dato rotulo="Estado">
              <Badge color={fila.status === "paid" ? "teal" : "yellow"} variant="light">
                {fila.status === "paid" ? "Pagada" : "Abierta"}
              </Badge>
            </Dato>
          </Group>
          {fila.status === "paid" && fila.paid_at && (
            <Text size="sm" c="dimmed">
              Pagada el {new Date(fila.paid_at).toLocaleDateString("es-GT")}
            </Text>
          )}
          {fila.status === "open" && (
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                Cerrar
              </Button>
              <Button loading={payPayout.isPending} onClick={() => onPagar(fila)}>
                Marcar pagada
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}

function Dato({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {rotulo}
      </Text>
      <div style={{ fontSize: "var(--mantine-font-size-sm)" }}>{children}</div>
    </div>
  );
}

/**
 * Pagos a coaches. Lo que vienes a ver va primero: qué hay que pagarle a cada
 * coach (las liquidaciones abiertas). Después, cómo se le paga a cada uno, y al
 * final el historial de liquidaciones.
 */
export function CoachPayrollPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const coaches = useGymCoaches(gymId);
  const payouts = useCoachPayouts(gymId);

  const [generando, setGenerando] = useState(false);
  const [coachAbierto, setCoachAbierto] = useState<string | null>(null);
  const [liquidacionAbierta, setLiquidacionAbierta] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<FilaLiquidacion>>({
    columnAccessor: "period_start",
    direction: "desc",
  });

  if (!gymId) return <NoGymAssigned />;
  if (coaches.isError) return <PageError onRetry={() => coaches.refetch()} />;

  const roster = (coaches.data ?? []) as Coach[];
  const filas = filasLiquidacion((payouts.data ?? []) as CoachPayout[], roster);
  const abiertas = filas
    .filter((p) => p.status === "open")
    .sort(
      (a, b) =>
        a.coach_name.localeCompare(b.coach_name, "es") || a.period_start.localeCompare(b.period_start),
    );
  const porPagar = abiertas.reduce((acc, p) => acc + Number(p.total), 0);
  const pagado = filas.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.total), 0);

  // Se buscan en los datos frescos: tras guardar o pagar, la ventana no queda con un dato viejo.
  const coach = coachAbierto ? (roster.find((c) => c.staff_role === coachAbierto) ?? null) : null;
  const liquidacion = liquidacionAbierta ? (filas.find((p) => p.id === liquidacionAbierta) ?? null) : null;

  return (
    <div>
      <PageHeader kicker="Negocio · Nómina" title="Pagos a coaches" />

      <Stack gap="lg">
        <GlassCard padding={18}>
          <Encabezado
            titulo="Por pagar"
            avisos={
              abiertas.length > 0 && (
                <Badge color="yellow" variant="light">
                  {abiertas.length} · {money(porPagar)}
                </Badge>
              )
            }
          >
            <Button onClick={() => setGenerando(true)}>Generar liquidación</Button>
          </Encabezado>
          {/* Sin esto, un fallo de carga se leía como "no debes nada" y el gym
              generaba la liquidación del periodo otra vez. */}
          {payouts.isError ? (
            <PageError message="No se pudieron cargar las liquidaciones." onRetry={() => payouts.refetch()} />
          ) : payouts.isLoading ? (
            <Text size="sm" c="dimmed">
              Cargando…
            </Text>
          ) : abiertas.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nada por pagar.
            </Text>
          ) : (
            <Stack gap={6}>
              {abiertas.map((p) => (
                <Tarjeta
                  key={p.id}
                  etiqueta={`Liquidación de ${p.coach_name}, ${money(p.total)}`}
                  onClick={() => setLiquidacionAbierta(p.id)}
                  aviso
                >
                  <Group gap="sm" wrap="nowrap" justify="space-between">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={600} truncate>
                        {nombreCorto(p.coach_name)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {periodo(p)} · {p.earnings_count} {p.earnings_count === 1 ? "pago" : "pagos"}
                      </Text>
                    </div>
                    <Money value={p.total} decimals={2} />
                  </Group>
                </Tarjeta>
              ))}
            </Stack>
          )}
        </GlassCard>

        <GlassCard padding={18}>
          <Encabezado titulo="Coaches" />
          {coaches.isLoading ? (
            <Text size="sm" c="dimmed">
              Cargando…
            </Text>
          ) : roster.length === 0 ? (
            <Text size="sm" c="dimmed">
              Sin coaches. Dalos de alta en Coaches.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
              {roster.map((c) => {
                // Por clase sin tarifa no genera nada al liquidar: se marca como pendiente.
                const sinTarifa = c.pay_type === "per_class" && !(Number(c.per_class_rate) > 0);
                return (
                  <Tarjeta
                    key={c.staff_role}
                    etiqueta={`Pago de ${c.name || c.email}`}
                    onClick={() => setCoachAbierto(c.staff_role)}
                    aviso={sinTarifa}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar src={c.photo} radius="xl" size={36} color="flame">
                        {(c.name || c.email).slice(0, 1).toUpperCase()}
                      </Avatar>
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {nombreCorto(c.name || c.email)}
                        </Text>
                        <Text
                          size="xs"
                          c={sinTarifa ? "var(--mantine-color-yellow-light-color)" : "dimmed"}
                          className="a-tabular"
                        >
                          {sinTarifa ? "Por clase · sin tarifa" : formaDePago(c)}
                        </Text>
                        {c.offers_pt && (
                          <Text size="xs" c="dimmed" className="a-tabular">
                            PT {money(c.pt_price)} · {Math.round(Number(c.pt_commission_pct) * 100)} %
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Tarjeta>
                );
              })}
            </SimpleGrid>
          )}
        </GlassCard>

        <GlassCard padding={18}>
          <Encabezado
            titulo="Liquidaciones"
            avisos={
              pagado > 0 && (
                <Text size="sm" c="dimmed" className="a-tabular">
                  Pagado {money(pagado)}
                </Text>
              )
            }
          />
          <DataTable<FilaLiquidacion>
            minHeight={140}
            highlightOnHover
            verticalSpacing="xs"
            idAccessor="id"
            records={sortRecords(filas, sortStatus)}
            fetching={payouts.isLoading}
            noRecordsText="Todavía no hay liquidaciones."
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            onRowClick={({ record }) => setLiquidacionAbierta(record.id)}
            columns={[
              { accessor: "coach_name", title: "Coach", sortable: true },
              {
                accessor: "period_start",
                title: "Periodo",
                sortable: true,
                render: (p) => periodo(p),
              },
              // Cuenta todo lo que suma la liquidación: clases, extras y sesiones de PT.
              {
                accessor: "earnings_count",
                title: "Pagos",
                sortable: true,
                textAlign: "right",
              },
              {
                accessor: "total",
                title: "Total",
                sortable: true,
                textAlign: "right",
                render: (p) => <Money value={p.total} decimals={2} block />,
              },
              {
                accessor: "status",
                title: "Estado",
                sortable: true,
                render: (p) => (
                  <Badge color={p.status === "paid" ? "teal" : "yellow"} variant="light" size="sm">
                    {p.status === "paid" ? "Pagada" : "Abierta"}
                  </Badge>
                ),
              },
            ]}
          />
        </GlassCard>
      </Stack>

      <GenerarModal gymId={gymId} opened={generando} onClose={() => setGenerando(false)} />
      <CoachModal coach={coach} gymId={gymId} onClose={() => setCoachAbierto(null)} />
      <LiquidacionModal fila={liquidacion} gymId={gymId} onClose={() => setLiquidacionAbierta(null)} />
    </div>
  );
}
