import { FormEvent, useMemo, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useBranches,
  useCorrectErpExpense,
  useCreateErpExpense,
  useErpExpenses,
  useUploadExpenseProof,
  useVoidErpExpense,
} from "../api/hooks";
import type { ErpExpense } from "../api/types";
import { DetailSheet } from "../components/DetailSheet";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { Money, PageHeader, SectionLabel } from "../components/ui";
import { errMsg } from "../lib/errors";
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

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

/** Datos que el formulario de corrección arrastra del gasto original. */
interface FormCorreccion {
  category: string | null;
  amount: string;
  description: string;
  incurred_on: Date | null;
  branch: string | null;
}

export function ExpensesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";

  // Filtros del listado (los resuelve el backend, no el cliente).
  const [estado, setEstado] = useState<string | null>("vigentes");
  const [categoria, setCategoria] = useState<string | null>("");
  const voided = estado === "anulados" ? true : estado === "vigentes" ? false : undefined;
  const expenses = useErpExpenses(gymId, {
    voided,
    category: categoria || undefined,
  });
  const branches = useBranches(gymId);
  const createExpense = useCreateErpExpense(gymId);
  const voidExpense = useVoidErpExpense(gymId);
  const correctExpense = useCorrectErpExpense(gymId);
  const uploadProof = useUploadExpenseProof(gymId);

  // Alta.
  const [category, setCategory] = useState<string | null>("rent");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [branch, setBranch] = useState<string | null>("");
  const [proof, setProof] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ErpExpense>>({
    columnAccessor: "incurred_on",
    direction: "desc",
  });

  // Ficha, anulación, corrección y comprobante.
  const [ficha, setFicha] = useState<ErpExpense | null>(null);
  const [anulando, setAnulando] = useState<ErpExpense | null>(null);
  const [motivo, setMotivo] = useState("");
  const [corrigiendo, setCorrigiendo] = useState<ErpExpense | null>(null);
  const [correccion, setCorreccion] = useState<FormCorreccion>({
    category: null,
    amount: "",
    description: "",
    incurred_on: null,
    branch: "",
  });
  const [correccionProof, setCorreccionProof] = useState<File | null>(null);
  const [adjuntando, setAdjuntando] = useState<ErpExpense | null>(null);
  const [adjunto, setAdjunto] = useState<File | null>(null);

  const branchData = useMemo(
    () => (branches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches.data],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createExpense.mutateAsync({
        category: category ?? "other",
        amount,
        description,
        incurred_on: iso(date),
        branch: branch || undefined,
        proof_file: proof ?? undefined,
      });
      setAmount("");
      setDescription("");
      setProof(null);
      notifications.show({ color: "teal", message: "Gasto registrado." });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo registrar el gasto.") });
    }
  };

  const abrirCorreccion = (e: ErpExpense) => {
    setCorrigiendo(e);
    setCorreccionProof(null);
    setCorreccion({
      category: e.category,
      amount: e.amount,
      description: e.description ?? "",
      incurred_on: e.incurred_on ? new Date(`${e.incurred_on}T00:00:00`) : null,
      branch: e.branch ?? "",
    });
  };

  const confirmarAnulacion = async () => {
    if (!anulando) return;
    try {
      await voidExpense.mutateAsync({ id: anulando.id, reason: motivo.trim() });
      notifications.show({ color: "teal", message: "Gasto anulado. Queda en el histórico." });
      setAnulando(null);
      setMotivo("");
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo anular el gasto.") });
    }
  };

  const confirmarCorreccion = async () => {
    if (!corrigiendo) return;
    try {
      const nuevo = await correctExpense.mutateAsync({
        id: corrigiendo.id,
        category: correccion.category ?? undefined,
        amount: correccion.amount || undefined,
        description: correccion.description,
        incurred_on: correccion.incurred_on ? iso(correccion.incurred_on) : undefined,
        branch: correccion.branch || null,
        proof_file: correccionProof ?? undefined,
      });
      notifications.show({
        color: "teal",
        message: `Gasto corregido. Se anuló el original y se registró uno nuevo por ${nuevo.amount}.`,
      });
      setCorrigiendo(null);
      setCorreccionProof(null);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo corregir el gasto.") });
    }
  };

  const confirmarAdjunto = async () => {
    if (!adjuntando || !adjunto) return;
    try {
      await uploadProof.mutateAsync({ id: adjuntando.id, file: adjunto });
      notifications.show({ color: "teal", message: "Comprobante adjuntado." });
      setAdjuntando(null);
      setAdjunto(null);
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo adjuntar el comprobante."),
      });
    }
  };

  if (!gymId) return <NoGymAssigned />;

  const filas = sortRecords(
    (expenses.data ?? []).filter((e) => {
      const term = search.trim().toLowerCase();
      return (
        !term ||
        (e.description ?? "").toLowerCase().includes(term) ||
        (CATEGORY_LABEL[e.category] ?? e.category).toLowerCase().includes(term)
      );
    }),
    sortStatus,
  );

  return (
    <div>
      <PageHeader
        kicker="Negocio · ERP"
        title="Gastos"
        subtitle="Registra los costos del gym para ver tu utilidad real. Un gasto nunca se borra: se anula o se corrige."
      />

      {expenses.isError && <PageError onRetry={() => expenses.refetch()} />}

      <Card mb="lg" component="form" onSubmit={onSubmit}>
        <Title order={3} mb="sm">
          Registrar gasto
        </Title>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} />
            <TextInput
              label="Monto (Q)"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
            />
            <TextInput
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <DateInput label="Fecha" value={date} onChange={setDate} valueFormat="YYYY-MM-DD" />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <FileInput
              label="Comprobante (factura o recibo)"
              description="Opcional. También se puede adjuntar después."
              placeholder="Subir archivo"
              accept="image/*,application/pdf"
              value={proof}
              onChange={setProof}
              clearable
            />
            {branchData.length > 0 && (
              <Select
                label="Sede"
                placeholder="Todas"
                value={branch}
                onChange={setBranch}
                data={branchData}
                clearable
              />
            )}
          </SimpleGrid>
          <Group justify="flex-end">
            <Button type="submit" disabled={!amount} loading={createExpense.isPending}>
              Registrar
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card>
        <Group align="flex-end" gap="md" mb="md" wrap="wrap">
          <TextInput
            label="Buscar"
            placeholder="Descripción o categoría…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={{ base: "100%", sm: 280 }}
          />
          <Select
            label="Estado"
            value={estado}
            onChange={setEstado}
            w={{ base: "100%", sm: 180 }}
            data={[
              { value: "vigentes", label: "Vigentes" },
              { value: "anulados", label: "Anulados" },
              { value: "todos", label: "Todos" },
            ]}
          />
          <Select
            label="Categoría"
            placeholder="Todas"
            value={categoria}
            onChange={setCategoria}
            clearable
            w={{ base: "100%", sm: 220 }}
            data={CATEGORIES}
          />
        </Group>

        <DataTable<ErpExpense>
          minHeight={160}
          highlightOnHover
          striped
          idAccessor="id"
          records={filas}
          fetching={expenses.isLoading}
          noRecordsText="Registra los costos del gym para ver tu utilidad real."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          rowStyle={(e) => (e.is_void ? { opacity: 0.55 } : undefined)}
          columns={[
            { accessor: "incurred_on", title: "Fecha", sortable: true },
            {
              accessor: "category",
              title: "Categoría",
              sortable: true,
              render: (e) => CATEGORY_LABEL[e.category] ?? e.category,
            },
            {
              accessor: "description",
              title: "Descripción",
              sortable: true,
              render: (e) => (
                <div>
                  <Text size="sm">{e.description || "—"}</Text>
                  {e.replaces && (
                    <Text c="dimmed" size="xs">
                      Corrige a un gasto anterior
                    </Text>
                  )}
                </div>
              ),
            },
            {
              accessor: "amount",
              title: "Monto",
              sortable: true,
              textAlign: "right",
              render: (e) => <Money value={e.amount} decimals={2} block />,
            },
            {
              accessor: "proof_file",
              title: "Comprobante",
              render: (e) =>
                e.proof_file || e.proof_url ? (
                  <Anchor href={e.proof_file || e.proof_url} target="_blank" size="sm">
                    Ver
                  </Anchor>
                ) : (
                  <Text c="dimmed" size="sm">
                    —
                  </Text>
                ),
            },
            {
              accessor: "is_void",
              title: "Estado",
              sortable: true,
              render: (e) =>
                e.is_void ? (
                  <Badge color="gray" variant="light">
                    {e.replaced_by ? "Corregido" : "Anulado"}
                  </Badge>
                ) : (
                  <Badge color="teal" variant="light">
                    Vigente
                  </Badge>
                ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (e) => (
                <RowActions
                  actions={[
                    { label: "Ver", variant: "subtle", onClick: () => setFicha(e) },
                    !e.is_void && {
                      label: "Corregir",
                      onClick: () => abrirCorreccion(e),
                    },
                    !e.is_void && {
                      label: "Comprobante",
                      variant: "subtle" as const,
                      onClick: () => {
                        setAdjuntando(e);
                        setAdjunto(null);
                      },
                    },
                    !e.is_void && {
                      label: "Anular",
                      color: "red",
                      variant: "subtle" as const,
                      onClick: () => {
                        setAnulando(e);
                        setMotivo("");
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Ficha del gasto: lo único que explica un monto raro en el P&L. */}
      <DetailSheet opened={!!ficha} onClose={() => setFicha(null)} title="Gasto">
        {ficha && (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">
                {CATEGORY_LABEL[ficha.category] ?? ficha.category} · {ficha.incurred_on}
              </Text>
              <Money value={ficha.amount} decimals={2} />
            </Group>
            <Text>{ficha.description || "Sin descripción."}</Text>
            {(ficha.proof_file || ficha.proof_url) && (
              <Anchor href={ficha.proof_file || ficha.proof_url} target="_blank" size="sm">
                Ver comprobante
              </Anchor>
            )}
            {ficha.is_void && (
              <Alert color="gray" variant="light" title="Gasto anulado">
                <Text size="sm">{ficha.void_reason || "Sin motivo registrado."}</Text>
                {ficha.voided_at && (
                  <Text c="dimmed" size="xs" mt={4}>
                    {new Date(ficha.voided_at).toLocaleString("es-GT")}
                  </Text>
                )}
              </Alert>
            )}
            <SectionLabel mt="sm">Rastro</SectionLabel>
            <Text c="dimmed" size="xs">
              Registrado el {new Date(ficha.created_at).toLocaleString("es-GT")}.
              {ficha.replaces ? " Nació de la corrección de otro gasto." : ""}
              {ficha.replaced_by ? " Fue corregido por un gasto posterior." : ""}
            </Text>
          </Stack>
        )}
      </DetailSheet>

      {/* Anular: el gasto sale del P&L pero permanece en el histórico. */}
      <Modal opened={!!anulando} onClose={() => setAnulando(null)} title="Anular gasto" centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            El gasto deja de contar en la utilidad, pero no se borra: queda con su motivo y su
            fecha de anulación.
          </Text>
          <TextInput
            label="Motivo"
            placeholder="Ej. se capturó dos veces"
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAnulando(null)}>
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={confirmarAnulacion}
              disabled={!motivo.trim()}
              loading={voidExpense.isPending}
            >
              Anular
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Corregir: NO edita el original (histórico inmutable); crea el sustituto. */}
      <Modal
        opened={!!corrigiendo}
        onClose={() => setCorrigiendo(null)}
        title="Corregir gasto"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            No se edita el gasto original: se anula y se registra uno nuevo con los datos
            corregidos. Ambos quedan enlazados en el histórico.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Categoría"
              value={correccion.category}
              onChange={(v) => setCorreccion((c) => ({ ...c, category: v }))}
              data={CATEGORIES}
            />
            <TextInput
              label="Monto (Q)"
              value={correccion.amount}
              onChange={(e) => setCorreccion((c) => ({ ...c, amount: e.currentTarget.value }))}
            />
            <TextInput
              label="Descripción"
              value={correccion.description}
              onChange={(e) => setCorreccion((c) => ({ ...c, description: e.currentTarget.value }))}
            />
            <DateInput
              label="Fecha"
              value={correccion.incurred_on}
              onChange={(v) => setCorreccion((c) => ({ ...c, incurred_on: v }))}
              valueFormat="YYYY-MM-DD"
              popoverProps={{ withinPortal: true }}
            />
          </SimpleGrid>
          {branchData.length > 0 && (
            <Select
              label="Sede"
              placeholder="Todas"
              value={correccion.branch}
              onChange={(v) => setCorreccion((c) => ({ ...c, branch: v }))}
              data={branchData}
              clearable
            />
          )}
          <FileInput
            label="Comprobante"
            description="Si no subes uno, se conserva el del gasto original."
            placeholder="Subir archivo"
            accept="image/*,application/pdf"
            value={correccionProof}
            onChange={setCorreccionProof}
            clearable
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCorrigiendo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarCorreccion}
              disabled={!correccion.amount}
              loading={correctExpense.isPending}
            >
              Corregir
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Adjuntar comprobante a un gasto ya registrado. */}
      <Modal
        opened={!!adjuntando}
        onClose={() => setAdjuntando(null)}
        title="Adjuntar comprobante"
        centered
      >
        <Stack gap="md">
          <FileInput
            label="Factura o recibo"
            placeholder="Subir archivo"
            accept="image/*,application/pdf"
            value={adjunto}
            onChange={setAdjunto}
            clearable
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAdjuntando(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAdjunto} disabled={!adjunto} loading={uploadProof.isPending}>
              Adjuntar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
