import { describe, expect, it } from "vitest";
import pagina from "./PlatformChargebacksPage.tsx?raw";
import { MANUALES } from "../lib/manuales";

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
