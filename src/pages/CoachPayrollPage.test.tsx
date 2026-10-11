// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pagos a coaches: los campos de número guardan solos al salir del campo.
 *
 * Lo que se prueba es que la pantalla no mienta cuando el guardado falla: antes
 * salía el aviso rojo pero el campo seguía mostrando el número rechazado, y el
 * dueño creía que la tarifa nueva había quedado.
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

const estado = vi.hoisted(() => ({
  /** Si el guardado del coach falla. */
  falla: false,
  enviados: [] as Record<string, unknown>[],
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; title?: string; message?: string }[] }));

const coach = {
  staff_role: "sr-1",
  name: "Ana Coach",
  email: "ana@demo.nucleo.fit",
  photo: null,
  pay_type: "per_class",
  per_class_rate: "50.00",
  fixed_amount: "0.00",
  offers_pt: true,
  pt_price: "200.00",
  pt_commission_pct: "0.5000",
};

vi.mock("../api/hooks", () => ({
  useGymCoaches: () => ({ data: [coach], isError: false, isLoading: false, refetch: vi.fn() }),
  useUpdateCoach: () => ({
    mutate: (
      vars: { staffId: string; body: Record<string, unknown> },
      opts?: { onError?: (e: unknown) => void },
    ) => {
      estado.enviados.push(vars.body);
      if (estado.falla) opts?.onError?.(new Error("rechazado"));
    },
  }),
  useCoachPayouts: () => ({ data: [], isError: false, isLoading: false, refetch: vi.fn() }),
  useGeneratePayout: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePayPayout: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { CoachPayrollPage, filasLiquidacion } from "./CoachPayrollPage";

function pintar() {
  return render(
    <MantineProvider>
      <CoachPayrollPage />
    </MantineProvider>,
  );
}

/** Los campos con prefijo Q, en orden: tarifa por clase, salario fijo, precio PT. */
const camposQ = () =>
  screen.getAllByRole("textbox").filter((el) => (el as HTMLInputElement).value.startsWith("Q"));

beforeEach(() => {
  estado.falla = false;
  estado.enviados = [];
  avisos.show = [];
});

describe("pagos a coaches", () => {
  it("si el guardado falla, la tarifa vuelve al valor guardado", async () => {
    estado.falla = true;
    pintar();

    const tarifa = camposQ()[0] as HTMLInputElement;
    expect(tarifa.value).toBe("Q50");
    fireEvent.change(tarifa, { target: { value: "Q75" } });
    fireEvent.blur(tarifa);

    expect(estado.enviados).toEqual([{ per_class_rate: "75" }]);
    expect(avisos.show[0]?.color).toBe("red");
    await waitFor(() => expect((camposQ()[0] as HTMLInputElement).value).toBe("Q50"));
  });

  it("si el guardado sale bien, el campo conserva lo escrito", () => {
    pintar();

    const tarifa = camposQ()[0] as HTMLInputElement;
    fireEvent.change(tarifa, { target: { value: "Q75" } });
    fireEvent.blur(tarifa);

    expect(avisos.show).toHaveLength(0);
    expect((camposQ()[0] as HTMLInputElement).value).toBe("Q75");
  });

  // La tabla «Liquidaciones» no se pinta bajo jsdom (mantine-datatable), así
  // que se prueba la fila que recibe: el nombre sale de la lista de coaches.
  it("la liquidación lleva el nombre del coach y, si ya no está, su correo", () => {
    const base = {
      period_start: "2026-10-01",
      period_end: "2026-10-10",
      total: "150.00",
      status: "open" as const,
      paid_at: null,
      earnings_count: 3,
      created_at: "2026-10-10T12:00:00Z",
    };
    const filas = filasLiquidacion(
      [
        { ...base, id: "p-1", coach: "sr-1", coach_email: "ana@demo.nucleo.fit" },
        { ...base, id: "p-2", coach: "sr-9", coach_email: "ex@demo.nucleo.fit" },
      ],
      [coach],
    );
    expect(filas.map((f) => f.coach_name)).toEqual(["Ana Coach", "ex@demo.nucleo.fit"]);
  });
});
