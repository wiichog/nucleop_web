import { describe, expect, it } from "vitest";
import pagina from "./PlatformChargebacksPage.tsx?raw";
import { MANUALES } from "../lib/manuales";
import type { Chargeback } from "../api/types";
import { resumirContracargos } from "./PlatformChargebacksPage";

/**
 * Quién absorbe un contracargo lo decide el backend: el `Payment` negativo se resta
 * del depósito del gym en `calcular_estado_cuenta` (`net_to_deposit = base + base_dev`)
 * y Nucleo pierde su recargo. La pantalla llegó a decir en el subtítulo que la pérdida
 * era de Nucleo y en la ventana que era del gym; esto evita que vuelva a contradecirse.
 */
describe("Contracargos: quién absorbe la pérdida", () => {
  const manual = JSON.stringify(MANUALES["/panel/plataforma/contracargos"]);

  it("ni la pantalla ni el manual dicen que Nucleo absorbe la pérdida", () => {
    expect(pagina).not.toMatch(/lo absorbe Nucleo/);
    expect(manual).not.toMatch(/lo absorbe Nucleo/);
  });

  it("los dos dicen que la cuota sale del depósito del gimnasio", () => {
    expect(pagina).toMatch(/próximo depósito del gimnasio/);
    expect(manual).toMatch(/próximo depósito/);
  });
});

/**
 * Los contadores salen del total de la red, no del filtro de «Expedientes»: con
 * «Ganados» marcaban 0 en disputa aunque hubiera casos abiertos.
 */
describe("Contracargos: los contadores no dependen del filtro", () => {
  it("la pantalla calcula los contadores sobre la consulta sin filtro", () => {
    expect(pagina).toMatch(/usePlatformChargebacks\(\{\}, isSuperuser\)/);
    expect(pagina).toMatch(/resumirContracargos\(todos\.data/);
  });

  it("suma sólo lo abierto como en disputa y lo perdido como pérdida firme", () => {
    const caso = (status: string, total_lost: string) =>
      ({ status, total_lost }) as unknown as Chargeback;
    const r = resumirContracargos([
      caso("open", "100.00"),
      caso("submitted", "50.50"),
      caso("won", "999.00"),
      caso("lost", "30.00"),
    ]);
    expect(r).toEqual({ expuesto: 150.5, sinResolver: 2, perdido: 30 });
  });

  it("el manual avisa que los contadores no dependen del filtro", () => {
    const manual = JSON.stringify(MANUALES["/panel/plataforma/contracargos"]);
    expect(manual).toMatch(/sin importar qué filtro/);
  });
});
