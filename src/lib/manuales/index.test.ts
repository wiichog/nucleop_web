import { describe, expect, it } from "vitest";
import layout from "../../components/Layout.tsx?raw";
import { MANUALES, manualDeRuta } from "./index";

describe("manualDeRuta", () => {
  it("encuentra el manual de la pantalla exacta", () => {
    expect(manualDeRuta("/panel/clases")?.titulo).toBe(MANUALES["/panel/clases"].titulo);
  });

  it("ignora la diagonal final", () => {
    expect(manualDeRuta("/panel/clases/")?.titulo).toBe(MANUALES["/panel/clases"].titulo);
  });

  it("una subpantalla usa el manual de su listado", () => {
    expect(manualDeRuta("/panel/clases/123")?.titulo).toBe(MANUALES["/panel/clases"].titulo);
  });

  it("no confunde prefijos que no son una subruta", () => {
    expect(manualDeRuta("/panel/clasesx")).toBeNull();
  });

  it("devuelve null en una pantalla sin manual", () => {
    expect(manualDeRuta("/panel/no-existe")).toBeNull();
  });

  it("las relacionadas apuntan a pantallas del panel", () => {
    for (const m of Object.values(MANUALES)) {
      for (const r of m.relacionadas ?? []) expect(r.href.startsWith("/panel")).toBe(true);
    }
  });

  it("cada pantalla del menú tiene su manual", () => {
    // Las rutas salen del propio menú: una pantalla nueva sin manual rompe aquí.
    const rutas = [...layout.matchAll(/to: "(\/panel[^"]*)"/g)].map((m) => m[1]);
    expect(rutas.length).toBeGreaterThan(20);
    const sinManual = rutas.filter((r) => !MANUALES[r]);
    expect(sinManual).toEqual([]);
  });

  it("el Dashboard no se cuela en pantallas sin manual", () => {
    expect(manualDeRuta("/panel")?.titulo).toBe(MANUALES["/panel"].titulo);
    expect(manualDeRuta("/panel/otra-cosa")).toBeNull();
  });
});
