import { describe, expect, it } from "vitest";
import { esTituloAutomatico, tituloAutomaticoWod } from "./tituloWod";

describe("tituloAutomaticoWod (espejo de titulo_automatico_wod del backend)", () => {
  it("arma «Programa - Día, número Mes»", () => {
    expect(tituloAutomaticoWod("2026-11-16", "CrossFit")).toBe("CrossFit - Lun, 16 Nov");
    expect(tituloAutomaticoWod("2026-11-21", "Hybrid")).toBe("Hybrid - Sáb, 21 Nov");
  });

  it("sin programa (General) va solo la fecha", () => {
    expect(tituloAutomaticoWod("2027-01-01")).toBe("Vie, 1 Ene");
    expect(tituloAutomaticoWod("2027-01-01", null)).toBe("Vie, 1 Ene");
    expect(tituloAutomaticoWod("2027-01-01", "   ")).toBe("Vie, 1 Ene");
  });

  it("recorta el nombre del programa", () => {
    expect(tituloAutomaticoWod("2026-11-18", "  Functional ")).toBe("Functional - Mié, 18 Nov");
  });

  it("día del mes sin cero y los siete días con tilde donde va", () => {
    const semana = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"];
    expect(semana.map((f) => tituloAutomaticoWod(f).split(",")[0])).toEqual([
      "Lun",
      "Mar",
      "Mié",
      "Jue",
      "Vie",
      "Sáb",
      "Dom",
    ]);
    expect(tituloAutomaticoWod("2026-12-05")).toBe("Sáb, 5 Dic");
  });

  it("los doce meses abreviados", () => {
    const meses = Array.from({ length: 12 }, (_, i) =>
      tituloAutomaticoWod(`2027-${String(i + 1).padStart(2, "0")}-10`).split(" ").pop(),
    );
    expect(meses).toEqual(["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]);
  });

  it("una fecha ilegible no inventa título", () => {
    expect(tituloAutomaticoWod("", "CrossFit")).toBe("");
    expect(tituloAutomaticoWod("2026-02-30", "CrossFit")).toBe("");
  });
});

describe("esTituloAutomatico", () => {
  it("sigue automático solo si coincide con el del backend", () => {
    expect(esTituloAutomatico({ title: "CrossFit - Lun, 16 Nov", titulo_automatico: "CrossFit - Lun, 16 Nov" })).toBe(true);
    expect(esTituloAutomatico({ title: "Murph", titulo_automatico: "CrossFit - Lun, 16 Nov" })).toBe(false);
  });

  it("sin titulo_automatico (backend viejo) se respeta como editado a mano", () => {
    expect(esTituloAutomatico({ title: "Workout del jueves 5 de noviembre" })).toBe(false);
  });
});
