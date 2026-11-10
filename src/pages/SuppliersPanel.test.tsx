// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proveedores en tarjetas; tocar uno abre su ventana con «Dar de baja» o
 * «Reactivar». La baja tiene que poder deshacerse. Antes «Dar de baja» mandaba
 * DELETE (soft-delete con `deleted_at`) y el listado del backend lo esconde
 * hasta del filtro «Inactivos», así que no había cómo reactivarlo. Ahora baja y
 * reactivación son el mismo PATCH sobre `is_active`.
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

const espias = vi.hoisted(() => ({
  actualizar: vi.fn(),
  crear: vi.fn(),
  borrar: vi.fn(),
}));

vi.mock("../api/hooks", () => {
  const mutacion = (fn: ReturnType<typeof vi.fn>) => ({
    mutateAsync: fn,
    mutate: fn,
    isPending: false,
  });
  return {
    useErpSuppliers: () => ({
      data: [
        { id: "sup-1", name: "Distribuidora Activa", is_active: true },
        { id: "sup-2", name: "Proveedor Viejo", is_active: false },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateErpSupplier: () => mutacion(espias.crear),
    useUpdateErpSupplier: () => mutacion(espias.actualizar),
    useDeleteErpSupplier: () => mutacion(espias.borrar),
  };
});

import { SuppliersPanel } from "./SuppliersPanel";

function pintar() {
  render(
    <MantineProvider env="test">
      <SuppliersPanel gymId="gym-1" />
    </MantineProvider>,
  );
}

describe("SuppliersPanel", () => {
  beforeEach(() => {
    espias.actualizar.mockReset().mockResolvedValue({});
    espias.borrar.mockReset().mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("un proveedor inactivo ofrece «Reactivar» (no «Dar de baja») y lo reactiva por PATCH", async () => {
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Abrir Proveedor Viejo" }));
    const reactivar = await screen.findByRole("button", { name: "Reactivar" });
    expect(screen.queryByRole("button", { name: "Dar de baja" })).toBeNull();
    fireEvent.click(reactivar);
    await waitFor(() => expect(espias.actualizar).toHaveBeenCalledTimes(1));
    expect(espias.actualizar.mock.calls[0][0]).toEqual({
      id: "sup-2",
      body: { is_active: true },
    });
  });

  it("dar de baja marca inactivo (reversible), nunca borra", async () => {
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Abrir Distribuidora Activa" }));
    const baja = await screen.findByRole("button", { name: "Dar de baja" });
    expect(screen.queryByRole("button", { name: "Reactivar" })).toBeNull();
    fireEvent.click(baja);
    await waitFor(() => expect(espias.actualizar).toHaveBeenCalledTimes(1));
    expect(espias.actualizar.mock.calls[0][0]).toEqual({
      id: "sup-1",
      body: { is_active: false },
    });
    expect(espias.borrar).not.toHaveBeenCalled();
  });

  it("alta y edición son la misma ventana: «Nuevo proveedor» crea con lo escrito", async () => {
    espias.crear.mockReset().mockResolvedValue({});
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    const crear = (await screen.findByRole("button", { name: "Crear proveedor" })) as HTMLButtonElement;
    expect(crear.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Suplementos GT" } });
    fireEvent.change(screen.getByLabelText("NIT"), { target: { value: "123" } });
    fireEvent.click(crear);

    await waitFor(() => expect(espias.crear).toHaveBeenCalledTimes(1));
    expect(espias.crear.mock.calls[0][0]).toMatchObject({ name: "Suplementos GT", tax_id: "123" });
  });

  it("editar abre con los datos del proveedor y guarda por PATCH", async () => {
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Abrir Distribuidora Activa" }));
    expect(((await screen.findByLabelText("Nombre")) as HTMLInputElement).value).toBe("Distribuidora Activa");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(espias.actualizar).toHaveBeenCalledTimes(1));
    expect(espias.actualizar.mock.calls[0][0]).toMatchObject({ id: "sup-1", body: { name: "Distribuidora Activa" } });
  });
});
