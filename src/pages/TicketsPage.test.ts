import { describe, expect, it } from "vitest";
import { ordenarBandeja } from "./TicketsPage";

describe("ordenarBandeja", () => {
  it("lo que espera respuesta va primero: abiertos, en progreso y al final resueltos", () => {
    const filas = [
      { id: "a", status: "resolved" as const },
      { id: "b", status: "open" as const },
      { id: "c", status: "in_progress" as const },
      { id: "d", status: "open" as const },
    ];
    expect(ordenarBandeja(filas).map((f) => f.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("no toca la lista original", () => {
    const filas = [
      { id: "a", status: "resolved" as const },
      { id: "b", status: "open" as const },
    ];
    ordenarBandeja(filas);
    expect(filas.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
