import { describe, expect, it } from "vitest";
import { fmtQ } from "../lib/money";
import type { ErpExpense } from "../api/types";
import { mensajeCorreccion, sumarGastosVigentes } from "./ExpensesPage";
import {
  faltaComprobante,
  fechaCorta,
  filtrarGastos,
  ordenarGastos,
  periodosDisponibles,
  TODO,
} from "./gastos/gastos";

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

describe("mensajeCorreccion", () => {
  it("muestra el monto nuevo en quetzales, no el texto crudo del API", () => {
    const m = mensajeCorreccion("1500.00");
    // El espacio tras la «Q» depende del motor de Intl: se compara contra fmtQ.
    expect(m).toContain(`por ${fmtQ(1500, { decimals: 2 })}.`);
    expect(m).toMatch(/Q\s?1,500\.00/);
    expect(m).not.toContain("por 1500.00");
  });
});

const gasto = (over: Partial<ErpExpense>): ErpExpense => ({
  id: "g",
  branch: null,
  category: "rent",
  amount: "100.00",
  description: "",
  incurred_on: "2026-11-05",
  proof_url: "",
  proof_file: "",
  is_void: false,
  voided_at: null,
  void_reason: "",
  replaces: null,
  replaced_by: null,
  created_at: "2026-11-05T10:00:00Z",
  ...over,
});

describe("periodo de Gastos", () => {
  const hoy = new Date(2026, 10, 10); // 10 de noviembre de 2026

  it("ofrece el mes actual aunque no tenga gastos, los meses con gastos y «Todo el historial»", () => {
    const p = periodosDisponibles(
      [gasto({ incurred_on: "2026-09-30" }), gasto({ incurred_on: "2026-10-02" }), gasto({ incurred_on: "2026-10-20" })],
      hoy,
    );
    expect(p.map((x) => x.value)).toEqual(["2026-11", "2026-10", "2026-09", TODO]);
    expect(p[0].label).toBe("Noviembre 2026");
  });

  it("filtra por mes, texto (descripción o categoría) y comprobante pendiente", () => {
    const lista = [
      gasto({ id: "luz", category: "utilities", description: "Luz", incurred_on: "2026-11-02" }),
      gasto({ id: "renta", category: "rent", incurred_on: "2026-11-01", proof_file: "https://x/f.pdf" }),
      gasto({ id: "oct", incurred_on: "2026-10-28" }),
      gasto({ id: "anulado", incurred_on: "2026-11-03", is_void: true }),
    ];
    const ids = (g: ErpExpense[]) => g.map((x) => x.id);
    expect(ids(filtrarGastos(lista, { periodo: "2026-11", texto: "" }))).toEqual(["luz", "renta", "anulado"]);
    expect(ids(filtrarGastos(lista, { periodo: TODO, texto: "renta" }))).toEqual(["renta", "oct", "anulado"]);
    expect(ids(filtrarGastos(lista, { periodo: "2026-11", texto: "servicios" }))).toEqual(["luz"]);
    // Un anulado no tiene nada pendiente: no cuenta como «sin comprobante».
    expect(ids(filtrarGastos(lista, { periodo: "2026-11", texto: "", soloSinComprobante: true }))).toEqual(["luz"]);
    expect(faltaComprobante(lista[3])).toBe(false);
  });

  it("ordena por fecha (el mismo día, el último registrado arriba) o por monto", () => {
    const lista = [
      gasto({ id: "a", incurred_on: "2026-11-02", amount: "50.00", created_at: "2026-11-02T08:00:00Z" }),
      gasto({ id: "b", incurred_on: "2026-11-05", amount: "10.00" }),
      gasto({ id: "c", incurred_on: "2026-11-02", amount: "900.00", created_at: "2026-11-02T09:00:00Z" }),
    ];
    expect(ordenarGastos(lista, "recientes").map((g) => g.id)).toEqual(["b", "c", "a"]);
    expect(ordenarGastos(lista, "monto").map((g) => g.id)).toEqual(["c", "a", "b"]);
  });

  it("la fecha corta lleva año solo si no es el de hoy", () => {
    expect(fechaCorta("2026-11-05", hoy)).not.toMatch(/2026/);
    expect(fechaCorta("2025-11-05", hoy)).toMatch(/2025/);
  });
});
