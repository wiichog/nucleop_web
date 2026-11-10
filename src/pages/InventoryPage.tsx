import { useState } from "react";
import { Badge, Button, Group, SimpleGrid, Tabs, Text, TextInput } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useErpProducts, usePendingSummary } from "../api/hooks";
import type { ErpProduct } from "../api/types";
import { InventoryLedgerPanel } from "./InventoryLedgerPanel";
import { InventoryValuationPanel } from "./InventoryValuationPanel";
import { PurchaseOrdersPanel } from "./PurchaseOrdersPanel";
import { StoreOrdersPanel } from "./StoreOrdersPanel";
import { SuppliersPanel } from "./SuppliersPanel";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { CountBadge, Money, PageHeader } from "../components/ui";
import { GlassCard, delayVar } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";
import { categoryLabel, porReabastecer, TiendaBadge } from "./inventario/catalogo";
import { FichaProducto } from "./inventario/FichaProducto";
import { ProductoModal } from "./inventario/ProductoModal";

export function InventoryPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const pendientes = usePendingSummary(gymId);
  // La pestaña vive en la URL: así el badge de «pedidos por entregar» y cualquier
  // enlace pueden abrir directamente la vista que resuelve el pendiente. El
  // producto del kardex también, para que «Ver movimientos» llegue filtrado.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "productos";
  const productoKardex = searchParams.get("producto") || "";
  const irA = (t: string, extra: Record<string, string> = {}) =>
    setSearchParams(t !== "productos" ? { tab: t, ...extra } : {}, { replace: true });

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader kicker="Negocio · ERP" title="Inventario" />
      {/* `keepMounted={false}`: cada pestaña dispara sus queries solo al abrirla. */}
      <Tabs value={tab} onChange={(v) => irA(v ?? "productos")} keepMounted={false}>
        <Tabs.List mb="lg" className="a-rise" style={delayVar(0.5)}>
          <Tabs.Tab value="productos">Productos</Tabs.Tab>
          <Tabs.Tab value="pedidos">
            <Group gap={6} wrap="nowrap">
              Pedidos de la tienda
              <CountBadge count={pendientes.data?.pedidos ?? 0} />
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="compras">Compras</Tabs.Tab>
          <Tabs.Tab value="proveedores">Proveedores</Tabs.Tab>
          <Tabs.Tab value="kardex">Movimientos</Tabs.Tab>
          <Tabs.Tab value="valuacion">Valuación</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="productos">
          <ProductosTab gymId={gymId} onVerMovimientos={(p) => irA("kardex", { producto: p.id })} />
        </Tabs.Panel>
        <Tabs.Panel value="pedidos">
          <StoreOrdersPanel gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="compras">
          <PurchaseOrdersPanel gymId={gymId} onIrAProveedores={() => irA("proveedores")} />
        </Tabs.Panel>
        <Tabs.Panel value="proveedores">
          <SuppliersPanel gymId={gymId} />
        </Tabs.Panel>
        <Tabs.Panel value="kardex">
          <InventoryLedgerPanel
            gymId={gymId}
            producto={productoKardex}
            onProducto={(id) => irA("kardex", id ? { producto: id } : {})}
          />
        </Tabs.Panel>
        <Tabs.Panel value="valuacion">
          <InventoryValuationPanel gymId={gymId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

/**
 * El catálogo con su stock al frente. Lo que se está acabando sale en amarillo y
 * primero; tocar un producto abre su ficha (stock, venta, editar, movimientos).
 */
function ProductosTab({ gymId, onVerMovimientos }: { gymId: string; onVerMovimientos: (p: ErpProduct) => void }) {
  const productsQuery = useErpProducts(gymId);
  const productos = productsQuery.data ?? [];
  const [search, setSearch] = useState("");
  const [soloBajo, setSoloBajo] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  // null = cerrado · "nuevo" = alta · un producto = edición.
  const [editando, setEditando] = useState<ErpProduct | "nuevo" | null>(null);

  // Un fallo de carga se veía como "catálogo vacío": el gym volvía a crear
  // productos que ya existían y el stock quedaba duplicado.
  if (productsQuery.isError) {
    return <PageError message="No se pudo cargar el catálogo de productos." onRetry={() => productsQuery.refetch()} />;
  }

  const bajos = productos.filter(porReabastecer).length;
  const term = search.trim().toLowerCase();
  const filas = productos
    .filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || categoryLabel(p.category).toLowerCase().includes(term)) &&
        (!soloBajo || porReabastecer(p)),
    )
    .sort(
      (a, b) =>
        Number(b.is_active) - Number(a.is_active) ||
        Number(porReabastecer(b)) - Number(porReabastecer(a)) ||
        a.name.localeCompare(b.name, "es"),
    );

  // Siempre la versión fresca del producto: la ficha refleja el stock recién movido.
  const ficha = productos.find((p) => p.id === abierto) ?? null;
  const enEdicion = editando && editando !== "nuevo" ? (productos.find((p) => p.id === editando.id) ?? editando) : editando;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Productos"
        avisos={
          bajos > 0 && (
            <Badge
              component="button"
              type="button"
              color="yellow"
              variant={soloBajo ? "filled" : "light"}
              style={{ cursor: "pointer" }}
              aria-pressed={soloBajo}
              onClick={() => setSoloBajo((v) => !v)}
            >
              {bajos} por reabastecer
            </Badge>
          )
        }
      >
        <TextInput
          placeholder="Buscar producto o categoría…"
          aria-label="Buscar producto"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={{ base: "100%", sm: 240 }}
        />
        <Button onClick={() => setEditando("nuevo")}>Nuevo producto</Button>
      </Encabezado>

      {productsQuery.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : filas.length === 0 ? (
        <Text c="dimmed" size="sm" py="md">
          {productos.length
            ? soloBajo && !term
              ? "Nada por reabastecer."
              : "Ningún producto coincide con la búsqueda."
            : "Agrega tu primer producto: suplemento, merch o bebida."}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {filas.map((p) => {
            const bajo = porReabastecer(p);
            return (
              <Tarjeta
                key={p.id}
                etiqueta={`Abrir ${p.name}`}
                onClick={() => setAbierto(p.id)}
                aviso={bajo}
                apagada={!p.is_active}
              >
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  {p.photo && (
                    <img
                      src={p.photo}
                      alt=""
                      style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} truncate>
                      {p.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {categoryLabel(p.category)}
                    </Text>
                  </div>
                  <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                    {p.is_composite ? (
                      <Badge size="xs" color="cyan" variant="light">
                        Receta
                      </Badge>
                    ) : (
                      <>
                        <Text
                          fw={700}
                          className="a-tabular"
                          c={bajo ? "var(--mantine-color-yellow-light-color)" : undefined}
                          lh={1.2}
                        >
                          {p.stock_qty}
                          {bajo ? " ⚠" : ""}
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.2}>
                          en stock
                        </Text>
                      </>
                    )}
                  </div>
                </Group>
                <Group justify="space-between" gap={6} mt={8} wrap="nowrap">
                  <Text size="sm" className="a-tabular">
                    <Money value={p.sale_price} decimals={2} />
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <TiendaBadge p={p} />
                    {!p.is_active && (
                      <Badge size="xs" color="gray" variant="light">
                        Inactivo
                      </Badge>
                    )}
                  </Group>
                </Group>
              </Tarjeta>
            );
          })}
        </SimpleGrid>
      )}

      <FichaProducto
        producto={ficha}
        productos={productos}
        gymId={gymId}
        opened={!!abierto && !editando}
        onClose={() => setAbierto(null)}
        onEditar={(p) => setEditando(p)}
        onVerMovimientos={onVerMovimientos}
      />
      <ProductoModal producto={enEdicion} productos={productos} gymId={gymId} onClose={() => setEditando(null)} />
    </GlassCard>
  );
}
