import { FormEvent, useMemo, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  FileInput,
  Grid,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { Paperclip, Search } from "lucide-react";
import {
  useBranches,
  useCorrectErpExpense,
  useCreateErpExpense,
  useErpExpenses,
  useUploadExpenseProof,
  useVoidErpExpense,
} from "../api/hooks";
import type { ErpExpense } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { Money, PageHeader } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";
import {
  CATEGORIAS_GASTO,
  categoriaGasto,
  faltaComprobante,
  fechaCorta,
  filtrarGastos,
  mesDe,
  ordenarGastos,
  periodosDisponibles,
  tieneComprobante,
  TODO,
  type OrdenGastos,
} from "./gastos/gastos";

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

/** Datos que el formulario de corrección arrastra del gasto original. */
interface FormCorreccion {
  category: string | null;
  amount: string;
  description: string;
  incurred_on: Date | null;
  branch: string | null;
}

/**
 * Suma de los gastos en pantalla, contando SOLO los vigentes. Un gasto anulado no
 * es un costo, y uno corregido ya está anulado y reemplazado por el nuevo: si se
 * sumaran, «Estado: Todos» contaría dos veces cada corrección e inflaría la cifra.
 */
export function sumarGastosVigentes(gastos: Pick<ErpExpense, "amount" | "is_void">[]) {
  const vigentes = gastos.filter((e) => !e.is_void);
  return {
    total: vigentes.reduce((acc, e) => acc + Number(e.amount || 0), 0),
    vigentes: vigentes.length,
    fuera: gastos.length - vigentes.length,
  };
}

/**
 * Aviso tras corregir un gasto. El monto llega del API como texto («1500.00»):
 * se formatea en quetzales con dos decimales, igual que la suma de arriba.
 */
export function mensajeCorreccion(monto: ErpExpense["amount"]) {
  return `Gasto corregido. Se anuló el original y se registró uno nuevo por ${fmtQ(monto, { decimals: 2 })}.`;
}

const ESTADOS = [
  { value: "vigentes", label: "Vigentes" },
  { value: "anulados", label: "Anulados" },
  { value: "todos", label: "Todos" },
];

const ORDENES: { value: OrdenGastos; label: string }[] = [
  { value: "recientes", label: "Más recientes" },
  { value: "monto", label: "Mayor monto" },
];

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function ExpensesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const hoy = useMemo(() => new Date(), []);

  // Filtros del servidor (estado y categoría) y del panel (mes, texto, orden).
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

  const [periodo, setPeriodo] = useState<string>(() => mesDe(new Date()));
  const [search, setSearch] = useState("");
  const [orden, setOrden] = useState<OrdenGastos>("recientes");
  const [soloSinComprobante, setSoloSinComprobante] = useState(false);

  // Alta.
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [category, setCategory] = useState<string | null>("rent");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [branch, setBranch] = useState<string | null>("");
  const [proof, setProof] = useState<File | null>(null);

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
  const nombreSede = (id: string | null) => (id ? branchData.find((b) => b.value === id)?.label : undefined);

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
      setNuevoAbierto(false);
      notifications.show({ color: "teal", message: "Gasto registrado." });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo registrar el gasto.") });
    }
  };

  const abrirCorreccion = (e: ErpExpense) => {
    setFicha(null);
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

  const abrirAnulacion = (e: ErpExpense) => {
    setFicha(null);
    setAnulando(e);
    setMotivo("");
  };

  const abrirAdjunto = (e: ErpExpense) => {
    setFicha(null);
    setAdjuntando(e);
    setAdjunto(null);
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
        message: mensajeCorreccion(nuevo.amount),
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

  const todos = expenses.data ?? [];
  const periodos = periodosDisponibles(todos, hoy, periodo);
  const etiquetaPeriodo = periodos.find((p) => p.value === periodo)?.label ?? periodo;
  const delPeriodo = filtrarGastos(todos, { periodo, texto: search });
  // Lo pendiente: gastos vigentes sin factura ni recibo. El contador filtra al tocarlo
  // y se apaga solo cuando ya no queda ninguno.
  const sinComprobante = delPeriodo.filter(faltaComprobante).length;
  const soloPendientes = soloSinComprobante && sinComprobante > 0;
  const filas = ordenarGastos(
    soloPendientes ? delPeriodo.filter(faltaComprobante) : delPeriodo,
    orden,
  );

  // Suma de lo que se ve, pero solo de los vigentes: los anulados y corregidos no son costo.
  const suma = sumarGastosVigentes(filas);

  return (
    <div>
      <PageHeader kicker="Negocio · ERP" title="Gastos" />

      {expenses.isError && <PageError onRetry={() => expenses.refetch()} />}

      <GlassCard padding={18} delay={0.6}>
        <Encabezado
          titulo={etiquetaPeriodo}
          avisos={
            sinComprobante > 0 && (
              <Button
                size="compact-sm"
                color="yellow"
                variant={soloPendientes ? "filled" : "light"}
                aria-pressed={soloPendientes}
                onClick={() => setSoloSinComprobante(!soloPendientes)}
              >
                {sinComprobante} sin comprobante
              </Button>
            )
          }
        >
          <Select
            aria-label="Periodo"
            data={periodos}
            value={periodo}
            onChange={(v) => setPeriodo(v ?? mesDe(new Date()))}
            allowDeselect={false}
            w={{ base: "100%", xs: 200 }}
          />
          <Button onClick={() => setNuevoAbierto(true)}>Nuevo gasto</Button>
        </Encabezado>

        <Grid gutter="xs" mb="md">
          <Grid.Col span={{ base: 12, sm: 6, lg: 6 }}>
            <TextInput
              aria-label="Buscar"
              placeholder="Buscar descripción o categoría"
              leftSection={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 4, sm: 2 }}>
            <Select
              aria-label="Categoría"
              placeholder="Categoría"
              value={categoria || null}
              onChange={setCategoria}
              clearable
              data={CATEGORIAS_GASTO}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 4, sm: 2 }}>
            <Select
              aria-label="Estado"
              value={estado}
              onChange={setEstado}
              allowDeselect={false}
              data={ESTADOS}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 4, sm: 2 }}>
            <Select
              aria-label="Orden"
              value={orden}
              onChange={(v) => setOrden((v as OrdenGastos) ?? "recientes")}
              allowDeselect={false}
              data={ORDENES}
            />
          </Grid.Col>
        </Grid>

        <Group justify="space-between" align="baseline" mb="sm" wrap="wrap" gap="xs">
          <Text size="sm" c="dimmed">
            {plural(suma.vigentes, "gasto", "gastos")}
            {suma.fuera
              ? ` · ${plural(suma.fuera, "anulado o corregido", "anulados o corregidos")} no suman`
              : ""}
          </Text>
          <Text fz={24} fw={700} className="a-tabular" aria-label={`Total ${fmtQ(suma.total, { decimals: 2 })}`}>
            {fmtQ(suma.total, { decimals: 2 })}
          </Text>
        </Group>

        {expenses.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : filas.length === 0 ? (
          <Text c="dimmed" size="sm" py="md">
            {periodo === TODO ? "Sin gastos con estos filtros." : `Sin gastos en ${etiquetaPeriodo.toLowerCase()}.`}
          </Text>
        ) : (
          <Stack gap={6}>
            {filas.map((e) => {
              const cat = categoriaGasto(e.category);
              return (
                <Tarjeta
                  key={e.id}
                  etiqueta={`${e.description || cat}, ${fmtQ(e.amount, { decimals: 2 })}, ${e.incurred_on}`}
                  onClick={() => setFicha(e)}
                  apagada={e.is_void}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Text size="sm" c="dimmed" w={62} className="a-tabular" style={{ flex: "0 0 auto" }}>
                      {fechaCorta(e.incurred_on, hoy)}
                    </Text>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {e.description || cat}
                      </Text>
                      {(e.description || e.replaces) && (
                        <Text size="xs" c="dimmed" truncate>
                          {[e.description ? cat : null, e.replaces ? "Corrige a un gasto anterior" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      )}
                    </div>
                    {e.is_void && (
                      <Badge size="xs" color="gray" variant="light">
                        {e.replaced_by ? "Corregido" : "Anulado"}
                      </Badge>
                    )}
                    {tieneComprobante(e) && (
                      <Paperclip size={14} aria-label="Con comprobante" style={{ flex: "0 0 auto", opacity: 0.6 }} />
                    )}
                    <Text size="sm" fw={600} ta="right" className="a-tabular" style={{ flex: "0 0 auto" }}>
                      <Money value={e.amount} decimals={2} />
                    </Text>
                  </Group>
                </Tarjeta>
              );
            })}
          </Stack>
        )}
      </GlassCard>

      {/* Nuevo gasto. */}
      <Modal opened={nuevoAbierto} onClose={() => setNuevoAbierto(false)} title="Nuevo gasto" centered>
        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIAS_GASTO} allowDeselect={false} />
              <TextInput
                label="Monto"
                leftSection="Q"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.currentTarget.value)}
                data-autofocus
              />
            </SimpleGrid>
            <TextInput
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DateInput
                label="Fecha"
                value={date}
                onChange={setDate}
                valueFormat="YYYY-MM-DD"
                popoverProps={{ withinPortal: true }}
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
            <FileInput
              label="Comprobante"
              placeholder="Foto o PDF"
              accept="image/*,application/pdf"
              value={proof}
              onChange={setProof}
              clearable
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setNuevoAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!amount} loading={createExpense.isPending}>
                Registrar
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* El gasto que se tocó: su detalle y lo que se le puede hacer. */}
      <Modal
        opened={!!ficha}
        onClose={() => setFicha(null)}
        title={ficha ? categoriaGasto(ficha.category) : "Gasto"}
        centered
      >
        {ficha && (
          <Stack gap="sm">
            <Group justify="space-between" align="baseline">
              <Text c="dimmed" size="sm">
                {new Date(`${ficha.incurred_on}T00:00:00`).toLocaleDateString("es-GT", { dateStyle: "long" })}
                {nombreSede(ficha.branch) ? ` · ${nombreSede(ficha.branch)}` : ""}
              </Text>
              <Text fz={24} fw={700} className="a-tabular">
                <Money value={ficha.amount} decimals={2} />
              </Text>
            </Group>
            <Text>{ficha.description || "Sin descripción."}</Text>
            {tieneComprobante(ficha) && (
              <Anchor href={ficha.proof_file || ficha.proof_url} target="_blank" size="sm">
                Ver comprobante
              </Anchor>
            )}
            {ficha.is_void && (
              <Alert color="gray" variant="light" title={ficha.replaced_by ? "Corregido" : "Anulado"}>
                <Text size="sm">{ficha.void_reason || "Sin motivo registrado."}</Text>
                {ficha.voided_at && (
                  <Text c="dimmed" size="xs" mt={4}>
                    {new Date(ficha.voided_at).toLocaleString("es-GT")}
                  </Text>
                )}
              </Alert>
            )}
            <Text c="dimmed" size="xs">
              Registrado el {new Date(ficha.created_at).toLocaleString("es-GT")}.
              {ficha.replaces ? " Corrige a un gasto anterior." : ""}
              {ficha.replaced_by ? " Lo reemplazó un gasto posterior." : ""}
            </Text>
            {!ficha.is_void && (
              <Group justify="flex-end" gap="xs" mt="xs">
                <Button variant="subtle" color="red" onClick={() => abrirAnulacion(ficha)}>
                  Anular
                </Button>
                <Button variant="default" onClick={() => abrirAdjunto(ficha)}>
                  {tieneComprobante(ficha) ? "Cambiar comprobante" : "Adjuntar comprobante"}
                </Button>
                <Button variant="light" onClick={() => abrirCorreccion(ficha)}>
                  Corregir
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>

      {/* Anular: el gasto sale del P&L pero permanece en el histórico. */}
      <Modal opened={!!anulando} onClose={() => setAnulando(null)} title="Anular gasto" centered>
        <Stack gap="md">
          <TextInput
            label="Motivo"
            placeholder="Ej. se capturó dos veces"
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
            data-autofocus
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
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {/*
              En cada onChange el valor se lee ANTES de llamar al setter, nunca dentro del
              updater. React pone `currentTarget` en null en cuanto el handler termina, y el
              updater que recibe `setState` no siempre corre en ese mismo tick: si ya hay otra
              actualización en cola, React lo difiere y para entonces `e.currentTarget` ya es
              null. Leerlo ahí revienta con un "Cannot read properties of null" que solo
              aparece al escribir rápido en dos campos seguidos, que es justo lo que hace la
              gente, y sin error boundary desmonta la página entera.
            */}
            <Select
              label="Categoría"
              value={correccion.category}
              onChange={(v) => setCorreccion((c) => ({ ...c, category: v }))}
              data={CATEGORIAS_GASTO}
            />
            <TextInput
              label="Monto"
              leftSection="Q"
              inputMode="decimal"
              value={correccion.amount}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setCorreccion((c) => ({ ...c, amount: valor }));
              }}
            />
          </SimpleGrid>
          <TextInput
            label="Descripción"
            value={correccion.description}
            onChange={(e) => {
              const valor = e.currentTarget.value;
              setCorreccion((c) => ({ ...c, description: valor }));
            }}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <DateInput
              label="Fecha"
              value={correccion.incurred_on}
              onChange={(v) => setCorreccion((c) => ({ ...c, incurred_on: v }))}
              valueFormat="YYYY-MM-DD"
              popoverProps={{ withinPortal: true }}
            />
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
          </SimpleGrid>
          <FileInput
            label="Comprobante"
            placeholder={corrigiendo && tieneComprobante(corrigiendo) ? "Se conserva el actual" : "Foto o PDF"}
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
        title="Comprobante"
        centered
      >
        <Stack gap="md">
          <FileInput
            label="Factura o recibo"
            placeholder="Foto o PDF"
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
