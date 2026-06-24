import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it } from "vitest";
import { CountBadge } from "./ui";

// jsdom no implementa matchMedia y MantineProvider lo usa para el color scheme.
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

function renderBadge(count: number, size?: "sm" | "lg") {
  return render(
    <MantineProvider>
      <CountBadge count={count} size={size} />
    </MantineProvider>,
  );
}

function badgeRoot(container: HTMLElement) {
  return container.querySelector(".mantine-Badge-root");
}

describe("CountBadge", () => {
  it("no renderiza nada cuando el conteo es 0 o negativo", () => {
    expect(badgeRoot(renderBadge(0).container)).toBeNull();
    expect(badgeRoot(renderBadge(-3).container)).toBeNull();
  });

  it("muestra el número completo de 1 y 2 dígitos", () => {
    expect(badgeRoot(renderBadge(7).container)?.textContent).toBe("7");
    expect(badgeRoot(renderBadge(12).container)?.textContent).toBe("12");
  });

  it("topa en 99+ para no desbordar con 3+ dígitos", () => {
    expect(badgeRoot(renderBadge(150).container)?.textContent).toBe("99+");
  });

  // El bug reportado: con `circle` siempre, los conteos de 2+ dígitos se recortaban
  // ("se miran mal a partir de 10"). Ahora solo 1 dígito es círculo; 10…99/99+ son
  // pastilla (sin data-circle) y crecen con el contenido.
  it("usa círculo solo con 1 dígito", () => {
    expect(badgeRoot(renderBadge(9).container)?.hasAttribute("data-circle")).toBe(true);
  });

  it("usa pastilla (no círculo) con 2+ dígitos y con 99+", () => {
    expect(badgeRoot(renderBadge(10).container)?.hasAttribute("data-circle")).toBe(false);
    expect(badgeRoot(renderBadge(99).container)?.hasAttribute("data-circle")).toBe(false);
    expect(badgeRoot(renderBadge(150).container)?.hasAttribute("data-circle")).toBe(false);
  });
});
