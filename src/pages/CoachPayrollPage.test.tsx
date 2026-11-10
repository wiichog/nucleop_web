// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pagos a coaches. La forma de pago de cada coach se edita en su ventana y se
 * guarda con «Guardar» (antes cada campo guardaba solo al salir).
 *
 * Lo que se prueba es que la pantalla no mienta cuando el guardado falla: la
 * tarjeta sigue mostrando lo guardado y la ventana se queda con lo escrito para
 * corregirlo; y que lo que viaja al servidor tenga el mismo formato de antes.
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
  pagadas: [] as string[],
  payouts: [] as Record<string, unknown>[],
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
      opts?: { onError?: (e: unknown) => void; onSuccess?: () => void; onSettled?: () => void },
    ) => {
      estado.enviados.push(vars.body);
      if (estado.falla) opts?.onError?.(new Error("rechazado"));
      else opts?.onSuccess?.();
      opts?.onSettled?.();
    },
  }),
  useCoachPayouts: () => ({ data: estado.payouts, isError: false, isLoading: false, refetch: vi.fn() }),
  useGeneratePayout: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePayPayout: () => ({
    isPending: false,
    mutate: (id: string, opts?: { onSuccess?: () => void }) => {
      estado.pagadas.push(id);
      opts?.onSuccess?.();
    },
  }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import type { Coach } from "../api/types";
import { cambiosDeCoach, CoachPayrollPage, filasLiquidacion } from "./CoachPayrollPage";

// Abrir una ventana de Mantine bajo jsdom es lento; con la máquina cargada
// (varias suites a la vez) estas pruebas rozaban el límite de 5 s.
vi.setConfig({ testTimeout: 20_000 });

/**
 * El botón de una ventana por su texto. `getByRole` recorre el árbol de
 * accesibilidad entero y, con la máquina cargada, estas pruebas pasaban de los
 * 5 s; el texto exacto basta para saber de qué botón se trata.
 */
function boton(ventana: HTMLElement, texto: string): HTMLButtonElement {
  // El título de la ventana puede decir lo mismo que su botón («Registrar pago»).
  const el = within(ventana)
    .getAllByText(texto)
    .map((t) => t.closest("button"))
    .find(Boolean);
  if (!el) throw new Error(`No hay botón «${texto}»`);
  return el as HTMLButtonElement;
}

function pintar() {
  return render(
    <MantineProvider>
      <CoachPayrollPage />
    </MantineProvider>,
  );
}

beforeEach(() => {
  estado.falla = false;
  estado.enviados = [];
  estado.pagadas = [];
  estado.payouts = [];
  avisos.show = [];
});

/** Abre la ventana del coach y cambia su tarifa por clase. */
async function cambiarTarifa(valor: string) {
  fireEvent.click(screen.getByLabelText("Pago de Ana Coach"));
  const ventana = await screen.findByRole("dialog");
  const tarifa = within(ventana).getByLabelText("Tarifa por clase") as HTMLInputElement;
  expect(tarifa.value).toBe("Q50");
  fireEvent.change(tarifa, { target: { value: valor } });
  fireEvent.click(boton(ventana, "Guardar"));
  return ventana;
}

describe("pagos a coaches", () => {
  it("la tarjeta del coach dice cómo se le paga", () => {
    pintar();
    const tarjeta = screen.getByLabelText("Pago de Ana Coach");
    expect(within(tarjeta).getByText(/Por clase · Q\s?50\.00/)).toBeTruthy();
    expect(within(tarjeta).getByText(/PT Q\s?200\.00 · 50 %/)).toBeTruthy();
  });

  it("si el guardado falla, avisa, la ventana sigue abierta y la tarjeta conserva lo guardado", async () => {
    estado.falla = true;
    pintar();

    await cambiarTarifa("Q75");

    expect(estado.enviados).toEqual([{ per_class_rate: "75" }]);
    expect(avisos.show[0]?.color).toBe("red");
    expect(screen.queryByRole("dialog")).toBeTruthy();
    expect(within(screen.getByLabelText("Pago de Ana Coach")).getByText(/Q\s?50\.00/)).toBeTruthy();
  });

  it("si el guardado sale bien, solo viaja lo que cambió y la ventana se cierra", async () => {
    pintar();

    await cambiarTarifa("Q75");

    expect(estado.enviados).toEqual([{ per_class_rate: "75" }]);
    expect(avisos.show[0]?.color).toBe("teal");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("lo que viaja tiene el formato de antes: montos como texto y comisión de 0 a 1", () => {
    const base = {
      pay_type: "per_class" as const,
      per_class_rate: 50,
      fixed_amount: 0,
      offers_pt: true,
      pt_price: 200,
      pt_commission_pct: 50,
    };
    const c = coach as unknown as Coach;
    expect(cambiosDeCoach(c, base)).toEqual({});
    expect(cambiosDeCoach(c, { ...base, pay_type: "fixed", fixed_amount: 3000 })).toEqual({
      pay_type: "fixed",
      fixed_amount: "3000",
    });
    expect(cambiosDeCoach(c, { ...base, pt_commission_pct: 40, pt_price: 250 })).toEqual({
      pt_price: "250",
      pt_commission_pct: 0.4,
    });
    // Fuera de rango se acota como antes; vacío vale 0.
    expect(cambiosDeCoach(c, { ...base, pt_commission_pct: 150 })).toEqual({ pt_commission_pct: 1 });
    expect(cambiosDeCoach(c, { ...base, per_class_rate: "" })).toEqual({ per_class_rate: "0" });
  });

  it("lo que hay que pagar va al frente y se marca pagado desde su ventana", async () => {
    estado.payouts = [
      {
        id: "p-1",
        coach: "sr-1",
        coach_email: "ana@demo.nucleo.fit",
        period_start: "2026-10-01",
        period_end: "2026-10-31",
        total: "150.00",
        status: "open",
        paid_at: null,
        earnings_count: 2,
        created_at: "2026-11-01T12:00:00Z",
      },
    ];
    pintar();

    fireEvent.click(screen.getByRole("button", { name: /^Liquidación de Ana Coach/ }));
    const ventana = await screen.findByRole("dialog");
    // El periodo se lee en días de Guatemala, sin correrse por la zona horaria.
    expect(within(ventana).getByText("1/10/2026 – 31/10/2026")).toBeTruthy();
    fireEvent.click(boton(ventana, "Marcar pagada"));

    expect(estado.pagadas).toEqual(["p-1"]);
    expect(avisos.show[0]?.color).toBe("teal");
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
