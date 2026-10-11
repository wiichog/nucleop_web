// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proveedores: la baja tiene que poder deshacerse. Antes «Dar de baja» mandaba
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
  borrar: vi.fn(),
}));

// `mantine-datatable` no pinta celdas bajo jsdom: se cambia por una tabla mínima
// que sí llama al `render` de cada columna, que es donde viven los botones.
vi.mock("mantine-datatable", () => ({
  DataTable: ({
    records,
    columns,
  }: {
    records: Array<Record<string, unknown>>;
    columns: Array<{ accessor: string; render?: (r: Record<string, unknown>) => unknown }>;
  }) => (
    <table>
      <tbody>
        {records.map((r) => (
          <tr key={String(r.id)}>
            {columns.map((c) => (
              <td key={c.accessor}>{(c.render ? c.render(r) : r[c.accessor]) as never}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
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
    useCreateErpSupplier: () => mutacion(vi.fn()),
    useUpdateErpSupplier: () => mutacion(espias.actualizar),
    useDeleteErpSupplier: () => mutacion(espias.borrar),
  };
});

import { SuppliersPanel } from "./SuppliersPanel";

function pintar() {
  render(
    <MantineProvider>
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

  it("un proveedor inactivo ofrece «Reactivar» y lo reactiva por PATCH", async () => {
    pintar();

    // Una sola fila inactiva → un solo «Reactivar» (y un solo «Dar de baja»).
    const reactivar = screen.getAllByRole("button", { name: "Reactivar" });
    expect(reactivar).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Dar de baja" })).toHaveLength(1);

    fireEvent.click(reactivar[0]);
    await waitFor(() => expect(espias.actualizar).toHaveBeenCalledTimes(1));
    expect(espias.actualizar.mock.calls[0][0]).toEqual({
      id: "sup-2",
      body: { is_active: true },
    });
  });

  it("dar de baja marca inactivo (reversible), nunca borra", async () => {
    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));
    await waitFor(() => expect(espias.actualizar).toHaveBeenCalledTimes(1));
    expect(espias.actualizar.mock.calls[0][0]).toEqual({
      id: "sup-1",
      body: { is_active: false },
    });
    expect(espias.borrar).not.toHaveBeenCalled();
  });
});
