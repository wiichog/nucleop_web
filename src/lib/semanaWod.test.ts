import { describe, expect, it } from "vitest";
import type { Wod } from "../api/types";
import {
  deIso,
  diasDeSemana,
  etiquetaColumna,
  fechaLarga,
  isoLocal,
  lunesDe,
  rangoDeSemana,
  sumarDias,
  wodDelDia,
} from "./semanaWod";

describe("semana de programación", () => {
  it("el lunes de cualquier día, incluido el domingo", () => {
    expect(isoLocal(lunesDe(deIso("2026-11-05")))).toBe("2026-11-02"); // jueves
    expect(isoLocal(lunesDe(deIso("2026-11-02")))).toBe("2026-11-02"); // lunes
    expect(isoLocal(lunesDe(deIso("2026-11-08")))).toBe("2026-11-02"); // domingo
  });

  it("siete días de lunes a domingo, cruzando el mes", () => {
    const dias = diasDeSemana(deIso("2026-10-26")).map(isoLocal);
    expect(dias).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
  });

  it("deIso es medianoche local, no UTC", () => {
    const d = deIso("2026-11-05");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 5, 0]);
    expect(isoLocal(sumarDias(d, -7))).toBe("2026-10-29");
  });

  it("textos de la columna y del rango", () => {
    expect(etiquetaColumna(deIso("2026-11-02"))).toBe("Lun 02");
    expect(fechaLarga(deIso("2026-11-05"))).toBe("jueves 5 de noviembre");
    expect(rangoDeSemana(deIso("2026-11-02"))).toBe("2 – 8 de noviembre de 2026");
    expect(rangoDeSemana(deIso("2026-10-26"))).toBe("26 de octubre – 1 de noviembre de 2026");
    expect(rangoDeSemana(deIso("2026-12-28"))).toBe("28 de diciembre de 2026 – 3 de enero de 2027");
  });

  it("el workout del día es el de ESE programa; vacío = General", () => {
    const wods = [
      { id: "a", date: "2026-11-05", service_type: "cf" },
      { id: "b", date: "2026-11-05", service_type: null },
      { id: "c", date: "2026-11-06", service_type: "cf" },
    ] as Wod[];
    expect(wodDelDia(wods, "2026-11-05", "cf")?.id).toBe("a");
    expect(wodDelDia(wods, "2026-11-05", "")?.id).toBe("b");
    expect(wodDelDia(wods, "2026-11-06", "")).toBeUndefined();
  });
});
