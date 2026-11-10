// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gastos: se ve el mes con su total, «Nuevo gasto» abre la ventana de alta y
 * tocar un gasto abre lo que se le puede hacer. Lo que se protege es lo que
 * llega al servidor (mismo cuerpo de alta y de anulación) y que la suma no
 * cuente los anulados.
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
  gastos: [] as unknown[],
  creados: [] as unknown[],
  anulados: [] as unknown[],
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

const mutacion = (destino: () => unknown[]) => ({
  isPending: false,
  mutateAsync: async (body: unknown) => {
    destino().push(body);
    return { amount: "0.00" };
  },
});

vi.mock("../api/hooks", () => ({
  useErpExpenses: () => ({ isLoading: false, isError: false, data: estado.gastos }),
  useBranches: () => ({ data: [] }),
  useCreateErpExpense: () => mutacion(() => estado.creados),
  useVoidErpExpense: () => mutacion(() => estado.anulados),
  useCorrectErpExpense: () => mutacion(() => []),
  useUploadExpenseProof: () => mutacion(() => []),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1" }),
}));

import { ExpensesPage } from "./ExpensesPage";

const hoyIso = new Date().toLocaleDateString("en-CA");

const gasto = (over: Record<string, unknown>) => ({
  id: "g",
  branch: null,
  category: "rent",
  amount: "100.00",
  description: "",
  incurred_on: hoyIso,
  proof_url: "",
  proof_file: "",
  is_void: false,
  voided_at: null,
  void_reason: "",
  replaces: null,
  replaced_by: null,
  created_at: `${hoyIso}T10:00:00Z`,
  ...over,
});

function pintar() {
  return render(
    <MantineProvider>
      <DatesProvider settings={{}}>
        <ExpensesPage />
      </DatesProvider>
    </MantineProvider>,
  );
}

/** El botón que lleva ese texto (getByRole es lentísimo en jsdom con la pantalla entera). */
function boton(texto: string | RegExp): HTMLButtonElement {
  const b = screen.getByText(texto).closest("button");
  if (!b) throw new Error(`Sin botón: ${texto}`);
  return b;
}

beforeEach(() => {
  estado.gastos = [];
  estado.creados = [];
  estado.anulados = [];
  avisos.show = [];
});

describe("Gastos", { timeout: 30_000 }, () => {
  it("el mes se ve con su total, sin contar el anulado, y avisa los que no tienen comprobante", () => {
    estado.gastos = [
      gasto({ id: "luz", category: "utilities", description: "Luz", amount: "250.00" }),
      gasto({ id: "renta", amount: "1000.00", proof_file: "https://x/f.pdf" }),
      gasto({ id: "doble", description: "Doble", amount: "80.00", is_void: true }),
    ];
    pintar();
    expect(screen.getByLabelText(/^Total Q\s?1,250\.00$/)).toBeTruthy();
    expect(screen.getByText(/1 anulado o corregido no suman/)).toBeTruthy();
    // Solo «Luz» está vigente y sin comprobante.
    fireEvent.click(boton("1 sin comprobante"));
    expect(screen.queryByText("Doble")).toBeNull();
    expect(screen.getByLabelText(/^Total Q\s?250\.00$/)).toBeTruthy();
  });

  it("«Nuevo gasto» abre la ventana y «Registrar» manda el mismo cuerpo de siempre", async () => {
    pintar();
    fireEvent.click(boton("Nuevo gasto"));
    fireEvent.change(await screen.findByLabelText("Monto"), { target: { value: "350.75" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Agua pura" } });
    await act(async () => {
      fireEvent.click(boton("Registrar"));
    });
    expect(estado.creados).toEqual([
      {
        category: "rent",
        amount: "350.75",
        description: "Agua pura",
        incurred_on: hoyIso,
        branch: undefined,
        proof_file: undefined,
      },
    ]);
    expect(avisos.show).toContainEqual({ color: "teal", message: "Gasto registrado." });
  });

  it("tocar un gasto abre sus acciones; «Anular» pide el motivo", async () => {
    estado.gastos = [gasto({ id: "luz", category: "utilities", description: "Luz", amount: "250.00" })];
    pintar();
    fireEvent.click(screen.getByLabelText(/^Luz, /));
    fireEvent.click(await screen.findByText("Anular"));
    const motivo = await screen.findByLabelText("Motivo");
    const anular = () => screen.getAllByText("Anular").map((n) => n.closest("button")!).pop()!;
    expect(anular().disabled).toBe(true);
    fireEvent.change(motivo, { target: { value: "se capturó dos veces" } });
    await act(async () => {
      fireEvent.click(anular());
    });
    expect(estado.anulados).toEqual([{ id: "luz", reason: "se capturó dos veces" }]);
  });

  it("un gasto anulado solo se consulta: sin «Corregir», «Anular» ni comprobante", async () => {
    estado.gastos = [gasto({ id: "x", description: "Doble", is_void: true, void_reason: "duplicado" })];
    pintar();
    fireEvent.click(screen.getByLabelText(/^Doble, /));
    expect(await screen.findByText("duplicado")).toBeTruthy();
    expect(screen.queryByText("Corregir")).toBeNull();
    expect(screen.queryByText("Adjuntar comprobante")).toBeNull();
  });
});
