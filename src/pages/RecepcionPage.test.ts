import { describe, expect, it } from "vitest";
import type { GymClass } from "../api/types";
import { claseSugerida, clasesDeHoy } from "./RecepcionPage";

const clase = (id: string, inicio: Date, extra: Partial<GymClass> = {}): GymClass =>
  ({ id, starts_at: inicio.toISOString(), duration_min: 60, status: "scheduled", ...extra }) as GymClass;

const a = (h: number, m = 0) => {
  const d = new Date(2026, 10, 23, h, m);
  return d;
};

describe("clasesDeHoy", () => {
  it("deja solo las de hoy, sin canceladas, por hora", () => {
    const hoy = a(12);
    const lista = [
      clase("tarde", a(18)),
      clase("manana", a(6)),
      clase("cancelada", a(7), { status: "cancelled" }),
      clase("otro-dia", new Date(2026, 10, 24, 6)),
    ];
    expect(clasesDeHoy(lista, hoy).map((c) => c.id)).toEqual(["manana", "tarde"]);
  });
});

describe("claseSugerida", () => {
  const hoy = [clase("6am", a(6)), clase("12pm", a(12)), clase("6pm", a(18))];

  it("elige la de lista abierta (30 min antes a 1 h después)", () => {
    expect(claseSugerida(hoy, a(11, 40).getTime())?.id).toBe("12pm");
    expect(claseSugerida(hoy, a(13, 50).getTime())?.id).toBe("12pm");
  });

  it("si no hay ninguna abierta, la próxima", () => {
    expect(claseSugerida(hoy, a(15).getTime())?.id).toBe("6pm");
  });

  it("al final del día, la última", () => {
    expect(claseSugerida(hoy, a(22).getTime())?.id).toBe("6pm");
  });

  it("con dos abiertas a la vez, la que empezó más tarde", () => {
    const traslape = [clase("a", a(6)), clase("b", a(6, 30))];
    expect(claseSugerida(traslape, a(7).getTime())?.id).toBe("b");
  });
});
