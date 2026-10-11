import { describe, expect, it } from "vitest";
import { sumarGastosVigentes } from "./ExpensesPage";

/**
 * «Suma de los gastos listados» con «Estado: Todos». Una corrección deja el
 * original anulado y crea uno nuevo: si se sumaran los dos, el gasto contaría doble.
 */
describe("sumarGastosVigentes", () => {
  it("no suma anulados ni corregidos", () => {
    const r = sumarGastosVigentes([
      { amount: "100.00", is_void: false }, // vigente
      { amount: "500.00", is_void: true }, // original corregido
      { amount: "450.00", is_void: false }, // la corrección
      { amount: "80.00", is_void: true }, // anulado
    ]);
    expect(r).toEqual({ total: 550, vigentes: 2, fuera: 2 });
  });

  it("con solo anulados la suma es cero", () => {
    expect(sumarGastosVigentes([{ amount: "80.00", is_void: true }])).toEqual({
      total: 0,
      vigentes: 0,
      fuera: 1,
    });
  });
});
