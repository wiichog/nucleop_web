// @vitest-environment jsdom
import type React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Planes y cuotas: los interruptores «Activo» (plan) y «Activa» (oferta).
 *
 * Antes cambiaban en silencio: si el servidor rechazaba el cambio, el interruptor
 * se quedaba igual y el dueño no sabía si había tocado mal o si algo falló. Ahora
 * avisan como el resto de la pantalla, en verde si quedó y en rojo con el motivo.
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

type Callbacks = { onSuccess?: () => void; onError?: (e: unknown) => void };

const estado = vi.hoisted(() => ({
  falla: false,
  enviado: [] as unknown[],
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

vi.mock("../api/hooks", () => {
  const mutacion = () => ({
    isPending: false,
    mutateAsync: vi.fn(),
    mutate: (vars: unknown, cb?: Callbacks) => {
      estado.enviado.push(vars);
      if (estado.falla) cb?.onError?.({ response: { data: { detail: "Sin permiso." } } });
      else cb?.onSuccess?.();
    },
  });
  return {
    useTogglePlanOffer: mutacion,
    useUpdatePlan: mutacion,
  };
});

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

import { EditPlanModal, InterruptorOferta, InterruptorPlan, armarPenalizacion } from "./PlansPage";

const PLAN = {
  id: "p1",
  name: "Mensual",
  price: "350.00",
  duration_days: 30,
  is_active: true,
  auto_renew_default: false,
  service_type_names: [],
};
const OFERTA = {
  id: "o1",
  name: "Promo octubre",
  offer_type: "percent",
  value: "10",
  plan_name: null,
  valid_from: null,
  valid_to: null,
  is_active: false,
};

/**
 * Se prueba la celda suelta y no la página: `mantine-datatable` no pinta las
 * celdas bajo jsdom (renderiza `<tr>` vacíos).
 */
function montar(nodo: React.ReactNode) {
  render(<MantineProvider>{nodo}</MantineProvider>);
}

beforeEach(() => {
  estado.falla = false;
  estado.enviado = [];
  avisos.show = [];
});

describe("PlansPage — interruptores de activo", () => {
  it("apagar un plan avisa en verde", async () => {
    montar(<InterruptorPlan gymId="gym-1" plan={PLAN as never} />);
    fireEvent.click(screen.getByRole("switch", { name: "Activo: Mensual" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(estado.enviado).toEqual([{ id: "p1", body: { is_active: false } }]);
    expect(avisos.show[0]).toEqual({ color: "teal", message: 'Plan "Mensual" desactivado.' });
  });

  it("prender una oferta avisa en verde", async () => {
    montar(<InterruptorOferta gymId="gym-1" oferta={OFERTA as never} />);
    fireEvent.click(screen.getByRole("switch", { name: "Activa: Promo octubre" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(estado.enviado).toEqual([{ offerId: "o1", is_active: true }]);
    expect(avisos.show[0]).toEqual({ color: "teal", message: 'Oferta "Promo octubre" activada.' });
  });

  it("si el servidor lo rechaza, avisa en rojo con el motivo", async () => {
    estado.falla = true;
    montar(
      <>
        <InterruptorPlan gymId="gym-1" plan={PLAN as never} />
        <InterruptorOferta gymId="gym-1" oferta={OFERTA as never} />
      </>,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Activo: Mensual" }));
    fireEvent.click(screen.getByRole("switch", { name: "Activa: Promo octubre" }));
    await waitFor(() => expect(avisos.show).toHaveLength(2));
    expect(avisos.show.every((a) => a.color === "red")).toBe(true);
    expect(avisos.show.map((a) => a.message)).toEqual(["Sin permiso.", "Sin permiso."]);
  });
});

/**
 * «Editar plan»: antes solo dejaba cambiar nombre, precio, duración, límite y
 * servicios; «Acceso a clases especiales», «Open gym», «Penalización no-show (pts)»
 * y «Renovación automática» se fijaban al crear y ya no había cómo corregirlos.
 */
describe("PlansPage — editar plan", () => {
  it("manda clases especiales, open gym, renovación y penalización", async () => {
    const onSave = vi.fn(async () => {});
    const plan = {
      ...PLAN,
      special_classes_access: false,
      open_gym_access: true,
      auto_renew_default: true,
      noshow_penalty: { community_points: -10, global_points: -5, notify: true, message: "Hola" },
      service_types: [],
    };
    montar(
      <EditPlanModal plan={plan as never} serviceOptions={[]} saving={false} onClose={() => {}} onSave={onSave} />,
    );
    fireEvent.click(await screen.findByRole("checkbox", { name: "Acceso a clases especiales" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Open gym" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Renovación automática/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Penalización no-show/ }), { target: { value: "-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toEqual([
      expect.objectContaining({
        special_classes_access: true,
        open_gym_access: false,
        auto_renew_default: false,
        // Conserva lo que el panel no muestra (puntos globales, mensaje).
        noshow_penalty: { community_points: -20, global_points: -5, notify: true, message: "Hola" },
      }),
    ]);
  });

  it("«Precio (Q)» es numérico: manda solo el número, sin la Q ni comas", async () => {
    const onSave = vi.fn(async () => {});
    montar(
      <EditPlanModal
        plan={{ ...PLAN, service_types: [] } as never}
        serviceOptions={[]}
        saving={false}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    const precio = await screen.findByRole("textbox", { name: "Precio (Q)" });
    fireEvent.change(precio, { target: { value: "Q1,500" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toEqual([expect.objectContaining({ price: "1500" })]);
  });

  it("0 puntos quita la penalización de comunidad sin borrar la global", () => {
    expect(armarPenalizacion(0)).toBeNull();
    expect(armarPenalizacion("", { community_points: -10, notify: true })).toBeNull();
    expect(armarPenalizacion(0, { community_points: -10, global_points: -3 })).toEqual({ global_points: -3 });
    expect(armarPenalizacion(-10)).toEqual({
      community_points: -10,
      notify: true,
      message: "Penalización por no asistir a clase reservada.",
    });
  });
});
