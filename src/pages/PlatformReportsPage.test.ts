import { describe, expect, it } from "vitest";
import pagina from "./PlatformReportsPage.tsx?raw";
import { MANUALES } from "../lib/manuales";
import { ESTADOS, FILTROS_ESTADO } from "./PlatformReportsPage";

/**
 * Reportes del app: cada estado que se puede elegir en «Triage» tiene su filtro
 * rápido (antes «Triaged», «Cerrado» y «Descartado» sólo se veían en «Todos»), y
 * cambiar el estado ya no cierra el detalle de golpe.
 */
describe("Reportes del app: filtros y detalle", () => {
  const manual = JSON.stringify(MANUALES["/panel/plataforma/reportes"]);

  it("hay un filtro rápido por cada estado, además de «Abiertos» y «Todos»", () => {
    const filtros = FILTROS_ESTADO.map((f) => f.value);
    for (const e of ESTADOS) expect(filtros).toContain(e.value);
    expect(filtros).toContain("open");
    expect(filtros).toContain("all");
  });

  it("el manual nombra todos los filtros de estado", () => {
    for (const f of FILTROS_ESTADO) expect(manual).toContain(`«${f.label}»`);
  });

  it("el detalle sigue al id seleccionado, no a la fila filtrada", () => {
    expect(pagina).toMatch(/<DetalleReporte reportId=\{selectedId\}/);
    expect(manual).not.toMatch(/el detalle se cierra/);
  });
});
