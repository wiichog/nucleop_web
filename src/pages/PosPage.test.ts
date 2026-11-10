import { describe, expect, it } from "vitest";
import { ventasDevueltasPorCompleto } from "./PosPage";
import {
  agregarAlCarrito,
  cambiarCantidad,
  categoriasConProductos,
  filtrarProductos,
  lineasParaVenta,
  ordenarVentas,
  sinStock,
  totalCarrito,
} from "./pos/carrito";

const linea = (product: string, qty: number) => ({
  id: `${product}${qty}`,
  product,
  product_name: product,
  qty,
  unit_price: "10.00",
  unit_cost: "5.00",
  subtotal: "0",
});

/**
 * «Devolver» en una venta ya devuelta por completo daba el error del servidor
 * «Esta venta ya fue devuelta por completo.»: el botón no debe ofrecerse.
 */
describe("ventasDevueltasPorCompleto", () => {
  it("marca la venta cuyas devoluciones cubren todas sus unidades", () => {
    const r = ventasDevueltasPorCompleto([
      { id: "dev2", return_of: "v1", lines: [linea("b", -1)] },
      { id: "dev1", return_of: "v1", lines: [linea("a", -2)] },
      { id: "v1", return_of: null, lines: [linea("a", 2), linea("b", 1)] },
    ]);
    expect([...r]).toEqual(["v1"]);
  });

  it("una devolución parcial deja «Devolver» disponible", () => {
    const r = ventasDevueltasPorCompleto([
      { id: "dev1", return_of: "v1", lines: [linea("a", -1)] },
      { id: "v1", return_of: null, lines: [linea("a", 2)] },
      { id: "v2", return_of: null, lines: [linea("a", 1)] },
    ]);
    expect(r.size).toBe(0);
  });

  it("suma líneas repetidas del mismo producto", () => {
    const r = ventasDevueltasPorCompleto([
      { id: "dev1", return_of: "v1", lines: [linea("a", -3)] },
      { id: "v1", return_of: null, lines: [linea("a", 1), linea("a", 2)] },
    ]);
    expect(r.has("v1")).toBe(true);
  });
});

describe("carrito del POS", () => {
  const proteina = { id: "p1", name: "Proteína", sale_price: "25.50" };
  const agua = { id: "p2", name: "Agua", sale_price: "0.10" };

  it("tocar el mismo producto suma unidades en una sola línea", () => {
    let c = agregarAlCarrito([], proteina);
    c = agregarAlCarrito(c, agua);
    c = agregarAlCarrito(c, proteina);
    expect(c).toEqual([
      { product_id: "p1", name: "Proteína", qty: 2, unit_price: "25.50" },
      { product_id: "p2", name: "Agua", qty: 1, unit_price: "0.10" },
    ]);
    // Al servidor solo va producto y cantidad: el precio lo pone él.
    expect(lineasParaVenta(c)).toEqual([
      { product_id: "p1", qty: 2 },
      { product_id: "p2", qty: 1 },
    ]);
  });

  it("cambiar la cantidad a cero (o menos) saca la línea; los decimales se truncan", () => {
    const c = agregarAlCarrito(agregarAlCarrito([], proteina), agua);
    expect(cambiarCantidad(c, "p1", 0).map((l) => l.product_id)).toEqual(["p2"]);
    expect(cambiarCantidad(c, "p1", -3).map((l) => l.product_id)).toEqual(["p2"]);
    expect(cambiarCantidad(c, "p1", 4.7)[0].qty).toBe(4);
    expect(cambiarCantidad(c, "p1", Number.NaN)).toBe(c);
  });

  it("el total va en centavos: tres aguas de Q0.10 son Q0.30, no 0.30000000000000004", () => {
    const c = cambiarCantidad(agregarAlCarrito(agregarAlCarrito([], agua), proteina), "p2", 3);
    expect(totalCarrito(c)).toEqual({ total: 25.8, unidades: 4 });
    expect(totalCarrito([])).toEqual({ total: 0, unidades: 0 });
  });
});

describe("catálogo del POS", () => {
  const prod = (over: Partial<{ name: string; sku: string; category: string; is_active: boolean }>) => ({
    name: "X",
    sku: "",
    category: "other",
    is_active: true,
    ...over,
  });

  it("solo activos, busca por nombre o SKU sin importar acentos, y por categoría", () => {
    const lista = [
      prod({ name: "Proteína whey", sku: "PW-01", category: "supplement" }),
      prod({ name: "Camisa", sku: "CM-1", category: "merch" }),
      prod({ name: "Proteína vieja", category: "supplement", is_active: false }),
    ];
    expect(filtrarProductos(lista, "proteina", null).map((p) => p.name)).toEqual(["Proteína whey"]);
    expect(filtrarProductos(lista, "cm-1", null).map((p) => p.name)).toEqual(["Camisa"]);
    expect(filtrarProductos(lista, "", "merch").map((p) => p.name)).toEqual(["Camisa"]);
    expect(filtrarProductos(lista, "", null).map((p) => p.name)).toEqual(["Camisa", "Proteína whey"]);
    expect(categoriasConProductos(lista)).toEqual(["supplement", "merch"]);
  });

  it("un preparado nunca sale «Sin stock»: se vende de sus insumos", () => {
    expect(sinStock({ is_composite: true, stock_qty: 0 })).toBe(false);
    expect(sinStock({ is_composite: false, stock_qty: 0 })).toBe(true);
    expect(sinStock({ is_composite: false, stock_qty: 3 })).toBe(false);
  });

  it("las ventas van de la más reciente a la más vieja", () => {
    const r = ordenarVentas([
      { id: "a", created_at: "2026-11-01T10:00:00Z" },
      { id: "b", created_at: "2026-11-03T10:00:00Z" },
      { id: "c", created_at: "2026-11-02T10:00:00Z" },
    ]);
    expect(r.map((v) => v.id)).toEqual(["b", "c", "a"]);
  });
});
