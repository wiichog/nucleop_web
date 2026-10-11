import { describe, expect, it } from "vitest";
import { METRICAS_RETO, etiquetaMetrica, nombreReto } from "./ClubAdminPage";

describe("medidas de reto del club", () => {
  it("ofrece las dos medidas que el servidor sabe llevar", () => {
    expect(METRICAS_RETO.map((m) => m.value)).toEqual(["distance_km", "activity_count"]);
  });

  it("muestra la medida con nombre legible y deja tal cual una desconocida", () => {
    expect(etiquetaMetrica("distance_km")).toBe("Kilómetros");
    expect(etiquetaMetrica("activity_count")).toBe("Asistencias a actividades");
    expect(etiquetaMetrica("otra")).toBe("otra");
  });
});

describe("reto de cada avance por revisar", () => {
  it("nombra el reto del avance y no inventa uno si la lista no ha llegado", () => {
    const retos = [{ id: "r1", name: "100 km de octubre" }];
    expect(nombreReto("r1", retos)).toBe("100 km de octubre");
    expect(nombreReto("r2", retos)).toBe("—");
    expect(nombreReto("r1", undefined)).toBe("—");
  });
});
