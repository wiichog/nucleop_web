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
  it("un textarea más alto que el hueco no se mueve mientras se vea algo de él", () => {
    // 350 px visibles, textarea de 400: nunca cabe entero.
    expect(campoTapado({ top: -100, bottom: 300 }, 0, 350)).toBe(false);
    expect(campoTapado({ top: 200, bottom: 600 }, 0, 350)).toBe(false);
  });
  it("un textarea alto que salió por completo de la vista sí se trae", () => {
    expect(campoTapado({ top: 400, bottom: 800 }, 0, 350)).toBe(true);
    expect(campoTapado({ top: -500, bottom: -100 }, 0, 350)).toBe(true);
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

  it("con el teclado abierto, hacer scroll no regresa al campo; abrirlo o cambiar su alto sí", () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 800,
      offsetTop: 0,
      scale: 1,
      addEventListener: (n: string, f: () => void) => (listeners[n] = f),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 800 });
    const win = {
      visualViewport: vv,
      document,
      requestAnimationFrame: (f: () => void) => (f(), 1),
      cancelAnimationFrame: vi.fn(),
      setTimeout: (f: () => void) => (f(), 1),
    } as unknown as Window;

    // Devuelve 0: con `(f(), 1)` el `frame` quedaba en 1 tras correr y todo
    // evento siguiente se ignoraba (la prueba del scroll pasaba sin probar nada).
    (win as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (f: () => void) => (f(), 0);
    const campo = document.createElement("textarea");
    document.body.appendChild(campo);
    campo.focus();
    // Siempre debajo del teclado: si se revisara, siempre se movería.
    campo.getBoundingClientRect = () => ({ top: 600, bottom: 640 }) as DOMRect;
    const scrollIntoView = vi.fn();
    campo.scrollIntoView = scrollIntoView;

    const off = instalarTecladoMovil(win);
    expect(scrollIntoView).not.toHaveBeenCalled(); // sin teclado todavía

    vv.height = 400; // se abre el teclado
    listeners.resize();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    vv.offsetTop = 150; // el usuario baja a ver otro bloque
    listeners.scroll();
    listeners.scroll();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    vv.height = 360; // aparece la barra de sugerencias de iOS
    listeners.resize();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    off();
    campo.remove();
  });
});
