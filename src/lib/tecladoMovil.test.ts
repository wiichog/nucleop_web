import { describe, expect, it, vi } from "vitest";
import { campoTapado, esEditable, hayTeclado, instalarTecladoMovil } from "./tecladoMovil";

describe("hayTeclado", () => {
  it("detecta el teclado cuando lo visible es mucho menor que el layout", () => {
    expect(hayTeclado(800, 450, 1)).toBe(true);
  });
  it("no confunde la barra de Safari que se esconde con el teclado", () => {
    expect(hayTeclado(800, 740, 1)).toBe(false);
  });
  it("con zoom de pellizco no hay teclado (es la lupa del usuario)", () => {
    expect(hayTeclado(800, 300, 2.5)).toBe(false);
  });
});

describe("campoTapado", () => {
  it("un campo debajo del borde visible está tapado", () => {
    expect(campoTapado({ top: 500, bottom: 540 }, 0, 450)).toBe(true);
  });
  it("un campo dentro de lo visible no se mueve", () => {
    expect(campoTapado({ top: 200, bottom: 240 }, 0, 450)).toBe(false);
  });
  it("respeta el desplazamiento del viewport visual (iOS)", () => {
    expect(campoTapado({ top: 320, bottom: 360 }, 300, 450)).toBe(false);
    expect(campoTapado({ top: 100, bottom: 140 }, 300, 450)).toBe(true);
  });
});

describe("esEditable", () => {
  it("inputs de texto sí, botones y checkboxes no", () => {
    const t = document.createElement("input");
    t.type = "email";
    const c = document.createElement("input");
    c.type = "checkbox";
    expect(esEditable(t)).toBe(true);
    expect(esEditable(c)).toBe(false);
    expect(esEditable(document.createElement("textarea"))).toBe(true);
    expect(esEditable(document.createElement("button"))).toBe(false);
    expect(esEditable(null)).toBe(false);
  });
});

describe("instalarTecladoMovil", () => {
  it("sin visualViewport no hace nada y la limpieza no truena", () => {
    const off = instalarTecladoMovil({ visualViewport: null } as unknown as Window);
    expect(() => off()).not.toThrow();
  });

  it("publica el alto visible y marca el teclado; la limpieza lo quita", () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 400,
      offsetTop: 0,
      scale: 1,
      addEventListener: (n: string, f: () => void) => (listeners[n] = f),
      removeEventListener: vi.fn(),
    };
    const root = document.documentElement;
    Object.defineProperty(root, "clientHeight", { configurable: true, value: 800 });
    const win = {
      visualViewport: vv,
      document,
      requestAnimationFrame: (f: () => void) => (f(), 1),
      cancelAnimationFrame: vi.fn(),
      setTimeout: (f: () => void) => (f(), 1),
    } as unknown as Window;

    const off = instalarTecladoMovil(win);
    expect(root.style.getPropertyValue("--nucleo-vvh")).toBe("400px");
    expect(root.hasAttribute("data-teclado")).toBe(true);

    vv.height = 800;
    listeners.resize();
    expect(root.hasAttribute("data-teclado")).toBe(false);

    off();
    expect(root.style.getPropertyValue("--nucleo-vvh")).toBe("");
  });
});
