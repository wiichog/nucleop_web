// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Kardex, mermas y ajustes. Se prueba lo único cuyo fallo cuesta dinero de verdad:
 *
 *  1. Que el conteo físico mande lo **contado** y no la diferencia. Si el panel
 *     restara, una venta ocurrida entre leer el stock y aplicar el ajuste quedaría
 *     borrada del inventario.
 *  2. Que la merma y el ajuste no se confundan: la merma entra al ledger como
 *     `loss` (el P&L la valoriza como pérdida) y el conteo va por su propio
 *     endpoint. Meterlos en el mismo botón fue justo el bug que el backend acaba
 *     de arreglar: un error de captura se contabilizaba como pérdida.
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
// El Combobox de Mantine desplaza la opción activa; jsdom no lo implementa.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const espias = vi.hoisted(() => ({
  movimiento: vi.fn(),
  conteo: vi.fn(),
}));

vi.mock("../api/hooks", () => {
  const mutacion = (fn: ReturnType<typeof vi.fn>) => ({
    mutateAsync: fn,
    mutate: fn,
    isPending: false,
  });
  return {
    useErpProducts: () => ({
      data: [{ id: "prod-1", name: "Proteína", stock_qty: 12, category: "supplement" }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useErpMovements: () => ({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateErpMovement: () => mutacion(espias.movimiento),
    useInventoryCount: () => mutacion(espias.conteo),
  };
});

import { InventoryLedgerPanel } from "./InventoryLedgerPanel";

/**
 * Elige "Proteína" en uno de los dos selectores "Producto" (Mantine 7 =
 * combobox): 0 = el de la merma, 1 = el del conteo, en ese orden en el DOM.
 */
function elegirProducto(formulario: 0 | 1) {
  fireEvent.click(screen.getAllByLabelText("Producto")[formulario]);
  const opcion = screen.getAllByRole("option").find((o) => o.textContent?.includes("Proteína"));
  if (!opcion) throw new Error("El producto no apareció en el selector");
  fireEvent.click(opcion);
}

function pintar() {
  render(
    <MantineProvider>
      <InventoryLedgerPanel gymId="gym-1" />
    </MantineProvider>,
  );
}

describe("InventoryLedgerPanel", () => {
  beforeEach(() => {
    espias.movimiento.mockReset().mockResolvedValue({});
    espias.conteo
      .mockReset()
      .mockResolvedValue({ previous_qty: 12, counted_qty: 9, delta: -3, stock_qty: 9 });
  });

  it("el conteo manda las unidades CONTADAS, nunca la diferencia", async () => {
    pintar();

    elegirProducto(1);
    fireEvent.change(screen.getByLabelText("Unidades contadas"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar conteo" }));

    await waitFor(() => expect(espias.conteo).toHaveBeenCalledTimes(1));
    const enviado = espias.conteo.mock.calls[0][0];
    expect(enviado.counted_qty).toBe(9);
    expect(enviado.product_id).toBe("prod-1");
    // Lo que NUNCA debe viajar: la resta ya hecha por el cliente.
    expect(enviado).not.toHaveProperty("delta");
    expect(enviado.counted_qty).not.toBe(-3);
  });

  it("avisa la diferencia prevista sin comprometerse: la calcula el backend", () => {
    pintar();

    elegirProducto(1);
    fireEvent.change(screen.getByLabelText("Unidades contadas"), { target: { value: "9" } });

    expect(screen.getByText(/Faltarían 3 unidades/)).toBeTruthy();
    expect(screen.getByText(/La diferencia definitiva la calcula el backend/)).toBeTruthy();
  });

  it("la merma entra al ledger como pérdida (`loss`), no como ajuste", async () => {
    pintar();

    elegirProducto(0);
    fireEvent.change(screen.getByLabelText("Cantidad perdida"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar merma" }));

    await waitFor(() => expect(espias.movimiento).toHaveBeenCalledTimes(1));
    expect(espias.movimiento.mock.calls[0][0]).toMatchObject({
      product_id: "prod-1",
      type: "loss",
      qty: 2,
    });
    // La merma no pasa por el endpoint de conteo: son dos hechos distintos.
    expect(espias.conteo).not.toHaveBeenCalled();
  });

  it("dar de baja más unidades de las que hay avisa que eso quizá no es una merma", () => {
    pintar();

    elegirProducto(0);
    fireEvent.change(screen.getByLabelText("Cantidad perdida"), { target: { value: "20" } });

    expect(screen.getByText(/el stock quedará en negativo/i)).toBeTruthy();
    expect(screen.getByText(/usa el conteo físico/i)).toBeTruthy();
  });
});
