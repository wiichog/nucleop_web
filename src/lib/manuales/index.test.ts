import { describe, expect, it } from "vitest";
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
});
