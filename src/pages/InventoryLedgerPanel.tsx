import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  NumberInput,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import { ClipboardList, TriangleAlert } from "lucide-react";
import { useCreateErpMovement, useErpMovements, useErpProducts, useInventoryCount } from "../api/hooks";
import type { ErpMovement, ErpProduct, MovementType } from "../api/types";
import { PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Money, SectionLabel } from "../components/ui";
import { errMsg } from "../lib/errors";
import { MOVEMENT_TYPE, MOVEMENT_TYPE_COLOR, label } from "../lib/labels";

/**
 * Kardex, mermas y ajustes por conteo.
 *
 * El panel sólo sabía "reabastecer", así que un producto vencido, roto o robado
 * había que descontarlo con una entrada negativa disfrazada — o no descontarlo, y
 * entonces el stock del sistema dejaba de parecerse al de la bodega.
 *
 * **Merma y ajuste NO son lo mismo y por eso son dos formularios distintos**: la
 * merma es mercadería que se perdió de verdad y el P&L la valoriza como pérdida;
 * el ajuste por conteo corrige un error de captura y no debe ensuciar esa línea.
 * Meterlos en el mismo botón fue justo el bug que el backend acaba de arreglar.
 *
 * El ajuste manda lo CONTADO, nunca la diferencia: si la restara el panel, una
 * venta ocurrida entre leer el stock y mandar el ajuste quedaría borrada. La resta
 * la hace el backend con el producto bloqueado.
 */
