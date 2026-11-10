import { useMemo, useState } from "react";
import { Badge, Button, Modal, Select, Text } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { useErpMovements, useErpProducts } from "../api/hooks";
import type { ErpMovement, ErpProduct, MovementType } from "../api/types";
import { PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Encabezado } from "../components/Tarjeta";
import { Money } from "../components/ui";
import { MOVEMENT_TYPE, MOVEMENT_TYPE_COLOR, label } from "../lib/labels";
import { AjusteStock } from "./inventario/AjusteStock";

/**
 * Movimientos (kardex): el stock de cada producto es la suma de estas filas, así
 * que si un número no cuadra, aquí está el que lo explica. «Ajustar stock» abre
 * las tres formas de moverlo a mano (entrada, merma y conteo), que viven en
 * `AjusteStock` junto con la razón de que merma y conteo sean cosas distintas.
 *
 * El filtro por producto puede venir de fuera (la URL, para que «Ver movimientos»
 * de la ficha de un producto llegue ya filtrado); sin `onProducto` es local.
 */
export function InventoryLedgerPanel({
  gymId,
  producto,
  onProducto,
}: {
  gymId: string;
  producto?: string;
  onProducto?: (id: string) => void;
}) {
  const products = useErpProducts(gymId);
  const [productoLocal, setProductoLocal] = useState("");
  const filtroProducto = onProducto ? (producto ?? "") : productoLocal;
  const setFiltroProducto = onProducto ?? setProductoLocal;
  const [filtroTipo, setFiltroTipo] = useState<string | null>("");
  const [ajustando, setAjustando] = useState(false);
  const movimientos = useErpMovements(gymId, {
    product: filtroProducto || undefined,
    type: (filtroTipo || undefined) as MovementType | undefined,
  });

  const productos: ErpProduct[] = products.data ?? [];
  const opciones = useMemo(
    () => productos.map((p) => ({ value: p.id, label: `${p.name} (stock ${p.stock_qty})` })),
    [productos],
  );

  return (
    <GlassCard padding={18} delay={0.6}>
      <Encabezado titulo="Movimientos">
        <Select
          aria-label="Filtrar por producto"
          placeholder="Todos los productos"
          value={filtroProducto}
          onChange={(v) => setFiltroProducto(v ?? "")}
          data={[{ value: "", label: "Todos los productos" }, ...opciones]}
          searchable
          w={{ base: "100%", sm: 260 }}
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
          w={{ base: "100%", sm: 210 }}
        />
        <Button onClick={() => setAjustando(true)}>Ajustar stock</Button>
      </Encabezado>

      {movimientos.isError ? (
        <PageError message="No se pudo cargar el kardex." onRetry={() => movimientos.refetch()} />
      ) : (
        <DataTable<ErpMovement>
          minHeight={160}
          highlightOnHover
          verticalSpacing="xs"
          idAccessor="id"
          records={movimientos.data ?? []}
          fetching={movimientos.isLoading}
          noRecordsText="Sin movimientos todavía."
          columns={[
            {
              accessor: "created_at",
              title: "Fecha",
              render: (m) =>
                new Date(m.created_at).toLocaleString("es-GT", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                }),
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
                <Text size="sm" className="a-tabular" c={m.qty < 0 ? "var(--nucleo-danger)" : undefined} fw={600}>
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </Text>
              ),
            },
            {
              accessor: "unit_cost",
              title: "Costo",
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

      <Modal opened={ajustando} onClose={() => setAjustando(false)} title="Ajustar stock" centered>
        {/* Arranca con el producto filtrado, si hay uno: suele ser el que se está revisando. */}
        <AjusteStock gymId={gymId} productos={productos} productoInicial={filtroProducto || undefined} />
      </Modal>
    </GlassCard>
  );
}

