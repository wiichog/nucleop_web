import { useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Affix,
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useBranches,
  useCreateErpSale,
  useErpProducts,
  useErpSales,
  useMemberships,
  useReturnErpSale,
} from "../api/hooks";
import type { ErpProduct, ErpSale } from "../api/types";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { Money, PageHeader } from "../components/ui";
import { FilterChip, GlassCard } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";
import {
  agregarAlCarrito,
  cambiarCantidad,
  CATEGORIAS_PRODUCTO,
  categoriasConProductos,
  filtrarProductos,
  lineasParaVenta,
  ordenarVentas,
  resumenLineas,
  sinStock,
  totalCarrito,
  type LineaCarrito,
} from "./pos/carrito";
import { esDevolucion, fechaVenta, VentaModal } from "./pos/VentaModal";

/**
 * Ventas que ya se devolvieron por completo: cada producto vendido ya regresó
 * todas sus unidades sumando sus devoluciones (filas con `return_of`). El
 * servidor rechaza devolverlas otra vez («Esta venta ya fue devuelta por
 * completo.»), así que su botón «Devolver» no se ofrece. La lista trae todas las
 * páginas, así que las devoluciones de cada venta visible vienen en ella.
 */
export function ventasDevueltasPorCompleto(sales: Pick<ErpSale, "id" | "return_of" | "lines">[]): Set<string> {
  const devuelto = new Map<string, Map<string, number>>();
  for (const s of sales) {
    if (!s.return_of) continue;
    const porProducto = devuelto.get(s.return_of) ?? new Map<string, number>();
    for (const l of s.lines) porProducto.set(l.product, (porProducto.get(l.product) ?? 0) + Math.abs(l.qty));
    devuelto.set(s.return_of, porProducto);
  }
  const out = new Set<string>();
  for (const s of sales) {
    const porProducto = devuelto.get(s.id);
    if (s.return_of || !porProducto || !s.lines.length) continue;
    // Una venta puede repetir producto en varias líneas: se compara por producto.
    const vendido = new Map<string, number>();
    for (const l of s.lines) vendido.set(l.product, (vendido.get(l.product) ?? 0) + l.qty);
    if ([...vendido].every(([pid, qty]) => (porProducto.get(pid) ?? 0) >= qty)) out.add(s.id);
  }
  return out;
}

type Metodo = "cash" | "card" | "bank_transfer";

const METODOS: { value: Metodo; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "bank_transfer", label: "Transferencia" },
];

/** Ventas que se ven de entrada; el resto, con «Ver más». */
const VENTAS_POR_TANDA = 15;

