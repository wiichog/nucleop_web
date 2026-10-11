import { describe, expect, it } from "vitest";
import { fechaIso, motivoPeriodoInvalido } from "./periodo";

describe("motivoPeriodoInvalido", () => {
  it("acepta un periodo normal y uno de un solo día", () => {
    expect(motivoPeriodoInvalido(new Date(2026, 9, 1), new Date(2026, 9, 11))).toBeNull();
    expect(motivoPeriodoInvalido(new Date(2026, 9, 5, 18), new Date(2026, 9, 5, 8))).toBeNull();
  });

  it("pide las fechas cuando falta alguna", () => {
    const sinHasta = motivoPeriodoInvalido(new Date(2026, 9, 1), null);
    expect(sinHasta?.mensaje).toContain("«Desde» y la fecha «Hasta»");
    expect(sinHasta?.hasta).toBeTruthy();
    expect(sinHasta?.desde).toBeUndefined();
    expect(motivoPeriodoInvalido(null, null)?.desde).toBeTruthy();
  });

  it("rechaza «Desde» posterior a «Hasta»", () => {
    const m = motivoPeriodoInvalido(new Date(2026, 9, 12), new Date(2026, 9, 11));
    expect(m?.mensaje).toContain("posterior");
    expect(m?.desde).toBeTruthy();
  });
});

describe("fechaIso", () => {
  it("da la fecha local o vacío", () => {
    expect(fechaIso(new Date(2026, 0, 3))).toBe("2026-01-03");
    expect(fechaIso(null)).toBe("");
  });
});
