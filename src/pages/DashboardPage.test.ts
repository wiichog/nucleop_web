import { describe, expect, it } from "vitest";
import { etiquetaClaseDemandada, pendientesPorAtender } from "./DashboardPage";

describe("etiquetaClaseDemandada", () => {
  it("rotula servicio y hora para distinguir dos horarios del mismo servicio", () => {
    expect(etiquetaClaseDemandada({ class_type: "CrossFit", horario: "06:00" })).toBe(
      "CrossFit 6:00",
    );
    expect(etiquetaClaseDemandada({ class_type: "CrossFit", horario: "18:30" })).toBe(
      "CrossFit 18:30",
    );
  });

  it("sin horario deja solo el servicio", () => {
    expect(etiquetaClaseDemandada({ class_type: "Pilates", horario: "" })).toBe("Pilates");
  });
});

describe("pendientesPorAtender", () => {
  const ceros = {
    solicitudes: 0,
    coaches: 0,
    posts: 0,
    tickets: 0,
    clases_sin_wod: 0,
    pedidos: 0,
    clubes: 0,
    morosos: 0,
    total: 0,
  };

  it("sin resumen todavía no inventa pendientes", () => {
    expect(pendientesPorAtender(undefined)).toEqual([]);
  });

  it("solo lista lo que tiene algo, en el orden de urgencia y con su pantalla", () => {
    const items = pendientesPorAtender({ ...ceros, tickets: 2, solicitudes: 1, total: 3 });
    expect(items.map((i) => [i.key, i.count])).toEqual([
      ["solicitudes", 1],
      ["tickets", 2],
    ]);
    expect(items[1].to).toBe("/panel/tickets");
  });

  it("incluye el contenido de clubes denunciado, que suma al total", () => {
    const items = pendientesPorAtender({ ...ceros, denuncias_club: 4, total: 4 });
    expect(items).toEqual([
      expect.objectContaining({ key: "denuncias_club", count: 4, to: "/panel/contenido-clubes" }),
    ]);
  });

  it("las señales de vigilancia (en riesgo, sin coach) no entran a la bandeja", () => {
    const items = pendientesPorAtender({ ...ceros, en_riesgo: 9, clases_sin_coach: 3 });
    expect(items).toEqual([]);
  });
});
