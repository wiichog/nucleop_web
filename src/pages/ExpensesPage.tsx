import { FormEvent, useState } from "react";
import { Button, Card, Group, Select, Table, TextInput, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useCreateErpExpense, useErpExpenses } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const CATEGORIES = [
  { value: "rent", label: "Renta" },
  { value: "utilities", label: "Servicios" },
  { value: "equipment", label: "Equipo" },
  { value: "marketing", label: "Marketing" },
  { value: "payroll", label: "Nómina" },
  { value: "inventory", label: "Compra de inventario" },
  { value: "other", label: "Otro" },
];

export function ExpensesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useErpExpenses(gymId);
  const createExpense = useCreateErpExpense(gymId);

  const [category, setCategory] = useState<string | null>("rent");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createExpense.mutateAsync({
      category: category ?? "other",
      amount,
      description,
      incurred_on: date ? date.toLocaleDateString("en-CA") : "",
    });
    setAmount("");
    setDescription("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader title="Gastos" subtitle="Registra los costos del gym para ver tu utilidad real." />
      <Card mb="lg" component="form" onSubmit={onSubmit}>
        <Title order={3} mb="sm">
          Registrar gasto
        </Title>
        <Group align="flex-end" gap="md">
          <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} />
          <TextInput label="Monto (Q)" value={amount} onChange={(e) => setAmount(e.currentTarget.value)} w={120} />
          <TextInput label="Descripción" value={description} onChange={(e) => setDescription(e.currentTarget.value)} style={{ flex: 1, minWidth: 200 }} />
          <DateInput label="Fecha" value={date} onChange={setDate} valueFormat="YYYY-MM-DD" />
          <Button type="submit" disabled={!amount} loading={createExpense.isPending}>
            Registrar
          </Button>
        </Group>
      </Card>

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState title="Sin gastos" description="Registra los costos del gym para ver tu utilidad real." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Descripción</Table.Th>
                <Table.Th>Monto</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((e) => (
                <Table.Tr key={e.id}>
                  <Table.Td>{e.incurred_on}</Table.Td>
                  <Table.Td>{e.category}</Table.Td>
                  <Table.Td>{e.description || "—"}</Table.Td>
                  <Table.Td>Q{e.amount}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
