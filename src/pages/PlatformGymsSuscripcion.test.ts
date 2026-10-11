import { describe, expect, it } from "vitest";
import { motivoSuscripcionSinMonto } from "./PlatformGymsPage";

// El servidor exige el monto para guardar la suscripción: sin él, el front no
// puede avisar «Gimnasio actualizado.» como si el estado o la fecha se hubieran guardado.
describe("motivoSuscripcionSinMonto", () => {
  const base = { monthlyPrice: "", teniaSuscripcion: false, status: "active", nextBillingDate: null };

  it("deja guardar si hay monto", () => {
    expect(motivoSuscripcionSinMonto({ ...base, monthlyPrice: "299", status: "paused" })).toBeNull();
  });

  it("deja guardar sin monto si no se tocó la suscripción y no existía", () => {
    expect(motivoSuscripcionSinMonto(base)).toBeNull();
  });

  it("frena si cambiaron el estado sin monto", () => {
    expect(motivoSuscripcionSinMonto({ ...base, status: "paused" })).toMatch("Suscripción mensual");
  });

  it("frena si pusieron próximo cobro sin monto", () => {
    expect(
      motivoSuscripcionSinMonto({ ...base, nextBillingDate: new Date("2026-11-01") }),
    ).toMatch("Próximo cobro");
  });

  it("frena si vaciaron el monto de una suscripción existente", () => {
    expect(motivoSuscripcionSinMonto({ ...base, monthlyPrice: "  ", teniaSuscripcion: true })).toMatch(
      "ya tiene suscripción",
    );
  });
});
