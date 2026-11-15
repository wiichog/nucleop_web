import { describe, expect, it } from "vitest";
import { partirMenciones } from "./menciones";

const ana = { athlete_id: "a1", name: "Ana López" };

describe("partirMenciones", () => {
  it("sin menciones devuelve el texto entero (API viejo)", () => {
    expect(partirMenciones("hola @Ana López")).toEqual([{ texto: "hola @Ana López", mencion: false }]);
    expect(partirMenciones("hola", [])).toEqual([{ texto: "hola", mencion: false }]);
  });

  it("texto vacío no da trozos", () => {
    expect(partirMenciones("", [ana])).toEqual([]);
  });

  it("marca la mención y deja el resto plano", () => {
    expect(partirMenciones("Bien @Ana López!", [ana])).toEqual([
      { texto: "Bien ", mencion: false },
      { texto: "@Ana López", mencion: true },
      { texto: "!", mencion: false },
    ]);
  });

  it("solo resalta los nombres que mandó el backend, no cualquier @", () => {
    const t = partirMenciones("@Pedro y @Ana López", [ana]);
    expect(t.filter((x) => x.mencion).map((x) => x.texto)).toEqual(["@Ana López"]);
  });

  it("el nombre más largo gana y no corta una palabra a la mitad", () => {
    const anaSola = { athlete_id: "a2", name: "Ana" };
    const t = partirMenciones("@Ana López, @Ana y @Anabel", [anaSola, ana]);
    expect(t.filter((x) => x.mencion).map((x) => x.texto)).toEqual(["@Ana López", "@Ana"]);
  });

  it("no distingue mayúsculas y escapa caracteres raros del nombre", () => {
    const raro = { athlete_id: "a3", name: "J.P. (Coach)" };
    const t = partirMenciones("@ana lópez y @J.P. (Coach)", [ana, raro]);
    expect(t.filter((x) => x.mencion).map((x) => x.texto)).toEqual(["@ana lópez", "@J.P. (Coach)"]);
  });
});
