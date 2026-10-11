import { describe, expect, it } from "vitest";
import { textosSelectorContexto } from "./Layout";

describe("textosSelectorContexto", () => {
  it("con varios clubes y sin gimnasio habla de club", () => {
    expect(textosSelectorContexto({ multiGym: false, multiClub: true })).toEqual({
      texto: "Elegir club",
      etiqueta: "Cambiar de club",
    });
    expect(
      textosSelectorContexto({ clubName: "Corredores GT", multiGym: false, multiClub: true }),
    ).toEqual({ texto: "Corredores GT", etiqueta: "Cambiar de club" });
  });

  it("con un solo gimnasio y varios clubes muestra el club activo, no el gimnasio", () => {
    expect(
      textosSelectorContexto({ gymName: "Box Zona 10", clubName: "Corredores GT", multiGym: false, multiClub: true }),
    ).toEqual({ texto: "Corredores GT", etiqueta: "Cambiar de club" });
  });

  it("con varios gimnasios sigue hablando de gimnasio", () => {
    expect(textosSelectorContexto({ multiGym: true, multiClub: false })).toEqual({
      texto: "Elegir gimnasio",
      etiqueta: "Cambiar de gimnasio",
    });
  });

  it("con varios de ambos muestra el gimnasio y nombra los dos", () => {
    expect(
      textosSelectorContexto({ gymName: "Box Zona 10", clubName: "C", multiGym: true, multiClub: true }),
    ).toEqual({ texto: "Box Zona 10", etiqueta: "Cambiar de gimnasio o club" });
  });
});
