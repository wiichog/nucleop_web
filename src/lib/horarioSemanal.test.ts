import { describe, expect, it } from "vitest";
import type { ClassSchedule } from "../api/types";
import { armarCuadricula, diasVisibles, horaDe, resumenHorario } from "./horarioSemanal";

const franja = (extra: Partial<ClassSchedule>): ClassSchedule =>
  ({
    id: Math.random().toString(36),
    branch: null,
    service_type: "cf",
    service_type_name: "CrossFit",
    color: "#FC4C02",
    requires_wod: true,
    weekday: 0,
    start_time: "06:00:00",
    duration_min: 60,
    capacity: 20,
    level: "",
    cost: "0",
    included_in_plan: true,
    default_coach: "coach-1",
    assignment_lead_min: 0,
    valid_from: "2026-11-01",
    valid_until: null,
    is_open_ended: true,
    is_active: true,
    ...extra,
  }) as ClassSchedule;

describe("armarCuadricula", () => {
  it("junta la misma hora de varios días en una sola fila", () => {
    const franjas = [0, 1, 2, 3, 4].map((weekday) => franja({ weekday, start_time: "06:00:00" }));
    const c = armarCuadricula(franjas);
    expect(c.horas).toEqual(["06:00"]);
    expect([0, 1, 2, 3, 4].map((d) => c.celda("06:00", d).length)).toEqual([1, 1, 1, 1, 1]);
    expect(c.celda("06:00", 5)).toEqual([]);
  });

  it("ordena las horas aunque lleguen desordenadas", () => {
    const c = armarCuadricula([
      franja({ start_time: "18:00:00" }),
      franja({ start_time: "05:30:00" }),
      franja({ start_time: "12:00:00" }),
    ]);
    expect(c.horas).toEqual(["05:30", "12:00", "18:00"]);
  });

  it("deja dos servicios a la misma hora en la misma celda, por nombre", () => {
    const c = armarCuadricula([
      franja({ service_type_name: "Pilates" }),
      franja({ service_type_name: "CrossFit" }),
    ]);
    expect(c.celda("06:00", 0).map((f) => f.service_type_name)).toEqual(["CrossFit", "Pilates"]);
  });
});

describe("diasVisibles", () => {
  it("muestra el domingo solo si hay clases ese día", () => {
    expect(diasVisibles([{ weekday: 0 }])).toEqual([0, 1, 2, 3, 4, 5]);
    expect(diasVisibles([{ weekday: 6 }])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("resumenHorario", () => {
  it("cuenta las clases y las que no tienen coach", () => {
    expect(resumenHorario([{ default_coach: "a" }, { default_coach: null }, { default_coach: null }])).toEqual({
      clases: 3,
      sinCoach: 2,
    });
  });
});

it("horaDe recorta los segundos", () => {
  expect(horaDe({ start_time: "06:00:00" })).toBe("06:00");
  expect(horaDe({ start_time: "17:30" })).toBe("17:30");
});
