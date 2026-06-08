import { describe, expect, it } from "vitest";
import { CLASS_STATUS, MEMBERSHIP_STATUS, label } from "./labels";

describe("label", () => {
  it("traduce un valor conocido del mapa", () => {
    expect(label(MEMBERSHIP_STATUS, "active")).toBe(MEMBERSHIP_STATUS.active);
    expect(label(CLASS_STATUS, "scheduled")).toBe(CLASS_STATUS.scheduled);
  });

  it("devuelve '—' para null/undefined/vacío", () => {
    expect(label(MEMBERSHIP_STATUS, null)).toBe("—");
    expect(label(MEMBERSHIP_STATUS, undefined)).toBe("—");
    expect(label(MEMBERSHIP_STATUS, "")).toBe("—");
  });

  it("hace fallback al valor crudo si no está en el mapa", () => {
    expect(label(MEMBERSHIP_STATUS, "desconocido")).toBe("desconocido");
  });
});
