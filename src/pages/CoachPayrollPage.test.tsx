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
  facturas: [] as { payoutId: string; file: File }[],
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
  useUploadPayoutInvoice: () => ({
    isPending: false,
    mutate: (vars: { payoutId: string; file: File }, opts?: { onSuccess?: () => void }) => {
      estado.facturas.push(vars);
      opts?.onSuccess?.();
    },
  }),
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

import type { Coach, CoachPayout } from "../api/types";
import { cambiosDeCoach, CoachPayrollPage, filasLiquidacion } from "./CoachPayrollPage";

// Abrir una ventana de Mantine bajo jsdom es lento; con la máquina cargada
// (varias suites a la vez) estas pruebas rozaban el límite de 5 s.
vi.setConfig({ testTimeout: 20_000 });

/**
 * El botón de una ventana por su texto. `getByRole` recorre el árbol de
 * accesibilidad entero y, con la máquina cargada, estas pruebas pasaban de los
 * 5 s; el texto exacto basta para saber de qué botón se trata.
 */
function boton(ventana: HTMLElement, texto: string | RegExp): HTMLButtonElement {
  // El título de la ventana puede decir lo mismo que su botón («Registrar pago»).
  const el = within(ventana)
    .getAllByText(texto)
    .map((t) => t.closest("button"))
    .find(Boolean);
  if (!el) throw new Error(`No hay botón «${texto}»`);
  return el as HTMLButtonElement;
}

/** Liquidación como la manda el backend, con lo que cada prueba quiera cambiar. */
function liquidacion(cambios: Partial<CoachPayout> = {}): CoachPayout {
  return {
    id: "p-1",
    coach: "sr-1",
    coach_email: "ana@demo.nucleo.fit",
    coach_name: "Ana Coach",
    gym_name: "Box Demo",
    period_start: "2026-10-01",
    period_end: "2026-10-31",
    total: "150.00",
    status: "open",
    paid_at: null,
    earnings_count: 2,
    invoice_url: null,
    invoice_name: null,
    invoice_uploaded_at: null,
    created_at: "2026-11-01T12:00:00Z",
    ...cambios,
  };
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
  estado.facturas = [];
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
    estado.payouts = [liquidacion()];
    pintar();

    fireEvent.click(screen.getByRole("button", { name: /^Liquidación de Ana Coach/ }));
    const ventana = await screen.findByRole("dialog");
    // El periodo se lee en días de Guatemala, sin correrse por la zona horaria.
    expect(within(ventana).getByText("1/10/2026 – 31/10/2026")).toBeTruthy();
    // El botón lleva el monto: «Marcar pagada · Q150.00».
    fireEvent.click(boton(ventana, /^Marcar pagada · Q\s?150\.00$/));

    expect(estado.pagadas).toEqual(["p-1"]);
    expect(avisos.show[0]?.color).toBe("teal");
  });

  // La tabla «Liquidaciones» no se pinta bajo jsdom (mantine-datatable), así
  // que se prueba la fila que recibe: el nombre sale de la lista de coaches.
  it("la liquidación lleva el nombre del coach y, si ya no está, su correo", () => {
    const filas = filasLiquidacion(
      [
        liquidacion({ id: "p-1", coach: "sr-1" }),
        liquidacion({ id: "p-2", coach: "sr-9", coach_name: "", coach_email: "ex@demo.nucleo.fit" }),
        // Ya no está en la lista, pero el backend manda su nombre.
        liquidacion({ id: "p-3", coach: "sr-8", coach_name: "Beto Ex", coach_email: "beto@demo.nucleo.fit" }),
      ],
      [coach],
    );
    expect(filas.map((f) => f.coach_name)).toEqual(["Ana Coach", "ex@demo.nucleo.fit", "Beto Ex"]);
  });

  it("con factura, la ventana la deja bajar y la tarjeta lo dice", async () => {
    estado.payouts = [
      liquidacion({
        invoice_url: "https://s3.example/coach-invoices/f.pdf?firma=1",
        invoice_name: "fel-octubre.pdf",
        invoice_uploaded_at: "2026-11-02T15:00:00Z",
      }),
    ];
    pintar();
    expect(screen.getByText(/· con factura$/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Liquidación de Ana Coach/ }));
    const ventana = await screen.findByRole("dialog");
    const enlace = within(ventana).getByText("Descargar factura").closest("a") as HTMLAnchorElement;
    expect(enlace.href).toBe("https://s3.example/coach-invoices/f.pdf?firma=1");
    expect(enlace.target).toBe("_blank");
    expect(within(ventana).getByText(/fel-octubre\.pdf/)).toBeTruthy();
    expect(boton(ventana, "Reemplazar")).toBeTruthy();
  });

  it("sin factura, avisa sin bloquear el pago y el admin la sube por el coach", async () => {
    estado.payouts = [liquidacion()];
    pintar();
    expect(screen.getByText(/· sin factura$/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Liquidación de Ana Coach/ }));
    const ventana = await screen.findByRole("dialog");
    expect(within(ventana).getByText("El coach todavía no sube su factura.")).toBeTruthy();
    // Pagar sigue disponible: la factura no frena la nómina.
    expect(boton(ventana, /^Marcar pagada/).disabled).toBe(false);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain(".xml");
    const archivo = new File(["%PDF"], "fel.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [archivo] } });
    await waitFor(() => expect(estado.facturas).toHaveLength(1));
    expect(estado.facturas[0]).toEqual({ payoutId: "p-1", file: archivo });
    expect(avisos.show[avisos.show.length - 1]?.color).toBe("teal");
  });
});