export function InventoryLedgerPanel({ gymId }: { gymId: string }) {
  const products = useErpProducts(gymId);
  const [filtroProducto, setFiltroProducto] = useState<string | null>("");
  const [filtroTipo, setFiltroTipo] = useState<string | null>("");
  const movimientos = useErpMovements(gymId, {
    product: filtroProducto || undefined,
    type: (filtroTipo || undefined) as MovementType | undefined,
  });

  const opciones = useMemo(
    () =>
      (products.data ?? []).map((p: ErpProduct) => ({
        value: p.id,
        label: `${p.name} (stock ${p.stock_qty})`,
      })),
    [products.data],
  );
  const stockDe = (id: string | null) =>
    id ? (products.data ?? []).find((p) => p.id === id)?.stock_qty ?? null : null;

  return (
    <div>
      <Grid gutter="lg" mb="lg">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <FormularioMerma gymId={gymId} opciones={opciones} stockDe={stockDe} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <FormularioConteo gymId={gymId} opciones={opciones} stockDe={stockDe} />
        </Grid.Col>
      </Grid>

      <SectionLabel as="h2" mb="xs">
        Kardex · todos los movimientos
      </SectionLabel>
      <GlassCard padding={14} delay={0.84}>
        <Text c="dimmed" size="sm" mb="md">
          El stock de cada producto es la suma de estas filas. Si un número no cuadra, aquí está el
          movimiento que lo explica.
        </Text>
        <Group gap="sm" mb="md" wrap="wrap">
          <Select
            aria-label="Filtrar por producto"
            placeholder="Todos los productos"
            value={filtroProducto}
            onChange={setFiltroProducto}
            data={[{ value: "", label: "Todos los productos" }, ...opciones]}
            searchable
            w={{ base: "100%", sm: 300 }}
          />
          <Select
            aria-label="Filtrar por tipo de movimiento"
            placeholder="Todos los movimientos"
            value={filtroTipo}
            onChange={setFiltroTipo}
            data={[
              { value: "", label: "Todos los movimientos" },
              ...Object.entries(MOVEMENT_TYPE).map(([value, texto]) => ({ value, label: texto })),
            ]}
            w={{ base: "100%", sm: 240 }}
          />
        </Group>

        {movimientos.isError ? (
          <PageError
            message="No se pudo cargar el kardex."
            onRetry={() => movimientos.refetch()}
          />
        ) : (
          <DataTable<ErpMovement>
            minHeight={160}
            highlightOnHover
            striped
            idAccessor="id"
            records={movimientos.data ?? []}
            fetching={movimientos.isLoading}
            noRecordsText="Sin movimientos registrados todavía."
            columns={[
              {
                accessor: "created_at",
                title: "Fecha",
                render: (m) => new Date(m.created_at).toLocaleString("es-GT"),
              },
              { accessor: "product_name", title: "Producto" },
              {
                accessor: "type",
                title: "Movimiento",
                render: (m) => (
                  <Badge color={MOVEMENT_TYPE_COLOR[m.type] ?? "gray"} variant="light" size="sm">
                    {label(MOVEMENT_TYPE, m.type)}
                  </Badge>
                ),
              },
              {
                accessor: "qty",
                title: "Cantidad",
                textAlign: "right",
                render: (m) => (
                  <Text
                    size="sm"
                    className="a-tabular"
                    c={m.qty < 0 ? "var(--nucleo-danger)" : undefined}
                    fw={600}
                  >
                    {m.qty > 0 ? `+${m.qty}` : m.qty}
                  </Text>
                ),
              },
              {
                accessor: "unit_cost",
                title: "Costo unitario",
                textAlign: "right",
                render: (m) => <Money value={m.unit_cost} decimals={2} block />,
              },
              {
                accessor: "note",
                title: "Nota",
                render: (m) => (
                  <Text size="xs" c="dimmed" lineClamp={2} title={m.note}>
                    {m.note || "—"}
                  </Text>
                ),
              },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}

interface CamposComunes {
  gymId: string;
  opciones: { value: string; label: string }[];
  stockDe: (id: string | null) => number | null;
}

/** Mercadería que se perdió de verdad: vencida, rota, robada. El P&L la valoriza. */
function FormularioMerma({ gymId, opciones, stockDe }: CamposComunes) {
  const registrar = useCreateErpMovement(gymId);
  const [producto, setProducto] = useState<string | null>(null);
  const [qty, setQty] = useState<number | string>(1);
  const [motivo, setMotivo] = useState("");

  const stock = stockDe(producto);
  const cantidad = Number(qty) || 0;
  const excede = stock !== null && cantidad > stock;

  const enviar = async () => {
    if (!producto || cantidad <= 0) return;
    try {
      await registrar.mutateAsync({
        product_id: producto,
        type: "loss",
        qty: cantidad,
        note: motivo.trim(),
      });
      setQty(1);
      setMotivo("");
      notifications.show({
        color: "teal",
        message: "Merma registrada. Salió del stock y se contabiliza como pérdida.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo registrar la merma."),
      });
    }
  };

  return (
    <GlassCard padding={20} delay={0.6} style={{ height: "100%" }}>
      <Group gap="xs" mb={6}>
        <TriangleAlert size={17} color="var(--nucleo-danger)" />
        <SectionLabel mb={0} as="h2">
          Registrar merma
        </SectionLabel>
      </Group>
      <Text c="dimmed" size="sm" mb="md">
        Producto vencido, roto, robado o consumido en casa. Sale del stock y cuenta como{" "}
        <strong>pérdida</strong> en tu reporte de negocio.
      </Text>
      <Select
        label="Producto"
        placeholder="Selecciona…"
        value={producto}
        onChange={setProducto}
        data={opciones}
        searchable
        mb="sm"
      />
      <NumberInput
        label="Cantidad perdida"
        value={qty}
        onChange={setQty}
        min={1}
        mb="sm"
        description={stock !== null ? `Hay ${stock} en el sistema` : undefined}
      />
      {excede && (
        <Alert color="yellow" variant="light" mb="sm" p="xs">
          Estás dando de baja más unidades de las que registra el sistema: el stock quedará en
          negativo. Si la diferencia es de captura, usa el conteo físico.
        </Alert>
      )}
      <TextInput
        label="Motivo"
        placeholder="Se vencieron 3 barras / se rompió en bodega"
        value={motivo}
        onChange={(e) => setMotivo(e.currentTarget.value)}
        mb="md"
      />
      <Button
        fullWidth
        color="red"
        variant="light"
        disabled={!producto || cantidad <= 0}
        loading={registrar.isPending}
        onClick={enviar}
      >
        Registrar merma
      </Button>
    </GlassCard>
  );
}

/** Corrección de captura: se manda lo contado y el backend calcula la diferencia. */
function FormularioConteo({ gymId, opciones, stockDe }: CamposComunes) {
  const contar = useInventoryCount(gymId);
  const [producto, setProducto] = useState<string | null>(null);
  const [contado, setContado] = useState<number | string>(0);
  const [nota, setNota] = useState("");
  const [ultimo, setUltimo] = useState<string | null>(null);

  const stock = stockDe(producto);
  const contadas = Number(contado);
  const valido = producto !== null && Number.isFinite(contadas) && contadas >= 0;
  // Sólo un ADELANTO para el operador: la diferencia real la calcula el backend
  // contra el stock del momento, que puede haber cambiado por una venta.
  const previsto = stock !== null && Number.isFinite(contadas) ? contadas - stock : null;

  const enviar = async () => {
    if (!valido) return;
    try {
      const resultado = await contar.mutateAsync({
        product_id: producto,
        counted_qty: contadas,
        note: nota.trim(),
      });
      setNota("");
      setUltimo(
        resultado.delta === 0
          ? "El conteo cuadró: no hizo falta asentar nada."
          : `Ajuste asentado: ${resultado.delta > 0 ? `sobraban ${resultado.delta}` : `faltaban ${Math.abs(resultado.delta)}`}. El sistema decía ${resultado.previous_qty} y ahora dice ${resultado.stock_qty}.`,
      );
      notifications.show({
        color: "teal",
        message:
          resultado.delta === 0
            ? "El conteo cuadró con el sistema."
            : "Conteo aplicado: el stock quedó igual a lo que contaste.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo aplicar el conteo."),
      });
    }
  };

  return (
    <GlassCard padding={20} delay={0.72} style={{ height: "100%" }}>
      <Group gap="xs" mb={6}>
        <ClipboardList size={17} />
        <SectionLabel mb={0} as="h2">
          Ajuste por conteo físico
        </SectionLabel>
      </Group>
      <Text c="dimmed" size="sm" mb="md">
        Contaste la bodega y no coincide con el sistema. Escribe lo que <strong>contaste</strong>,
        no la diferencia. Esto <strong>no</strong> es una pérdida: corrige un error de captura y no
        toca la línea de mermas del reporte.
      </Text>
      <Select
        label="Producto"
        placeholder="Selecciona…"
        value={producto}
        onChange={(v) => {
          setProducto(v);
          setContado(stockDe(v) ?? 0);
          setUltimo(null);
        }}
        data={opciones}
        searchable
        mb="sm"
      />
      <NumberInput
        label="Unidades contadas"
        value={contado}
        onChange={setContado}
        min={0}
        mb="sm"
        description={stock !== null ? `El sistema dice ${stock}` : undefined}
      />
      {previsto !== null && previsto !== 0 && (
        <Text size="sm" mb="sm" c={previsto < 0 ? "var(--nucleo-danger)" : undefined}>
          {previsto < 0
            ? `Faltarían ${Math.abs(previsto)} unidades.`
            : `Sobrarían ${previsto} unidades.`}{" "}
          <Text component="span" size="xs" c="dimmed">
            La diferencia definitiva la calcula el backend al aplicarlo.
          </Text>
        </Text>
      )}
      <TextInput
        label="Nota"
        placeholder="Conteo de fin de mes"
        value={nota}
        onChange={(e) => setNota(e.currentTarget.value)}
        mb="md"
      />
      <Button fullWidth disabled={!valido} loading={contar.isPending} onClick={enviar}>
        Aplicar conteo
      </Button>
      {ultimo && (
        <Text size="sm" c="dimmed" mt="sm">
          {ultimo}
        </Text>
      )}
    </GlassCard>
  );
}
