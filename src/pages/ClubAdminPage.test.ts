import { describe, expect, it } from "vitest";
import { METRICAS_RETO, estadoRevision, etiquetaMetrica, nombreReto } from "./ClubAdminPage";

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

describe("botones de revisión por fila", () => {
  it("sólo gira el botón pulsado de la fila que se decide", () => {
    const m = { isPending: true, variables: { submissionId: "s1", action: "approve" } };
    expect(estadoRevision(m, "s1", "approve")).toEqual({ loading: true, disabled: false });
    expect(estadoRevision(m, "s1", "reject")).toEqual({ loading: false, disabled: true });
    expect(estadoRevision(m, "s2", "approve")).toEqual({ loading: false, disabled: false });
    expect(estadoRevision(m, "s2", "reject")).toEqual({ loading: false, disabled: false });
  });

  it("en reposo no gira ni bloquea nada", () => {
    expect(estadoRevision({ isPending: false }, "s1", "approve")).toEqual({ loading: false, disabled: false });
  });
});
