// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Wod } from "../../api/types";
import { deIso } from "../../lib/semanaWod";
import { SemanaWods } from "./SemanaWods";

/**
 * «Se debe de ver el workout creado, no se ve» (Dixon, 5-nov-2026): el workout
 * salía en una fila de tabla con el texto cortado. Ahora la semana lo muestra
 * entero, bloque por bloque, y del programa elegido nada más.
 */

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

afterEach(cleanup);

const wod = (extra: Partial<Wod>): Wod =>
  ({
    id: "w",
    service_type: "cf",
    service_type_name: "CrossFit",
    date: "2026-11-05",
    title: "Workout del jueves 5 de noviembre",
    description: "",
    score_type: "for_time",
    time_cap_min: null,
    movements: null,
    published: true,
    is_benchmark: false,
    results_count: 0,
    parts: [],
    ...extra,
  }) as Wod;

const WODS: Wod[] = [
  wod({
    id: "jue",
    parts: [
      { id: "p1", order: 0, kind: "warmup", title: "Warmup", description: "3 Sets\n200M Jog", score_type: "none" },
      {
        id: "p2",
        order: 1,
        kind: "metcon",
        title: "Custom Metcon (Tiempo)",
        description: "For Time\n100 Ring Rows\n1,000M Row",
        score_type: "for_time",
      },
    ] as Wod["parts"],
  }),
  // Otro programa el mismo día: no se debe ver en la semana de CrossFit.
  wod({ id: "pil", service_type: "pilates", service_type_name: "Pilates", title: "Reformer", description: "Core" }),
  // Un workout de antes de los bloques: su texto es lo único que tiene.
  wod({ id: "mar", date: "2026-11-03", title: "Fran", description: "21-15-9 thrusters + pull-ups", published: false }),
];

function montar(programa = "cf") {
  const handlers = {
    onProgramar: vi.fn(),
    onEditar: vi.fn(),
    onBoard: vi.fn(),
    onPublicar: vi.fn(),
    onEliminar: vi.fn(),
  };
  render(
    <MantineProvider>
      <SemanaWods
        wods={WODS}
        lunes={deIso("2026-11-02")}
        programa={programa}
        hoy="2026-11-05"
        cargando={false}
        ocupado={false}
        etiquetaScore={(s) => (s === "for_time" ? "Tiempo" : s)}
        {...handlers}
      />
    </MantineProvider>,
  );
  const dia = (fecha: string) => document.querySelector(`[data-dia="${fecha}"]`) as HTMLElement;
  return { handlers, dia };
}

describe("SemanaWods", () => {
  it("siete columnas de lunes a domingo", () => {
    montar();
    expect(Array.from(document.querySelectorAll("[data-dia]")).map((e) => e.getAttribute("data-dia"))).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
  });

  it("muestra el workout entero, bloque por bloque, con su score", () => {
    const { dia } = montar();
    const jueves = within(dia("2026-11-05"));
    expect(jueves.getByText("Jue 05")).toBeTruthy();
    expect(jueves.getByText("Hoy")).toBeTruthy();
    expect(jueves.getByText("Warmup")).toBeTruthy();
    expect(jueves.getByText("Custom Metcon (Tiempo)")).toBeTruthy();
    // El texto completo, con sus saltos de línea: nada recortado.
    expect(dia("2026-11-05").textContent).toContain("100 Ring Rows\n1,000M Row");
    expect(jueves.getByText("Tiempo")).toBeTruthy();
    expect(jueves.getByText("Publicado")).toBeTruthy();
    // El de Pilates del mismo día no se cuela.
    expect(jueves.queryByText("Reformer")).toBeNull();
  });

  it("un workout de antes de los bloques muestra su título y su texto", () => {
    const { dia } = montar();
    const martes = within(dia("2026-11-03"));
    expect(martes.getByText("Fran")).toBeTruthy();
    expect(martes.getByText("21-15-9 thrusters + pull-ups")).toBeTruthy();
    expect(martes.getByText("Borrador")).toBeTruthy();
    expect(martes.getByText("Publicar")).toBeTruthy();
  });

  it("un día vacío ofrece programarlo con su fecha", () => {
    const { dia, handlers } = montar();
    fireEvent.click(within(dia("2026-11-06")).getByText("Programar"));
    expect(handlers.onProgramar).toHaveBeenCalledWith("2026-11-06");
  });

  it("las acciones van al workout de su columna", () => {
    const { dia, handlers } = montar();
    const jueves = within(dia("2026-11-05"));
    fireEvent.click(jueves.getByText("Editar"));
    fireEvent.click(jueves.getByText("Board"));
    expect(handlers.onEditar.mock.calls[0][0].id).toBe("jue");
    expect(handlers.onBoard.mock.calls[0][0].id).toBe("jue");
  });

  it("con otro programa se ve el suyo", () => {
    const { dia } = montar("pilates");
    expect(within(dia("2026-11-05")).getByText("Reformer")).toBeTruthy();
    expect(within(dia("2026-11-03")).getByText("Sin workout")).toBeTruthy();
  });
});
