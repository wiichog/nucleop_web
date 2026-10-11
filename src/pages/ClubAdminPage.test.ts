import { describe, expect, it } from "vitest";
import { METRICAS_RETO, etiquetaMetrica } from "./ClubAdminPage";

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
