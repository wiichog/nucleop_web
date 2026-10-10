// @vitest-environment jsdom
/** El panel del manual: elige el manual por la ruta y la búsqueda filtra sin tildes. */
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import { ManualDrawer } from "./ManualDrawer";

beforeAll(() => {
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
    })) as unknown as typeof window.matchMedia;
  }
  if (!("ResizeObserver" in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const abrir = (pathname: string) =>
  render(
    <MantineProvider>
      <MemoryRouter>
        <ManualDrawer opened onClose={() => {}} pathname={pathname} />
      </MemoryRouter>
    </MantineProvider>,
  );

describe("ManualDrawer", () => {
  it("muestra el manual de la pantalla en la que estás", () => {
    abrir("/panel/clases");
    expect(screen.getByText("Clases y workouts")).toBeTruthy();
    expect(screen.getByText("Publicar el workout del día")).toBeTruthy();
    expect(screen.getByText("Planes y cuotas")).toBeTruthy();
  });

  it("la búsqueda ignora tildes y mayúsculas, y deja solo lo que coincide", () => {
    abrir("/panel/clases");
    fireEvent.change(screen.getByPlaceholderText("Buscar en este manual…"), {
      target: { value: "DROP-IN" },
    });
    expect(screen.getByText("Crear un pase para visitantes (drop-in)")).toBeTruthy();
    expect(screen.queryByText("Publicar el workout del día")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Buscar en este manual…"), {
      target: { value: "regenerar calendario" },
    });
    expect(screen.getByText("Armar el horario semanal")).toBeTruthy();
  });

  it("avisa cuando nada coincide", () => {
    abrir("/panel/clases");
    fireEvent.change(screen.getByPlaceholderText("Buscar en este manual…"), {
      target: { value: "zzzz" },
    });
    expect(screen.getByText("Nada coincide con «zzzz».")).toBeTruthy();
  });

  it("una pantalla sin manual lo dice", () => {
    abrir("/panel/inventario");
    expect(screen.getByText(/todavía no tiene manual/)).toBeTruthy();
  });
});
