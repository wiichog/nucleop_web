import { describe, expect, it } from "vitest";
import type { GymAdmin } from "../api/types";
import { etiquetaDe, motivoSuscripcionSinMonto, ordenarGyms } from "./PlatformGymsPage";
import { faltaSuscripcion, pctTexto } from "./plataforma/contrato";

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

// La tabla muestra «Starter» y «Activa», no los valores crudos del servidor.
describe("etiquetaDe", () => {
  const opciones = [
    { value: "starter", label: "Starter" },
    { value: "active", label: "Activa" },
  ];

  it("traduce el valor a la etiqueta del formulario", () => {
    expect(etiquetaDe(opciones, "starter")).toBe("Starter");
    expect(etiquetaDe(opciones, "active")).toBe("Activa");
  });

  it("muestra «—» si no hay valor y el valor tal cual si no está en el catálogo", () => {
    expect(etiquetaDe(opciones, null)).toBe("—");
    expect(etiquetaDe(opciones, "otro")).toBe("otro");
  });
});

// El recargo se escribe en decimales y se lee en porcentaje: un «3» (300 %) tiene
// que saltar a la vista junto al campo antes de guardar.
describe("pctTexto", () => {
  it("lee el decimal como porcentaje", () => {
    expect(pctTexto("0.0300")).toBe("3.00 %");
    expect(pctTexto("0.0835")).toBe("8.35 %");
    expect(pctTexto("3")).toBe("300.00 %");
  });

  it("no inventa lectura si está vacío o no es número", () => {
    expect(pctTexto("")).toBeNull();
    expect(pctTexto(null)).toBeNull();
    expect(pctTexto("abc")).toBeNull();
  });
});

// Lo pendiente de la lista: un gym que opera sin suscripción no tiene cuota que cobrarle.
describe("faltaSuscripcion", () => {
  const sub = { monthly_price: "299.00" } as GymAdmin["subscription"];
  it("marca al gym activo sin suscripción", () => {
    expect(faltaSuscripcion({ is_active: true, subscription: null as unknown as GymAdmin["subscription"] })).toBe(true);
  });
  it("no marca al que tiene suscripción ni al suspendido", () => {
    expect(faltaSuscripcion({ is_active: true, subscription: sub })).toBe(false);
    expect(faltaSuscripcion({ is_active: false, subscription: null as unknown as GymAdmin["subscription"] })).toBe(false);
  });
});

describe("ordenarGyms", () => {
  it("los que operan primero y por nombre; los suspendidos al final", () => {
    const g = (name: string, is_active?: boolean) => ({ id: name, name, is_active }) as unknown as GymAdmin;
    const orden = ordenarGyms([g("Zeta"), g("Beta", false), g("Alfa"), g("Ápice")]).map((x) => x.name);
    expect(orden).toEqual(["Alfa", "Ápice", "Zeta", "Beta"]);
  });
});
