// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Interruptor «Activo» del catálogo. El Punto de venta solo lista productos
 * activos; antes no había forma de apagar ni de volver a encender uno desde
 * Inventario. Se prueba que mande solo `is_active` (sin tocar la receta ni el
 * resto del producto) y que avise tanto el éxito como el error.
 */

// mantine-datatable solo pinta las celdas cuyas columnas "son visibles" según
// matchMedia: con `matches: false` las filas salen vacías en jsdom.
window.matchMedia = ((query: string) => ({
  matches: true,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const espias = vi.hoisted(() => ({
  actualizar: vi.fn(),
  movimiento: vi.fn(),
  aviso: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({ notifications: { show: espias.aviso } }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ primaryGymId: "gym-1" }) }));
vi.mock("./InventoryLedgerPanel", () => ({ InventoryLedgerPanel: () => null }));
vi.mock("./InventoryValuationPanel", () => ({ InventoryValuationPanel: () => null }));
vi.mock("./PurchaseOrdersPanel", () => ({ PurchaseOrdersPanel: () => null }));
vi.mock("./StoreOrdersPanel", () => ({ StoreOrdersPanel: () => null }));
vi.mock("./SuppliersPanel", () => ({ SuppliersPanel: () => null }));

const producto = (over: Record<string, unknown>) => ({
  sku: "",
  category: "supplement",
  sale_price: "100.00",
  cost_price: "60.00",
  stock_qty: 5,
  reorder_level: 0,
  margin_unit: "40.00",
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
  created_at: "2026-10-01T00:00:00Z",
  ...over,
});

vi.mock("../api/hooks", () => {
  const mutacion = (fn = vi.fn()) => ({ mutateAsync: fn, mutate: fn, isPending: false });
  return {
    useErpProducts: () => ({
      data: [
        producto({ id: "p-1", name: "Proteína", is_active: true }),
        producto({ id: "p-2", name: "Creatina", is_active: false }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateErpProduct: () => mutacion(),
    useUpdateErpProduct: () => mutacion(espias.actualizar),
    useDeleteErpProduct: () => mutacion(),
    useCreateErpMovement: () => mutacion(espias.movimiento),
    useUploadProductPhoto: () => mutacion(),
    useUploadProductImages: () => mutacion(),
    useDeleteProductImage: () => mutacion(),
    usePendingSummary: () => ({ data: undefined }),
  };
});

import { InventoryPage } from "./InventoryPage";

function pintar() {
  render(
    <MantineProvider>
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("InventoryPage · interruptor «Activo»", () => {
  beforeEach(() => {
    espias.actualizar.mockReset().mockResolvedValue({});
    espias.aviso.mockReset();
  });

  it("apaga un producto activo mandando solo is_active y avisa", async () => {
    pintar();
    fireEvent.click(screen.getByRole("switch", { name: "Desactivar Proteína" }));

    await waitFor(() => expect(espias.actualizar).toHaveBeenCalledTimes(1));
    expect(espias.actualizar).toHaveBeenCalledWith({ id: "p-1", body: { is_active: false } });
    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(
        expect.objectContaining({ color: "teal", message: "«Proteína» ya no aparece en el Punto de venta." }),
      ),
    );
  });

  it("enciende un producto inactivo", async () => {
    pintar();
    fireEvent.click(screen.getByRole("switch", { name: "Activar Creatina" }));

    await waitFor(() =>
      expect(espias.actualizar).toHaveBeenCalledWith({ id: "p-2", body: { is_active: true } }),
    );
  });

  it("si el servidor lo rechaza, avisa en rojo", async () => {
    espias.actualizar.mockRejectedValue(new Error("red"));
    pintar();
    fireEvent.click(screen.getByRole("switch", { name: "Desactivar Proteína" }));

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(expect.objectContaining({ color: "red" })),
    );
  });
});

describe("InventoryPage · «Entrada» rápida", () => {
  beforeEach(() => {
    espias.movimiento.mockReset().mockResolvedValue({});
    espias.aviso.mockReset();
  });

  const fila = () => screen.getAllByPlaceholderText("Qty")[0];
  const entrada = () => screen.getAllByRole("button", { name: "Entrada" })[0];

  it.each(["", "abc", "0", "3.5", "-2"])("con cantidad %j avisa y no registra nada", async (valor) => {
    pintar();
    fireEvent.change(fila(), { target: { value: valor } });
    fireEvent.click(entrada());

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(expect.objectContaining({ color: "yellow" })),
    );
    expect(espias.movimiento).not.toHaveBeenCalled();
  });

  it("con un entero válido registra la entrada", async () => {
    pintar();
    fireEvent.change(fila(), { target: { value: "4" } });
    fireEvent.click(entrada());

    await waitFor(() =>
      expect(espias.movimiento).toHaveBeenCalledWith(expect.objectContaining({ type: "purchase", qty: 4 })),
    );
  });
});
