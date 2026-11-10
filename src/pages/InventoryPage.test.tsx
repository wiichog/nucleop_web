// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Productos: el catálogo en tarjetas; tocar una abre su ficha (activo, ajuste de
 * stock, editar, movimientos). Se prueba lo que cuesta dinero o confunde:
 * el interruptor «Activo» manda solo `is_active`, la entrada rechaza cantidades
 * inválidas, editar dice el motivo del servidor, y lo que se acaba sale contado.
 */

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

// El Combobox de Mantine desplaza la opción activa; jsdom no lo implementa.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const espias = vi.hoisted(() => ({
  actualizar: vi.fn(),
  crear: vi.fn(),
  movimiento: vi.fn(),
  aviso: vi.fn(),
  subirGaleria: vi.fn(),
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
        producto({ id: "p-3", name: "Camiseta", category: "merch", is_active: true }),
        // Se está acabando: cuenta para «por reabastecer».
        producto({ id: "p-4", name: "Barra", is_active: true, stock_qty: 1, reorder_level: 3, needs_reorder: true }),
        // Un licuado nunca cuenta, aunque el backend lo marque: no tiene stock propio.
        producto({
          id: "p-5",
          name: "Licuado",
          is_active: true,
          stock_qty: 0,
          needs_reorder: true,
          is_composite: true,
          components: [{ component: "p-1", component_name: "Proteína", qty: 1 }],
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateErpProduct: () => mutacion(espias.crear),
    useUpdateErpProduct: () => mutacion(espias.actualizar),
    useDeleteErpProduct: () => mutacion(),
    useCreateErpMovement: () => mutacion(espias.movimiento),
    useInventoryCount: () => mutacion(),
    useUploadProductPhoto: () => mutacion(),
    useUploadProductImages: () => mutacion(espias.subirGaleria),
    useDeleteProductImage: () => mutacion(),
    usePendingSummary: () => ({ data: undefined }),
  };
});

import { InventoryPage } from "./InventoryPage";

function pintar() {
  render(
    <MantineProvider env="test">
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Toca la tarjeta del producto y espera su ficha (el modal entra con transición). */
async function abrir(nombre: string) {
  fireEvent.click(screen.getByRole("button", { name: `Abrir ${nombre}` }));
  await screen.findByRole("button", { name: "Editar" });
}

describe("InventoryPage · interruptor «Activo»", () => {
  beforeEach(() => {
    espias.actualizar.mockReset().mockResolvedValue({});
    espias.aviso.mockReset();
  });

  it("apaga un producto activo mandando solo is_active y avisa", async () => {
    pintar();
    await abrir("Proteína");
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
    await abrir("Creatina");
    fireEvent.click(screen.getByRole("switch", { name: "Activar Creatina" }));

    await waitFor(() =>
      expect(espias.actualizar).toHaveBeenCalledWith({ id: "p-2", body: { is_active: true } }),
    );
  });

  it("si el servidor lo rechaza, avisa en rojo", async () => {
    espias.actualizar.mockRejectedValue(new Error("red"));
    pintar();
    await abrir("Proteína");
    fireEvent.click(screen.getByRole("switch", { name: "Desactivar Proteína" }));

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(expect.objectContaining({ color: "red" })),
    );
  });
});

describe("InventoryPage · «Registrar entrada» desde la ficha", () => {
  beforeEach(() => {
    espias.movimiento.mockReset().mockResolvedValue({});
    espias.aviso.mockReset();
  });

  const fila = () => screen.getByLabelText("Unidades que llegaron");
  const entrada = () => screen.getByRole("button", { name: "Registrar entrada" });

  it.each(["", "abc", "0", "3.5", "-2"])("con cantidad %j avisa y no registra nada", async (valor) => {
    pintar();
    await abrir("Proteína");
    fireEvent.change(fila(), { target: { value: valor } });
    fireEvent.click(entrada());

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(expect.objectContaining({ color: "yellow" })),
    );
    expect(espias.movimiento).not.toHaveBeenCalled();
  });

  it("con un entero válido registra la entrada del producto abierto", async () => {
    pintar();
    await abrir("Proteína");
    fireEvent.change(fila(), { target: { value: "4" } });
    fireEvent.click(entrada());

    await waitFor(() =>
      expect(espias.movimiento).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: "p-1", type: "purchase", qty: 4 }),
      ),
    );
  });
});

