import { FormEvent, useState } from "react";
import { Button, Card, Group, Select, TextInput, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useCreateErpExpense, useErpExpenses } from "../api/hooks";
import type { ErpExpense } from "../api/types";
import { NoGymAssigned } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

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
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ErpExpense>>({
    columnAccessor: "incurred_on",
    direction: "desc",
  });

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
        <TextInput
          placeholder="Buscar por descripción o categoría…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
          w={300}
        />
        <DataTable<ErpExpense>
          minHeight={160}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(
            (data ?? []).filter((e) => {
              const term = search.trim().toLowerCase();
              return (
                !term ||
                (e.description ?? "").toLowerCase().includes(term) ||
                e.category.toLowerCase().includes(term)
              );
            }),
            sortStatus,
          )}
          fetching={isLoading}
          noRecordsText="Registra los costos del gym para ver tu utilidad real."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "incurred_on", title: "Fecha", sortable: true },
            { accessor: "category", title: "Categoría", sortable: true },
            { accessor: "description", title: "Descripción", sortable: true, render: (e) => e.description || "—" },
            { accessor: "amount", title: "Monto", sortable: true, render: (e) => `Q${e.amount}` },
          ]}
        />
      </Card>
    </div>
  );
}
