import { FormEvent, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  NumberInput,
  Select,
  Switch,
  Table,
  Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { CalendarClock, Dumbbell, Users, Wallet } from "lucide-react";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useCoachPayouts,
  useGeneratePayout,
  useGymCoaches,
  usePayPayout,
  useUpdateCoach,
} from "../api/hooks";
import type { CoachPayout } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { Money, PageHeader, SectionLabel } from "../components/ui";
import { BigMetric, GlassCard, MetricTile, Stagger } from "../components/aurora";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { sortRecords } from "../lib/sortRecords";

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");
const money = (v: string | number) => fmtQ(v, { decimals: 2 });

/** Nómina de coaches: forma de pago por coach + liquidaciones del periodo (Negocio/ERP). */
export function CoachPayrollPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const coaches = useGymCoaches(gymId);
  const updateCoach = useUpdateCoach(gymId);
  const payouts = useCoachPayouts(gymId);
  const generate = useGeneratePayout(gymId);
  const payPayout = usePayPayout(gymId);

  const today = new Date();
  const [from, setFrom] = useState<Date | null>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [to, setTo] = useState<Date | null>(today);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<CoachPayout>>({
    columnAccessor: "period_start",
    direction: "desc",
  });

  /**
   * Guarda un cambio de nómina del coach. Antes se llamaba a `mutate` sin
   * callbacks: si el backend rechazaba la tarifa, el input se quedaba con el
   * número nuevo, nadie avisaba, y la liquidación salía con el valor viejo.
   * Solo avisa en el error: el guardado va en cada `blur` y un toast de éxito
   * por campo sería ruido.
   */
  const guardarCoach = (
    staffId: string,
    body: Parameters<typeof updateCoach.mutate>[0]["body"],
  ) =>
    updateCoach.mutate(
      { staffId, body },
      {
        onError: (error) =>
          notifications.show({
            color: "red",
            message: errMsg(error, "No se pudo guardar el cambio de nómina del coach."),
          }),
      },
    );

  /** Marca la liquidación como pagada (sale como gasto de nómina). */
  const onPagar = (p: CoachPayout) =>
    payPayout.mutate(p.id, {
      onSuccess: () =>
        notifications.show({
          color: "teal",
          message: `Liquidación de ${p.coach_email} marcada como pagada.`,
        }),
      onError: (error) =>
        notifications.show({
          color: "red",
          message: errMsg(error, "No se pudo marcar la liquidación como pagada."),
        }),
    });

  if (!gymId) return <NoGymAssigned />;
  if (coaches.isError) return <PageError onRetry={() => coaches.refetch()} />;

  const onGenerate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await generate.mutateAsync({ period_start: iso(from), period_end: iso(to) });
      if (result.length > 0) {
        const total = result.reduce((acc, p) => acc + Number(p.total), 0);
        notifications.show({
          color: "teal",
          title: "Liquidación generada",
          message: `${result.length} ${result.length === 1 ? "liquidación" : "liquidaciones"} por un total de ${money(total)}.`,
        });
      } else {
        notifications.show({
          color: "yellow",
          title: "No hay nada que liquidar en ese periodo",
          message:
            "No se encontraron ingresos pendientes. Verifica que: las clases del periodo ya hayan pasado y tengan coach asignado; el coach 'por clase' tenga tarifa mayor a Q0; y las clases de coaches con salario fijo estén marcadas como 'pagar extra'.",
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

  // Cifras derivadas de lo que ya está cargado: no hay consulta nueva.
  const roster = coaches.data ?? [];
  const liquidaciones = (payouts.data ?? []) as CoachPayout[];
  const abiertas = liquidaciones.filter((p) => p.status === "open");
  const porLiquidar = abiertas.reduce((acc, p) => acc + Number(p.total), 0);
  const pagado = liquidaciones
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.total), 0);
  /** Mientras carga el roster, un 0 se leería como "no tienes coaches". */
  const kpi = (n: number) => (coaches.isLoading ? "—" : n);

  return (
    <div>
      <PageHeader
        kicker="Negocio · Nómina"
        title="Pagos a coaches"
        subtitle="Define cómo se le paga a cada coach, habilita el personal trainer y genera las liquidaciones del periodo (quedan registradas como gasto de nómina)."
      />

      {/* Cifra protagonista: lo que el gimnasio le debe a sus coaches ahora. */}
      <GlassCard variant="core" sheen padding={26} delay={0.6}>
        <BigMetric
          label="Por liquidar"
          value={payouts.isLoading ? "—" : money(porLiquidar)}
          fz="clamp(34px, calc(58 * var(--u)), 68px)"
          delay={1.0}
        />
        <Group gap="lg" mt="lg" wrap="wrap" className="a-rise" style={{ animationDelay: "1.12s" }}>
          <div>
            <SectionLabel mb={4}>Liquidaciones abiertas</SectionLabel>
            <Text fw={600} className="a-tabular">
              {payouts.isLoading ? "—" : abiertas.length}
            </Text>
          </div>
          <Divider orientation="vertical" />
          <div>
            <SectionLabel mb={4}>Pagado acumulado</SectionLabel>
            <Text fw={600} className="a-tabular">
              {payouts.isLoading ? "—" : money(pagado)}
            </Text>
          </div>
        </Group>
      </GlassCard>

      <Stagger
        from={0.72}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(calc(180 * var(--u)), 1fr))",
          gap: "calc(14 * var(--u))",
          margin: "calc(16 * var(--u)) 0 calc(20 * var(--u))",
        }}
      >
        <MetricTile
          label="Coaches en nómina"
          value={kpi(roster.length)}
          icon={<Users size={16} strokeWidth={1.8} />}
        />
        <MetricTile
          label="Pago por clase"
          value={kpi(roster.filter((c) => c.pay_type === "per_class").length)}
          icon={<CalendarClock size={16} strokeWidth={1.8} />}
        />
        <MetricTile
          label="Salario fijo"
          value={kpi(roster.filter((c) => c.pay_type === "fixed").length)}
          icon={<Wallet size={16} strokeWidth={1.8} />}
        />
        <MetricTile
          label="Ofrecen personal trainer"
          value={kpi(roster.filter((c) => c.offers_pt).length)}
          icon={<Dumbbell size={16} strokeWidth={1.8} />}
        />
      </Stagger>

      <SectionLabel as="h2" mb={10}>Forma de pago por coach</SectionLabel>
      <GlassCard padding={18} delay={0.84} style={{ marginBottom: "calc(20 * var(--u))" }}>
        {coaches.isLoading ? (
          <PageLoading />
        ) : !(coaches.data ?? []).length ? (
          <EmptyState
            title="Sin coaches"
            description="Da de alta coaches en Operación → Coaches; aquí defines su forma de pago."
          />
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Coach</Table.Th>
                  <Table.Th>Forma de pago</Table.Th>
                  <Table.Th>Tarifa por clase</Table.Th>
                  <Table.Th>Salario fijo</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(coaches.data ?? []).map((c) => (
                  <Table.Tr key={c.staff_role}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar src={c.photo} radius="xl" size={38} color="flame">
                          {(c.name || c.email).slice(0, 1).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text fw={600} size="sm">
                            {c.name || c.email}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {c.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        w={150}
                        value={c.pay_type}
                        onChange={(v) =>
                          v && guardarCoach(c.staff_role, { pay_type: v as "per_class" | "fixed" })
                        }
                        data={[
                          { value: "per_class", label: "Por clase" },
                          { value: "fixed", label: "Fijo" },
                        ]}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        w={120}
                        prefix="Q"
                        min={0}
                        decimalScale={2}
                        disabled={c.pay_type !== "per_class"}
                        defaultValue={Number(c.per_class_rate)}
                        onBlur={(e) =>
                          guardarCoach(c.staff_role, {
                            per_class_rate: e.currentTarget.value.replace(/[^\d.]/g, "") || 0,
                          })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        w={120}
                        prefix="Q"
                        min={0}
                        decimalScale={2}
                        disabled={c.pay_type !== "fixed"}
                        defaultValue={Number(c.fixed_amount)}
                        onBlur={(e) =>
                          guardarCoach(c.staff_role, {
                            fixed_amount: e.currentTarget.value.replace(/[^\d.]/g, "") || 0,
                          })
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
        <Text c="dimmed" size="xs" mt="sm">
          Coach por clase: se le acumula la tarifa por cada clase que imparte. Coach fijo: solo se le paga
          extra en las clases marcadas como “pagar extra”.
        </Text>
      </GlassCard>

      <SectionLabel as="h2" mb={10}>Personal trainer</SectionLabel>
      <GlassCard padding={18} delay={0.96} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <Text c="dimmed" size="sm" mb="sm">
          Habilita el servicio 1‑a‑1 por coach, su precio y la comisión del trainer. El cobro completo
          es ingreso del gym y la comisión entra a la liquidación del coach (el gym se queda el resto).
        </Text>
        {coaches.isLoading ? (
          <PageLoading />
        ) : !(coaches.data ?? []).length ? (
          <EmptyState
            title="Sin coaches"
            description="Da de alta coaches en Operación → Coaches; aquí habilitas su personal trainer."
          />
        ) : (
          <Table.ScrollContainer minWidth={680}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Coach</Table.Th>
                  <Table.Th>Ofrece PT</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Comisión del trainer</Table.Th>
                  <Table.Th>Se queda el gym</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(coaches.data ?? []).map((c) => {
                  const pct = Math.round(Number(c.pt_commission_pct) * 100);
                  const trainerCut = (Number(c.pt_price) * Number(c.pt_commission_pct)).toFixed(2);
                  const gymCut = (Number(c.pt_price) * (1 - Number(c.pt_commission_pct))).toFixed(2);
                  return (
                    <Table.Tr key={c.staff_role}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar src={c.photo} radius="xl" size={38} color="flame">
                            {(c.name || c.email).slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Text fw={600} size="sm">
                            {c.name || c.email}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={c.offers_pt}
                          onChange={(e) =>
                            guardarCoach(c.staff_role, { offers_pt: e.currentTarget.checked })
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          w={120}
                          prefix="Q"
                          min={0}
                          decimalScale={2}
                          disabled={!c.offers_pt}
                          defaultValue={Number(c.pt_price)}
                          onBlur={(e) =>
                            guardarCoach(c.staff_role, {
                              pt_price: e.currentTarget.value.replace(/[^\d.]/g, "") || 0,
                            })
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <NumberInput
                            w={100}
                            suffix="%"
                            min={0}
                            max={100}
                            disabled={!c.offers_pt}
                            defaultValue={pct}
                            onBlur={(e) => {
                              const v = Number(e.currentTarget.value.replace(/[^\d.]/g, "")) || 0;
                              guardarCoach(c.staff_role, {
                                pt_commission_pct: Math.min(Math.max(v, 0), 100) / 100,
                              });
                            }}
                          />
                          {c.offers_pt && (
                            <Text c="dimmed" size="xs">
                              {money(trainerCut)}
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {c.offers_pt ? (
                          <Text size="sm" fw={600}>
                            {money(gymCut)}
                          </Text>
                        ) : (
                          <Text c="dimmed" size="sm">—</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </GlassCard>

      {/* Controles de periodo: el filtro vive en su propia pastilla de vidrio. */}
      <GlassCard padding={16} delay={1.08} style={{ marginBottom: "calc(14 * var(--u))" }}>
        <Group
          justify="space-between"
          align="flex-end"
          gap="md"
          wrap="wrap"
          component="form"
          onSubmit={onGenerate}
        >
          <div style={{ minWidth: 0 }}>
            <SectionLabel as="h2" mb={4}>Periodo a liquidar</SectionLabel>
            <Text c="dimmed" size="sm">
              Genera el pago acumulado de un periodo y márcalo como pagado (registra el gasto de nómina).
            </Text>
          </div>
          <Group align="flex-end" gap="sm" wrap="wrap">
            <DatePickerInput label="Desde" value={from} onChange={setFrom} valueFormat="YYYY-MM-DD" />
            <DatePickerInput label="Hasta" value={to} onChange={setTo} valueFormat="YYYY-MM-DD" />
            <Button type="submit" loading={generate.isPending}>
              Generar liquidación
            </Button>
          </Group>
        </Group>
      </GlassCard>

      <SectionLabel as="h2" mb={10}>Liquidaciones</SectionLabel>
      <GlassCard padding={12} delay={1.2}>
        {/* Sin esto, un fallo de carga se leía como "todavía no has liquidado
            nada" y el gym generaba la liquidación del periodo otra vez. */}
        {payouts.isError && (
          <PageError
            message="No se pudieron cargar las liquidaciones."
            onRetry={() => payouts.refetch()}
          />
        )}
        <DataTable<CoachPayout>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords((payouts.data ?? []) as CoachPayout[], sortStatus)}
          fetching={payouts.isLoading}
          noRecordsText="Genera la primera liquidación de un periodo."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "coach_email", title: "Coach", sortable: true },
            { accessor: "period_start", title: "Periodo", sortable: true, render: (p) => `${p.period_start} → ${p.period_end}` },
            { accessor: "earnings_count", title: "Clases", sortable: true, textAlign: "right" },
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
                <Badge color={p.status === "paid" ? "teal" : "yellow"} variant="light">
                  {p.status === "paid" ? "Pagada" : "Abierta"}
                </Badge>
              ),
            },
            {
              accessor: "actions",
              title: "",
              render: (p) =>
                p.status === "open" ? (
                  <Button
                    size="xs"
                    loading={payPayout.isPending && payPayout.variables === p.id}
                    onClick={() => onPagar(p)}
                  >
                    Marcar pagada
                  </Button>
                ) : null,
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