export function PosPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const productsQuery = useErpProducts(gymId);
  const salesQuery = useErpSales(gymId);
  const { data: branches } = useBranches(gymId);
  const { data: members } = useMemberships(gymId);
  const createSale = useCreateErpSale(gymId);
  const returnSale = useReturnErpSale(gymId);

  const sales = salesQuery.data;
  const devueltas = useMemo(() => ventasDevueltasPorCompleto(sales ?? []), [sales]);
  const ventas = useMemo(() => ordenarVentas(sales ?? []), [sales]);

  const athleteOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const m of members ?? []) {
      if (m.athlete && !seen.has(m.athlete)) {
        seen.add(m.athlete);
        opts.push({ value: m.athlete, label: m.athlete_name || m.athlete.slice(0, 8) });
      }
    }
    return opts;
  }, [members]);

  const [cart, setCart] = useState<LineaCarrito[]>([]);
  const [buscar, setBuscar] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState("");
  const [branchId, setBranchId] = useState<string | null>("");
  const [method, setMethod] = useState<Metodo>("cash");
  const [error, setError] = useState("");
  const [ventaAbierta, setVentaAbierta] = useState<ErpSale | null>(null);
  const [mostrar, setMostrar] = useState(VENTAS_POR_TANDA);
  const ticketRef = useRef<HTMLDivElement>(null);

  const { total, unidades } = totalCarrito(cart);
  const productos = productsQuery.data ?? [];
  const categorias = categoriasConProductos(productos);
  const visibles = filtrarProductos(productos, buscar, categoria);
  const enCarrito = (id: string) => cart.find((l) => l.product_id === id)?.qty ?? 0;

  const agregar = (p: ErpProduct) => {
    setError("");
    setCart((prev) => agregarAlCarrito(prev, p));
  };

  const submit = async () => {
    setError("");
    try {
      await createSale.mutateAsync({
        athlete_id: athleteId.trim() || null,
        branch_id: branchId || null,
        method,
        lines: lineasParaVenta(cart),
      });
      setCart([]);
      setAthleteId("");
      // Sin este aviso solo se vaciaba el carrito y recepción no sabía si cobró.
      notifications.show({ color: "teal", message: "Venta registrada." });
    } catch (e: unknown) {
      // errMsg lee `detail` y también los errores de campo de DRF (p. ej. `qty`),
      // y SIEMPRE devuelve string (renderizar un objeto tronaba el panel).
      setError(errMsg(e, "No se pudo registrar la venta."));
    }
  };

  const devolver = (s: ErpSale) => {
    returnSale
      .mutateAsync({ id: s.id })
      .then(() => {
        notifications.show({ color: "teal", message: "Devolución registrada." });
        setVentaAbierta(null);
      })
      .catch((e: unknown) => {
        notifications.show({
          color: "red",
          message: errMsg(e, "No se pudo registrar la devolución."),
        });
      });
  };

  const nombreAtleta = (id: string | null) =>
    id ? (athleteOptions.find((o) => o.value === id)?.label ?? null) : null;

  if (!gymId) return <NoGymAssigned />;
  // Sin catálogo no hay venta posible: antes el selector quedaba vacío y recepción
  // creía que el gym no tenía productos en vez de ver que la carga falló.
  if (productsQuery.isError)
    return (
      <PageError
        message="No se pudo cargar el catálogo de productos: no se puede cobrar hasta que vuelva."
        onRetry={() => productsQuery.refetch()}
      />
    );
  if (productsQuery.isLoading) return <PageLoading />;

  const hayActivos = productos.some((p) => p.is_active);

  return (
    // En celular el ticket queda abajo: se deja aire para la barra de cobro fija.
    <Box pb={{ base: cart.length ? 84 : 0, md: 0 }}>
      <PageHeader kicker="Negocio · ERP" title="Punto de venta" />

      <Grid gutter="md" align="flex-start">
        {/* Lo que se toca: los productos, grandes, para cobrar de pie. */}
        <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
          <GlassCard padding={18} delay={0.6}>
            <Encabezado titulo="Productos" />
            {!hayActivos ? (
              <Stack align="flex-start" gap="xs" py="md">
                <Text c="dimmed" size="sm">
                  Aún no tienes productos a la venta.
                </Text>
                <Button component={Link} to="/panel/inventario" variant="light">
                  Agregar productos
                </Button>
              </Stack>
            ) : (
              <>
                <TextInput
                  aria-label="Buscar producto"
                  placeholder="Buscar producto o SKU"
                  leftSection={<Search size={16} />}
                  value={buscar}
                  onChange={(e) => setBuscar(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    // Con lector de código: escribe el SKU, Enter y queda en el carrito.
                    if (e.key === "Enter" && visibles.length === 1) {
                      agregar(visibles[0]);
                      setBuscar("");
                    }
                  }}
                  size="md"
                  mb="sm"
                />
                {categorias.length > 1 && (
                  <Group gap={6} mb="sm" wrap="nowrap" style={{ overflowX: "auto" }}>
                    <FilterChip active={!categoria} onClick={() => setCategoria(null)}>
                      Todos
                    </FilterChip>
                    {categorias.map((c) => (
                      <FilterChip
                        key={c}
                        active={categoria === c}
                        onClick={() => setCategoria(categoria === c ? null : c)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {CATEGORIAS_PRODUCTO[c] ?? c}
                      </FilterChip>
                    ))}
                  </Group>
                )}
                {visibles.length === 0 ? (
                  <Text c="dimmed" size="sm" py="md">
                    Ningún producto coincide.
                  </Text>
                ) : (
                  <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="sm">
                    {visibles.map((p) => {
                      const qty = enCarrito(p.id);
                      const agotado = sinStock(p);
                      return (
                        <Tarjeta
                          key={p.id}
                          etiqueta={`Agregar ${p.name}, ${fmtQ(p.sale_price, { decimals: 2 })}${qty ? `, ${qty} en el carrito` : ""}`}
                          onClick={() => agregar(p)}
                          aviso={agotado}
                          style={{
                            minHeight: 96,
                            outline: qty ? "2px solid var(--mantine-color-flame-filled)" : undefined,
                            outlineOffset: -2,
                          }}
                        >
                          {p.photo && (
                            <img
                              src={p.photo}
                              alt=""
                              style={{
                                width: "100%",
                                height: 64,
                                objectFit: "cover",
                                borderRadius: 6,
                                marginBottom: 6,
                                display: "block",
                              }}
                            />
                          )}
                          <Group justify="space-between" align="flex-start" gap={4} wrap="nowrap">
                            <Text fw={600} size="sm" lineClamp={2}>
                              {p.name}
                            </Text>
                            {qty > 0 && (
                              <Badge color="flame" variant="filled" size="sm" style={{ flex: "0 0 auto" }}>
                                ×{qty}
                              </Badge>
                            )}
                          </Group>
                          <Text fw={700} mt={4} className="a-tabular">
                            <Money value={p.sale_price} decimals={2} />
                          </Text>
                          <Text
                            size="xs"
                            c={agotado ? "var(--mantine-color-yellow-light-color)" : "dimmed"}
                            fw={agotado ? 700 : 400}
                          >
                            {p.is_composite ? "Preparado" : agotado ? "Sin stock" : `${p.stock_qty} en stock`}
                          </Text>
                        </Tarjeta>
                      );
                    })}
                  </SimpleGrid>
                )}
              </>
            )}
          </GlassCard>
        </Grid.Col>

        {/* El ticket: lo que lleva, cuánto es, con qué paga y cobrar. Siempre a la vista. */}
        <Grid.Col
          span={{ base: 12, md: 5, lg: 4 }}
          style={{ position: "sticky", top: "calc(var(--a-header-h) + 12px)" }}
        >
          <GlassCard ref={ticketRef} variant="core" padding={18} delay={0.7}>
            <Encabezado titulo="Venta">
              {cart.length > 0 && (
                <Button variant="subtle" color="gray" size="xs" onClick={() => setCart([])}>
                  Vaciar
                </Button>
              )}
            </Encabezado>

            {cart.length === 0 ? (
              <Text c="dimmed" size="sm" py="sm">
                Toca un producto para agregarlo.
              </Text>
            ) : (
              <Stack gap={8}>
                {cart.map((l) => (
                  <Group key={l.product_id} gap="xs" wrap="nowrap" align="center">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {l.name}
                      </Text>
                      <Text size="xs" c="dimmed" className="a-tabular">
                        {fmtQ(l.unit_price, { decimals: 2 })} c/u
                      </Text>
                    </div>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon
                        variant="default"
                        size="lg"
                        aria-label={`Quitar una unidad de ${l.name}`}
                        onClick={() => setCart((prev) => cambiarCantidad(prev, l.product_id, l.qty - 1))}
                      >
                        <Minus size={16} />
                      </ActionIcon>
                      <NumberInput
                        aria-label={`Cantidad de ${l.name}`}
                        value={l.qty}
                        min={1}
                        allowDecimal={false}
                        hideControls
                        w={52}
                        styles={{ input: { textAlign: "center" } }}
                        // Al tocarlo queda seleccionado: se escribe el número nuevo encima.
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(v) => {
                          const n = typeof v === "number" ? v : Number(v);
                          // Borrar el número para escribir otro no debe sacar la línea.
                          if (Number.isFinite(n) && n > 0) setCart((prev) => cambiarCantidad(prev, l.product_id, n));
                        }}
                      />
                      <ActionIcon
                        variant="default"
                        size="lg"
                        aria-label={`Agregar una unidad de ${l.name}`}
                        onClick={() => setCart((prev) => cambiarCantidad(prev, l.product_id, l.qty + 1))}
                      >
                        <Plus size={16} />
                      </ActionIcon>
                    </Group>
                    <Text size="sm" fw={600} w={78} ta="right" className="a-tabular">
                      {fmtQ(Math.round(Number(l.unit_price) * 100 * l.qty) / 100, { decimals: 2 })}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="lg"
                      aria-label={`Quitar ${l.name}`}
                      onClick={() => setCart((prev) => cambiarCantidad(prev, l.product_id, 0))}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            )}

            <Divider my="md" />
            <Group justify="space-between" align="baseline">
              <Text c="dimmed" size="sm">
                Total{cart.length ? ` · ${unidades} ${unidades === 1 ? "unidad" : "unidades"}` : ""}
              </Text>
              <Text fz={28} fw={700} className="a-tabular" aria-live="polite">
                {fmtQ(total, { decimals: 2 })}
              </Text>
            </Group>

            <Stack gap="sm" mt="md">
              <SegmentedControl
                aria-label="Método de pago"
                fullWidth
                size="md"
                value={method}
                onChange={(v) => setMethod(v as Metodo)}
                data={METODOS}
              />
              <Select
                aria-label="Atleta"
                placeholder="Sin atleta"
                value={athleteId || null}
                onChange={(v) => setAthleteId(v ?? "")}
                data={athleteOptions}
                searchable
                clearable
                nothingFoundMessage="Sin coincidencias"
              />
              {(branches ?? []).length > 0 && (
                <Select
                  aria-label="Sede"
                  placeholder="Sin sede"
                  value={branchId}
                  onChange={setBranchId}
                  clearable
                  data={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
                />
              )}
              {/* Botón grande: en recepción se cobra de pie y con prisa. */}
              <Button size="lg" fullWidth onClick={submit} disabled={cart.length === 0} loading={createSale.isPending}>
                {cart.length ? `Cobrar ${fmtQ(total, { decimals: 2 })}` : "Cobrar"}
              </Button>
              {error && (
                <Text c="red" size="sm" role="alert">
                  {error}
                </Text>
              )}
            </Stack>
          </GlassCard>
        </Grid.Col>
      </Grid>

      <GlassCard padding={18} delay={0.8} style={{ marginTop: 16 }}>
        <Encabezado titulo="Ventas" />
        {salesQuery.isError ? (
          <PageError message="No se pudieron cargar las ventas." onRetry={() => salesQuery.refetch()} />
        ) : salesQuery.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : ventas.length === 0 ? (
          <Text c="dimmed" size="sm">
            Aún no hay ventas.
          </Text>
        ) : (
          <Stack gap={6}>
            {ventas.slice(0, mostrar).map((s) => {
              const dev = esDevolucion(s);
              return (
                <Tarjeta
                  key={s.id}
                  etiqueta={`${dev ? "Devolución" : "Venta"} del ${fechaVenta(s.created_at)} por ${fmtQ(s.total, { decimals: 2 })}`}
                  onClick={() => setVentaAbierta(s)}
                  apagada={!dev && devueltas.has(s.id)}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Text size="sm" c="dimmed" w={104} className="a-tabular" style={{ flex: "0 0 auto" }}>
                      {fechaVenta(s.created_at)}
                    </Text>
                    <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                      {resumenLineas(s)}
                    </Text>
                    {dev && (
                      <Badge size="xs" color="orange" variant="light">
                        Devolución
                      </Badge>
                    )}
                    {!dev && devueltas.has(s.id) && (
                      <Badge size="xs" color="gray" variant="light">
                        Devuelta
                      </Badge>
                    )}
                    <Text size="sm" fw={600} ta="right" className="a-tabular" style={{ flex: "0 0 auto" }}>
                      <Money value={s.total} decimals={2} c={dev ? "orange" : undefined} />
                    </Text>
                  </Group>
                </Tarjeta>
              );
            })}
            {ventas.length > mostrar && (
              <Group justify="center" mt={4}>
                <Button variant="subtle" onClick={() => setMostrar((n) => n + VENTAS_POR_TANDA)}>
                  Ver más
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </GlassCard>

      <VentaModal
        venta={ventaAbierta}
        devuelta={!!ventaAbierta && devueltas.has(ventaAbierta.id)}
        atleta={ventaAbierta ? nombreAtleta(ventaAbierta.athlete) : null}
        devolviendo={returnSale.isPending}
        onDevolver={devolver}
        onClose={() => setVentaAbierta(null)}
      />

      {/* Celular: el ticket queda abajo de los productos; esta barra lo trae a la vista. */}
      {cart.length > 0 && (
        <Affix position={{ bottom: 12, left: 12, right: 12 }} zIndex={150}>
          <Box hiddenFrom="md">
            <Button
              size="lg"
              fullWidth
              onClick={() => ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Ver venta · {unidades} · {fmtQ(total, { decimals: 2 })}
            </Button>
          </Box>
        </Affix>
      )}
    </Box>
  );
}
