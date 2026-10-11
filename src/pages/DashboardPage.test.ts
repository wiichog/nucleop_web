import { describe, expect, it } from "vitest";
import { etiquetaClaseDemandada } from "./DashboardPage";

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
