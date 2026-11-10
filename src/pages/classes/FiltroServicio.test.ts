import { describe, expect, it } from "vitest";
import { coincideServicio, opcionesDeServicio } from "./FiltroServicio";

describe("opcionesDeServicio", () => {
  it("deja cada servicio una sola vez, ordenado y sin vacíos", () => {
    expect(opcionesDeServicio(["Pilates", "CrossFit", "Pilates", "", null, undefined, "  "])).toEqual([
      { value: "CrossFit", label: "CrossFit" },
      { value: "Pilates", label: "Pilates" },
    ]);
  });

  it("conserva el elegido aunque esta tabla no lo tenga (si no, el Select se ve vacío y filtra a cero)", () => {
    expect(opcionesDeServicio(["CrossFit"], "Yoga").map((o) => o.value)).toEqual(["CrossFit", "Yoga"]);
  });
});

describe("coincideServicio", () => {
  it("sin elegido deja pasar todo", () => {
    expect(coincideServicio("CrossFit", null)).toBe(true);
    expect(coincideServicio(null, null)).toBe(true);
  });

  it("con elegido compara el nombre exacto", () => {
    expect(coincideServicio("CrossFit", "CrossFit")).toBe(true);
    expect(coincideServicio("CrossFit Kids", "CrossFit")).toBe(false);
    expect(coincideServicio(null, "CrossFit")).toBe(false);
  });
});
