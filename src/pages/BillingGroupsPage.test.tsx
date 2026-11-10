// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Planes grupales con el diseño de Clases: los grupos son tarjetas, lo pendiente
 * (cuota esperando al titular) sale en amarillo con su contador y tocar un grupo
 * abre su ficha, desde donde se agrega, se quita, se edita y se cierra.
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
  enviado: [] as { hook: string; vars: unknown }[],
  planes: [] as unknown[],
  grupos: [] as unknown[],
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

vi.mock("../api/hooks", () => {
  const consulta = (data: () => unknown) => () => ({
    data: data(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  const mutacion = (hook: string) => () => ({
    isPending: false,
    mutateAsync: async (vars: unknown) => {
      estado.enviado.push({ hook, vars });
      return { id: "g-nuevo", name: "nuevo" };
    },
  });
  return {
    useBillingGroups: consulta(() => estado.grupos),
    usePlans: consulta(() => estado.planes),
    useMemberships: consulta(() => []),
    useCreateBillingGroup: mutacion("crear"),
    useUpdateBillingGroup: mutacion("editar"),
    useCloseBillingGroup: mutacion("cerrar"),
    useAddBillingGroupMember: mutacion("agregar"),
    useRemoveBillingGroupMember: mutacion("quitar"),
    useAddBillingGroupDependent: mutacion("dependiente"),
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1" }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

import { BillingGroupsPage } from "./BillingGroupsPage";

const PLAN_FAMILIAR = {
  id: "pf",
  name: "Familiar x4",
  price: "1200.00",
  group_kind: "family",
  max_members: 4,
  is_active: true,
};
const GRUPO = {
  id: "g1",
  kind: "family",
  name: "Familia Pérez",
  plan: "pf",
  plan_name: "Familiar x4",
  payer: "a-titular",
  payer_name: "Ana Pérez",
  custom_fee: null,
  effective_fee: "1200.00",
  max_members: null,
  seats: 4,
  seats_used: 1,
  billing_nit: "",
  billing_name: "",
  billing_email: "",
  renewal_date: null,
  payment_status: "up_to_date",
  is_active: true,
  open_payment: "pay-1",
  created_at: "2026-11-01T00:00:00Z",
  members: [
    {
      membership_id: "m1",
      athlete: "a-luis",
      athlete_name: "Luis Pérez",
      is_dependent: false,
      status: "active",
      status_display: "Activa",
    },
  ],
};

function montar() {
  render(
    <MantineProvider>
      <MemoryRouter>
        <BillingGroupsPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  estado.enviado = [];
  estado.planes = [PLAN_FAMILIAR];
  estado.grupos = [GRUPO];
  avisos.show = [];
});

describe("BillingGroupsPage", () => {
  it("sin plan familiar o empresarial, «Nuevo grupo» se apaga y lleva a Planes y cuotas", () => {
    estado.planes = [];
    estado.grupos = [];
    montar();
    expect((screen.getByRole("button", { name: "Nuevo grupo" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Ir a Planes y cuotas" }).getAttribute("href")).toBe("/panel/planes");
  });

  it("cada grupo es una tarjeta y la cuota pendiente se cuenta en amarillo", () => {
    montar();
    expect(screen.getByText("1 con cuota pendiente")).toBeTruthy();
    const tarjeta = screen.getByRole("button", { name: "Abrir Familia Pérez" });
    expect(within(tarjeta).getByText("Paga Ana Pérez")).toBeTruthy();
    expect(within(tarjeta).getByText("Cuota pendiente")).toBeTruthy();
  });

  it("desde la ficha, «Editar grupo» guarda nombre, precio, cupos y factura", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Familia Pérez" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar grupo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre del grupo" }), {
      target: { value: "Familia Pérez López" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(estado.enviado).toHaveLength(1));
    expect(estado.enviado[0]).toEqual({
      hook: "editar",
      vars: {
        id: "g1",
        body: {
          name: "Familia Pérez López",
          custom_fee: null,
          max_members: null,
          billing_nit: "",
          billing_name: "",
          billing_email: "",
        },
      },
    });
    // Vuelve a la ficha.
    expect(await screen.findByRole("button", { name: "Editar grupo" })).toBeTruthy();
  });

  it("«Quitar» pide confirmación antes de sacar a alguien", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Familia Pérez" }));
    const quitar = await screen.findByRole("button", { name: "Quitar a Luis Pérez" });
    fireEvent.click(quitar);
    expect(estado.enviado).toHaveLength(0);
    fireEvent.click(quitar);
    await waitFor(() => expect(estado.enviado).toHaveLength(1));
    expect(estado.enviado[0]).toEqual({ hook: "quitar", vars: { id: "g1", membershipId: "m1" } });
    confirmar.mockRestore();
  });

  it("en un grupo familiar se puede agregar un niño desde la ficha", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Familia Pérez" }));
    fireEvent.click(await screen.findByRole("button", { name: "Agregar niño" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), { target: { value: "Sofi" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Apellido" }), { target: { value: "Pérez" } });
    fireEvent.click(screen.getByRole("button", { name: "Dar de alta" }));
    await waitFor(() => expect(estado.enviado).toHaveLength(1));
    expect(estado.enviado[0]).toEqual({
      hook: "dependiente",
      vars: {
        id: "g1",
        body: { first_name: "Sofi", last_name: "Pérez", birth_date: null, guardian_id: "a-titular" },
      },
    });
  });
});
