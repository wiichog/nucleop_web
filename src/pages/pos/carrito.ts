import type { ErpProduct, ErpSale } from "../../api/types";

/**
 * Lo que el POS hace del lado del panel: armar el carrito y encontrar el
 * producto. El cobro, el stock y los insumos de un preparado los decide el
 * servidor; aquí solo se arma la lista que se le manda.
 */

export interface LineaCarrito {
  product_id: string;
  name: string;
  qty: number;
  unit_price: string;
}

/** Tocar un producto que ya está en el carrito le suma una unidad: no repite la línea. */
export function agregarAlCarrito(
  carrito: LineaCarrito[],
  producto: Pick<ErpProduct, "id" | "name" | "sale_price">,
  cantidad = 1,
): LineaCarrito[] {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return carrito;
  const existe = carrito.some((l) => l.product_id === producto.id);
  if (existe) {
    return carrito.map((l) => (l.product_id === producto.id ? { ...l, qty: l.qty + cantidad } : l));
  }
  return [
    ...carrito,
    { product_id: producto.id, name: producto.name, qty: cantidad, unit_price: producto.sale_price },
  ];
}

/** Cantidad nueva de una línea; en cero o menos, la línea sale del carrito. */
export function cambiarCantidad(carrito: LineaCarrito[], productId: string, qty: number): LineaCarrito[] {
  if (!Number.isFinite(qty)) return carrito;
  const entera = Math.floor(qty);
  if (entera <= 0) return carrito.filter((l) => l.product_id !== productId);
  return carrito.map((l) => (l.product_id === productId ? { ...l, qty: entera } : l));
}

/**
 * Total del carrito a precio de venta, en centavos para no arrastrar el error de
 * coma flotante (0.1 + 0.2). Es lo que se le dice al cliente; el cobro real lo
 * calcula el servidor con los mismos precios.
 */
export function totalCarrito(carrito: LineaCarrito[]): { total: number; unidades: number } {
  let centavos = 0;
  let unidades = 0;
  for (const l of carrito) {
    centavos += Math.round(Number(l.unit_price || 0) * 100) * l.qty;
    unidades += l.qty;
  }
  return { total: centavos / 100, unidades };
}

/** Lo que va en el cuerpo de la venta: solo producto y cantidad. */
export function lineasParaVenta(carrito: LineaCarrito[]): { product_id: string; qty: number }[] {
  return carrito.map((l) => ({ product_id: l.product_id, qty: l.qty }));
}

/** Mismas categorías que Inventario (el servidor guarda la llave). */
export const CATEGORIAS_PRODUCTO: Record<string, string> = {
  supplement: "Suplemento",
  merch: "Merch / Ropa",
  drink: "Bebida / Comida",
  gear: "Equipamiento",
  service: "Servicio",
  other: "Otro",
};

const sinAcentos = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Productos que se ofrecen en la caja: solo los activos, filtrados por lo que se
 * escribe (nombre o SKU, sin importar acentos) y por categoría. Ordenados por nombre.
 */
export function filtrarProductos<P extends Pick<ErpProduct, "name" | "sku" | "category" | "is_active">>(
  productos: P[],
  texto: string,
  categoria: string | null,
): P[] {
  const t = sinAcentos(texto);
  return productos
    .filter((p) => p.is_active)
    .filter((p) => !categoria || p.category === categoria)
    .filter((p) => !t || sinAcentos(p.name).includes(t) || sinAcentos(p.sku ?? "").includes(t))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * Sin existencias. Un preparado (licuado) no lleva stock propio: se vende de sus
 * insumos, así que nunca se marca.
 */
export function sinStock(p: Pick<ErpProduct, "is_composite" | "stock_qty">): boolean {
  return !p.is_composite && p.stock_qty <= 0;
}

/** Categorías que de verdad tienen productos activos, en el orden del catálogo. */
export function categoriasConProductos(productos: Pick<ErpProduct, "category" | "is_active">[]): string[] {
  const hay = new Set(productos.filter((p) => p.is_active).map((p) => p.category));
  const conocidas = Object.keys(CATEGORIAS_PRODUCTO).filter((c) => hay.has(c));
  const otras = [...hay].filter((c) => !(c in CATEGORIAS_PRODUCTO)).sort();
  return [...conocidas, ...otras];
}

/** La venta más reciente primero (la lista del servidor no garantiza el orden). */
export function ordenarVentas<S extends Pick<ErpSale, "created_at">>(ventas: S[]): S[] {
  return ventas.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** «Proteína ×2, Agua ×1»: las devoluciones traen cantidades negativas. */
export function resumenLineas(venta: Pick<ErpSale, "lines">): string {
  return venta.lines.map((l) => `${l.product_name} ×${Math.abs(l.qty)}`).join(", ");
}
