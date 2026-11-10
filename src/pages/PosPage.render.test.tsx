// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El POS de recepción: tocar productos arma el carrito, «Cobrar» manda la venta
 * con el método elegido, y tocar una venta abre su detalle con «Devolver venta».
 * Lo que se protege es el cuerpo que llega al servidor: mismas líneas, mismo
 * método, misma devolución que antes del rediseño.
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
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const estado = vi.hoisted(() => ({
  ventasCreadas: [] as unknown[],
  devueltas: [] as unknown[],
  ventas: [] as unknown[],
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

const producto = (over: Record<string, unknown>) => ({
  id: "p",
  name: "Producto",
  sku: "",
  category: "drink",
  sale_price: "10.00",
  cost_price: "5.00",
  stock_qty: 10,
  reorder_level: 0,
  margin_unit: "5.00",
  needs_reorder: false,
  show_in_marketplace: false,
  description: "",
  photo: null,
  images: [],
  sizes: [],
  colors: [],
  delivery_days: 0,
  is_upcoming: false,
  launch_date: null,
  components: [],
  is_composite: false,
  is_active: true,
  created_at: "2026-11-01T00:00:00Z",
  ...over,
});

vi.mock("../api/hooks", () => ({
  useErpProducts: () => ({
    isLoading: false,
    isError: false,
    data: [
      producto({ id: "agua", name: "Agua", sale_price: "5.00", category: "drink" }),
      producto({ id: "prot", name: "Proteína", sale_price: "25.50", category: "supplement", sku: "PW-1" }),
      producto({ id: "lic", name: "Licuado", sale_price: "30.00", is_composite: true, stock_qty: 0 }),
      producto({ id: "vieja", name: "Barra vieja", is_active: false }),
    ],
  }),
  useErpSales: () => ({ isLoading: false, isError: false, data: estado.ventas }),
  useBranches: () => ({ data: [] }),
  useMemberships: () => ({ data: [{ athlete: "at-1", athlete_name: "Ana López" }] }),
  useCreateErpSale: () => ({
    isPending: false,
    mutateAsync: async (body: unknown) => {
      estado.ventasCreadas.push(body);
      return {};
    },
  }),
  useReturnErpSale: () => ({
    isPending: false,
    mutateAsync: async (vars: unknown) => {
      estado.devueltas.push(vars);
      return {};
    },
  }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1" }),
}));

import { PosPage } from "./PosPage";

function pintar() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <PosPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** El botón que lleva ese texto (getByRole es lentísimo en jsdom con la pantalla entera). */
function boton(texto: string | RegExp): HTMLButtonElement {
  const b = screen.getByText(texto).closest("button");
  if (!b) throw new Error(`Sin botón: ${texto}`);
  return b;
}

const linea = (id: string, product: string, qty: number) => ({
  id,
  product,
  product_name: product,
  qty,
  unit_price: "5.00",
  unit_cost: "2.00",
  subtotal: String(5 * qty),
});

beforeEach(() => {
  estado.ventasCreadas = [];
  estado.devueltas = [];
  estado.ventas = [];
  avisos.show = [];
});

describe("POS · cobrar", { timeout: 30_000 }, () => {
  it("tocar productos arma el carrito y «Cobrar» manda líneas y método", async () => {
    pintar();
    // Los inactivos no se ofrecen.
    expect(screen.queryByText("Barra vieja")).toBeNull();
    // Un preparado no dice «Sin stock».
    expect(screen.getByText("Preparado")).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/^Agregar Proteína/));
    fireEvent.click(screen.getByLabelText(/^Agregar Agua/));
    fireEvent.click(screen.getByLabelText(/^Agregar Proteína/));

    // Tarjeta = datáfono externo: mismo método de siempre, sin recargo.
    fireEvent.click(screen.getByText("Tarjeta"));
    const cobrar = boton(/^Cobrar/);
    expect(cobrar.textContent).toMatch(/56\.00/);
    await act(async () => {
      fireEvent.click(cobrar);
    });

    expect(estado.ventasCreadas).toEqual([
      {
        athlete_id: null,
        branch_id: null,
        method: "card",
        lines: [
          { product_id: "prot", qty: 2 },
          { product_id: "agua", qty: 1 },
        ],
      },
    ]);
    expect(avisos.show).toContainEqual({ color: "teal", message: "Venta registrada." });
    // El carrito queda vacío para la siguiente persona.
    expect(screen.getByText("Toca un producto para agregarlo.")).toBeTruthy();
  });

  it("«−» hasta cero saca la línea y «Cobrar» se apaga", () => {
    pintar();
    fireEvent.click(screen.getByLabelText(/^Agregar Agua/));
    fireEvent.click(screen.getByLabelText("Quitar una unidad de Agua"));
    expect(boton(/^Cobrar/).disabled).toBe(true);
  });

  it("buscar el SKU y Enter lo agrega (lector de código)", () => {
    pintar();
    const buscar = screen.getByLabelText("Buscar producto");
    fireEvent.change(buscar, { target: { value: "pw-1" } });
    fireEvent.keyDown(buscar, { key: "Enter" });
    expect(screen.getByLabelText("Cantidad de Proteína")).toBeTruthy();
  });
});

describe("POS · ventas", { timeout: 30_000 }, () => {
  it("tocar una venta abre su detalle y «Devolver venta» pide confirmar antes de devolver", async () => {
    estado.ventas = [
      {
        id: "v1",
        athlete: "at-1",
        payment: null,
        method: "cash",
        total: "10.00",
        cogs: "4.00",
        margin: "6.00",
        note: "",
        return_of: null,
        lines: [linea("l1", "Agua", 2)],
        created_at: "2026-11-09T15:00:00Z",
      },
    ];
    pintar();
    fireEvent.click(screen.getByLabelText(/^Venta del .* por/));
    expect(await screen.findByText(/Efectivo · Ana López/)).toBeTruthy();

    fireEvent.click(boton("Devolver venta"));
    expect(estado.devueltas).toEqual([]);
    await act(async () => {
      fireEvent.click(boton("Sí, devolver"));
    });
    expect(estado.devueltas).toEqual([{ id: "v1" }]);
    await waitFor(() => expect(avisos.show).toContainEqual({ color: "teal", message: "Devolución registrada." }));
  });

  it("una venta devuelta por completo ya no ofrece «Devolver venta»", async () => {
    estado.ventas = [
      {
        id: "dev",
        athlete: null,
        payment: null,
        total: "-10.00",
        cogs: "-4.00",
        margin: "-6.00",
        note: "",
        return_of: "v1",
        lines: [linea("l2", "Agua", -2)],
        created_at: "2026-11-09T16:00:00Z",
      },
      {
        id: "v1",
        athlete: null,
        payment: null,
        total: "10.00",
        cogs: "4.00",
        margin: "6.00",
        note: "",
        return_of: null,
        lines: [linea("l1", "Agua", 2)],
        created_at: "2026-11-09T15:00:00Z",
      },
    ];
    pintar();
    expect(screen.getByText("Devuelta")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/^Venta del .* por/));
    expect(await screen.findByText(/Sin atleta/)).toBeTruthy();
    expect(screen.queryByText("Devolver venta")).toBeNull();
  });
});