describe("InventoryPage · «Subir» de la galería", () => {
  beforeEach(() => {
    espias.subirGaleria.mockReset();
    espias.aviso.mockReset();
  });

  async function elegirFotoYSubir() {
    pintar();
    await abrir("Proteína");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    // La galería es de la tienda del app: aparece al venderlo ahí.
    fireEvent.click(await screen.findByRole("switch", { name: "Vender en la tienda del app" }));
    const input = await waitFor(() => {
      const el = document.querySelector<HTMLInputElement>('input[type="file"][multiple]');
      if (!el) throw new Error("sin input de galería");
      return el;
    });
    fireEvent.change(input, { target: { files: [new File(["x"], "foto.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Subir" }));
  }

  it("si el servidor la rechaza, avisa en rojo y conserva las fotos elegidas", async () => {
    espias.subirGaleria.mockRejectedValue(new Error("red"));
    await elegirFotoYSubir();

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(expect.objectContaining({ color: "red" })),
    );
    expect(espias.aviso).not.toHaveBeenCalledWith(expect.objectContaining({ color: "teal" }));
    expect((screen.getByRole("button", { name: "Subir" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("si sube, avisa en verde", async () => {
    espias.subirGaleria.mockResolvedValue({});
    await elegirFotoYSubir();

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(
        expect.objectContaining({ color: "teal", message: "Imágenes agregadas." }),
      ),
    );
  });
});

describe("InventoryPage · «Guardar» al editar un producto", () => {
  beforeEach(() => {
    espias.actualizar.mockReset();
    espias.aviso.mockReset();
  });

  async function editarYGuardar() {
    pintar();
    await abrir("Proteína");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
  }

  it("si el servidor lo rechaza, dice el motivo del servidor (antes solo «No se pudo actualizar.»)", async () => {
    espias.actualizar.mockRejectedValue({
      response: { data: { detail: "El precio de venta no puede ser negativo." } },
    });
    await editarYGuardar();

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(
        expect.objectContaining({ color: "red", message: "El precio de venta no puede ser negativo." }),
      ),
    );
    expect(espias.aviso).not.toHaveBeenCalledWith(expect.objectContaining({ color: "teal" }));
  });

  it("sin motivo del servidor, cae a un mensaje que nombra el producto", async () => {
    espias.actualizar.mockRejectedValue(new Error("red"));
    await editarYGuardar();

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(
        expect.objectContaining({ color: "red", message: "No se pudo actualizar el producto." }),
      ),
    );
  });

  it("si guarda, avisa en verde", async () => {
    espias.actualizar.mockResolvedValue({});
    await editarYGuardar();

    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(
        expect.objectContaining({ color: "teal", message: "Producto actualizado." }),
      ),
    );
  });
});

describe("InventoryPage · lo que se acaba al frente", () => {
  it("cuenta solo lo activo que se acaba, sin el preparado", () => {
    pintar();
    expect(screen.getByRole("button", { name: "1 por reabastecer" })).toBeTruthy();
  });

  it("el contador filtra a lo que hay que reabastecer", () => {
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "1 por reabastecer" }));
    expect(screen.getByRole("button", { name: "Abrir Barra" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abrir Proteína" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Abrir Licuado" })).toBeNull();
  });
});

describe("InventoryPage · «Nuevo producto»", () => {
  beforeEach(() => {
    espias.crear.mockReset().mockResolvedValue({ id: "p-9" });
    espias.aviso.mockReset();
  });

  it("crea en la misma ventana de la edición y avisa", async () => {
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));
    const crear = await screen.findByRole("button", { name: "Crear producto" });
    expect((crear as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Agua" } });
    fireEvent.change(screen.getByLabelText("Precio (Q)"), { target: { value: "10" } });
    fireEvent.click(crear);

    await waitFor(() => expect(espias.crear).toHaveBeenCalledTimes(1));
    expect(espias.crear.mock.calls[0][0]).toMatchObject({ name: "Agua", sale_price: "10", cost_price: "0", components: [] });
    await waitFor(() =>
      expect(espias.aviso).toHaveBeenCalledWith(expect.objectContaining({ color: "teal", message: "Producto creado." })),
    );
  });
});

describe("InventoryPage · categoría en español", () => {
  it("muestra la categoría en español, no la llave interna", () => {
    pintar();
    expect(screen.getAllByText("Suplemento").length).toBeGreaterThan(0);
    expect(screen.queryByText("supplement")).toBeNull();
  });

  it("el buscador encuentra por el nombre en español de la categoría", () => {
    pintar();
    fireEvent.change(screen.getByPlaceholderText("Buscar producto o categoría…"), {
      target: { value: "suplemento" },
    });
    expect(screen.getByText("Proteína")).toBeTruthy();
    expect(screen.queryByText("Camiseta")).toBeNull();
  });
});
