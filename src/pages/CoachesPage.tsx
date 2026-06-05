import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  useCoachPayouts,
  useGeneratePayout,
  useGymCoaches,
  usePayPayout,
  useUpdateCoach,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");
const money = (v: string | number) => `Q${Number(v).toFixed(2)}`;

export function CoachesPage() {
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

  if (!gymId) return <NoGymAssigned />;
  if (coaches.isError) return <PageError onRetry={() => coaches.refetch()} />;

  const onGenerate = async (e: FormEvent) => {
    e.preventDefault();
    await generate.mutateAsync({ period_start: iso(from), period_end: iso(to) });
  };

  return (
    <div>
      <PageHeader
        title="Coaches y pagos"
        subtitle="Define cómo se le paga a cada coach y genera las liquidaciones por periodo."
      />

      <Card mb="lg">
        <Title order={3} mb="sm">
          Coaches del gimnasio
        </Title>
        {coaches.isLoading ? (
          <PageLoading />
        ) : !(coaches.data ?? []).length ? (
          <EmptyState
            title="Sin coaches"
            description="Los coaches se dan de alta como staff del gimnasio. Aquí defines su forma de pago."
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
                    <Table.Td>{c.email}</Table.Td>
                    <Table.Td>
                      <Select
                        w={150}
                        value={c.pay_type}
                        onChange={(v) =>
                          v && updateCoach.mutate({ staffId: c.staff_role, body: { pay_type: v as "per_class" | "fixed" } })
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
                          updateCoach.mutate({
                            staffId: c.staff_role,
                            body: { per_class_rate: e.currentTarget.value.replace(/[^\d.]/g, "") || 0 },
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
                          updateCoach.mutate({
                            staffId: c.staff_role,
                            body: { fixed_amount: e.currentTarget.value.replace(/[^\d.]/g, "") || 0 },
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
      </Card>

      <Card>
        <Group justify="space-between" mb="sm" align="flex-end" component="form" onSubmit={onGenerate}>
          <div>
            <Title order={3} mb={4}>
              Liquidaciones
            </Title>
            <Text c="dimmed" size="sm">
              Genera el pago acumulado de un periodo y márcalo como pagado (registra el gasto de nómina).
            </Text>
          </div>
          <Group align="flex-end">
            <DatePickerInput label="Desde" value={from} onChange={setFrom} valueFormat="YYYY-MM-DD" />
            <DatePickerInput label="Hasta" value={to} onChange={setTo} valueFormat="YYYY-MM-DD" />
            <Button type="submit" loading={generate.isPending}>
              Generar liquidación
            </Button>
          </Group>
        </Group>

        {payouts.isLoading ? (
          <PageLoading />
        ) : !(payouts.data ?? []).length ? (
          <EmptyState title="Sin liquidaciones" description="Genera la primera liquidación de un periodo." />
        ) : (
          <Table.ScrollContainer minWidth={680}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Coach</Table.Th>
                  <Table.Th>Periodo</Table.Th>
                  <Table.Th>Clases</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(payouts.data ?? []).map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.coach_email}</Table.Td>
                    <Table.Td>
                      {p.period_start} → {p.period_end}
                    </Table.Td>
                    <Table.Td>{p.earnings_count}</Table.Td>
                    <Table.Td>{money(p.total)}</Table.Td>
                    <Table.Td>
                      <Badge color={p.status === "paid" ? "teal" : "yellow"} variant="light">
                        {p.status === "paid" ? "Pagada" : "Abierta"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {p.status === "open" && (
                        <Button size="xs" loading={payPayout.isPending} onClick={() => payPayout.mutate(p.id)}>
                          Marcar pagada
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </div>
  );
}
