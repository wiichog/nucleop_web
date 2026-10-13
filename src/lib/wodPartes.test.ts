import { describe, expect, it } from "vitest";
import type { Wod, WodPart } from "../api/types";
import {
  bloqueoParaReemplazar,
  bloquesConScore,
  errorDePartes,
  moverParte,
  partesDesdeSugerencia,
  partesParaEditar,
  partesParaGuardar,
  resumenDeParte,
} from "./wodPartes";

const parte = (over: Partial<WodPart>): WodPart =>
  ({
    id: "p",
    order: 0,
    kind: "metcon",
    kind_display: "Metcon",
    title: "Bloque",
    score_type: "none",
    load_unit: "",
    results_count: 0,
    ...over,
  }) as WodPart;

const wod = (over: Partial<Wod>): Wod =>
  ({ id: "w", title: "Día", score_type: "for_time", parts: [], ...over }) as Wod;

describe("bloquesConScore", () => {
  it("sin partes, el workout entero es un bloque (sin part_id)", () => {
    expect(bloquesConScore(wod({}))).toEqual([
      { key: "w", titulo: "Día", scoreType: "for_time" },
    ]);
  });

  it("con partes, solo las que se puntúan y en su orden", () => {
    const w = wod({
      parts: [
        parte({ id: "c", order: 2, title: "Metcon", score_type: "for_time" }),
        parte({ id: "a", order: 0, title: "Calentamiento" }),
        parte({ id: "b", order: 1, title: "Fuerza A", score_type: "load" }),
      ],
    });
    expect(bloquesConScore(w).map((b) => b.partId)).toEqual(["b", "c"]);
  });
});

describe("partesParaGuardar", () => {
  it("sin bloques antes ni ahora no manda la clave", () => {
    expect(partesParaGuardar([], false)).toBeUndefined();
  });

  it("si los había y se quitaron, manda [] para borrarlos", () => {
    expect(partesParaGuardar([], true)).toEqual([]);
  });

  it("la unidad, el levantamiento y sus reps solo viajan en carga", () => {
    const [carga, metcon] = partesParaGuardar(
      [
        { title: " Fuerza A ", score_type: "load", movement: "back_squat", results_count: 3 },
        { title: "Fran", score_type: "for_time", load_unit: "kg", movement: "thruster", movement_reps: 3 },
      ],
      false,
    )!;
    expect(carga).toMatchObject({
      title: "Fuerza A",
      load_unit: "lb",
      movement: "back_squat",
      movement_reps: 1,
    });
    expect(carga).not.toHaveProperty("results_count");
    expect(metcon).toMatchObject({ load_unit: "", movement: null, movement_reps: null });
  });

  it("un bloque sin score no puede ser benchmark", () => {
    const [p] = partesParaGuardar([{ title: "Warmup", score_type: "none", is_benchmark: true }], false)!;
    expect(p.is_benchmark).toBe(false);
  });
});

describe("edición", () => {
  it("las partes guardadas se editan en su orden, sin campos de solo lectura", () => {
    const lista = partesParaEditar(
      wod({ parts: [parte({ id: "b", order: 1 }), parte({ id: "a", order: 0, description: undefined })] }),
    );
    expect(lista.map((p) => p.id)).toEqual(["a", "b"]);
    expect(lista[0]).not.toHaveProperty("kind_display");
    expect(lista[0].description).toBe("");
  });

  it("pide título a cada bloque", () => {
    expect(errorDePartes([{ title: "A" }, { title: " " }])).toBe("El bloque 2 necesita un título.");
    expect(errorDePartes([{ title: "A" }])).toBeNull();
  });

  it("mover fuera de rango no cambia nada", () => {
    expect(moverParte([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moverParte([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
  });
});

describe("resumenDeParte", () => {
  it("dice el score y el levantamiento", () => {
    const label = (s: string) => ({ load: "Carga" })[s] ?? s;
    expect(
      resumenDeParte(parte({ title: "Fuerza A", score_type: "load", movement: "back_squat", movement_reps: 3 }), label),
    ).toBe("Fuerza A · Carga · Back squat x3");
    expect(resumenDeParte(parte({ title: "Calentamiento" }), label)).toBe("Calentamiento · sin score");
  });
});

describe("bloques armados desde el texto", () => {
  it("las sugerencias entran como bloques nuevos y se guardan con su levantamiento", () => {
    const borradores = partesDesdeSugerencia([
      {
        kind: "strength",
        title: "Power Clean",
        description: "5 Sets @ 70%+",
        score_type: "load",
        time_cap_min: null,
        load_unit: "lb",
        movement: "power_clean",
        movement_reps: null,
        is_benchmark: false,
      },
      {
        kind: "metcon",
        title: "Run Monkey Run",
        description: "Por tiempo:",
        score_type: "for_time",
        time_cap_min: null,
        load_unit: "",
        movement: null,
        movement_reps: null,
        is_benchmark: false,
      },
    ]);
    expect(borradores.every((b) => !("id" in b))).toBe(true);
    const body = partesParaGuardar(borradores, false)!;
    expect(body[0]).toMatchObject({ movement: "power_clean", load_unit: "lb", movement_reps: 1 });
    expect(body[1]).toMatchObject({ score_type: "for_time", load_unit: "", movement: null });
  });

  it("no deja reemplazar bloques que ya tienen scores", () => {
    expect(bloqueoParaReemplazar([{ title: "Fuerza" }])).toBeNull();
    expect(bloqueoParaReemplazar([{ title: "Metcon", results_count: 3 }])).toMatch(/«Metcon» ya tiene scores/);
  });
});
