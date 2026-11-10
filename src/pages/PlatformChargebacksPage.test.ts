import { describe, expect, it } from "vitest";
import pagina from "./PlatformChargebacksPage.tsx?raw";
import { MANUALES } from "../lib/manuales";
import type { Chargeback } from "../api/types";
import { ordenarContracargos, resumirContracargos } from "./PlatformChargebacksPage";

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

/** Lo que vienes a ver va al frente: lo abierto primero, el que vence antes arriba. */
describe("Contracargos: orden de la lista", () => {
  it("abiertos primero por fecha límite (sin fecha al final) y luego lo resuelto, lo más reciente arriba", () => {
    const caso = (id: string, status: string, created_at: string, evidence_due_at: string | null = null) =>
      ({ id, status, created_at, evidence_due_at }) as unknown as Chargeback;
    const orden = ordenarContracargos([
      caso("ganado-viejo", "won", "2026-09-01T10:00:00Z"),
      caso("abierto-sin-fecha", "open", "2026-10-01T10:00:00Z"),
      caso("perdido-nuevo", "lost", "2026-10-20T10:00:00Z"),
      caso("evidencia-vence-pronto", "submitted", "2026-10-05T10:00:00Z", "2026-11-12T00:00:00Z"),
      caso("abierto-vence-luego", "open", "2026-10-03T10:00:00Z", "2026-11-30T00:00:00Z"),
    ]).map((c) => c.id);
    expect(orden).toEqual([
      "evidencia-vence-pronto",
      "abierto-vence-luego",
      "abierto-sin-fecha",
      "perdido-nuevo",
      "ganado-viejo",
    ]);
  });
});
