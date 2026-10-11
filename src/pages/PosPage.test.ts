import { describe, expect, it } from "vitest";
import { ventasDevueltasPorCompleto } from "./PosPage";

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
