// @vitest-environment jsdom
import type React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Planes y cuotas, con el diseño de Clases: tarjetas que se tocan para abrir su
 * ventana, alta y edición del plan en la misma, y lo pendiente en amarillo.
 *
 * Lo que se cuida además: que «Activo» (plan) y «Activa» (oferta) avisen si el
 * servidor rechaza el cambio (antes cambiaban en silencio), y que editar un plan
 * no borre lo que el panel no muestra de su penalización.
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
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

type Callbacks = { onSuccess?: () => void; onError?: (e: unknown) => void };

const estado = vi.hoisted(() => ({
  falla: false,
  enviado: [] as { hook: string; vars: unknown }[],
  planes: [] as unknown[],
  servicios: [] as unknown[],
  ofertas: [] as unknown[],
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

vi.mock("../api/hooks", () => {
  const rechazo = { response: { data: { detail: "Sin permiso." } } };
  const consulta = (data: () => unknown) => () => ({
    data: data(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  const mutacion = (hook: string) => () => ({
    isPending: false,
    variables: undefined,
    mutateAsync: async (vars: unknown) => {
      estado.enviado.push({ hook, vars });
      if (estado.falla) throw rechazo;
      return { id: "nuevo", name: "nuevo" };
    },
    mutate: (vars: unknown, cb?: Callbacks) => {
      estado.enviado.push({ hook, vars });
      if (estado.falla) cb?.onError?.(rechazo);
      else cb?.onSuccess?.();
    },
  });
  return {
    usePlans: consulta(() => estado.planes),
    useServiceTypes: consulta(() => estado.servicios),
    usePlanOffers: consulta(() => estado.ofertas),
    useCreatePlan: mutacion("createPlan"),
    useUpdatePlan: mutacion("updatePlan"),
    useDeletePlan: mutacion("deletePlan"),
    useUpdateServiceType: mutacion("updateService"),
    useCreatePlanOffer: mutacion("createOffer"),
    useDeletePlanOffer: mutacion("deleteOffer"),
    useTogglePlanOffer: mutacion("toggleOffer"),
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1" }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

import {
  InterruptorOferta,
  PlanModal,
  PlansPage,
  armarPenalizacion,
  valorOferta,
  vigenciaOferta,
} from "./PlansPage";

const PLAN = {
  id: "p1",
  name: "Mensual",
  price: "350.00",
  duration_days: 30,
  is_active: true,
  auto_renew_default: false,
  service_type_names: [],
  service_types: [],
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
const YOGA = {
  id: "s1",
  name: "Yoga",
  color: "#00aa88",
  status: "draft",
  is_active: true,
  access_type: "included",
  charge_type: "recurring",
  price: "0",
  duration_days: 30,
  plans: [],
};

function montar(nodo: React.ReactNode) {
  render(<MantineProvider>{nodo}</MantineProvider>);
}

beforeEach(() => {
  estado.falla = false;
  estado.enviado = [];
  estado.planes = [PLAN];
  estado.servicios = [];
  estado.ofertas = [];
  avisos.show = [];
});

describe("PlansPage — la pantalla", () => {
  it("cada plan es una tarjeta con su precio; tocarla abre su ventana", async () => {
    montar(<PlansPage />);
    const tarjeta = screen.getByRole("button", { name: "Editar Mensual" });
    expect(within(tarjeta).getByText(/350/)).toBeTruthy();
    fireEvent.click(tarjeta);
    const ventana = await screen.findByRole("dialog");
    expect(within(ventana).getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(within(ventana).getByRole("button", { name: "Eliminar" })).toBeTruthy();
  });

  it("apagar un plan desde su ventana manda is_active y avisa en verde", async () => {
    montar(<PlansPage />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Mensual" }));
    const ventana = await screen.findByRole("dialog");
    fireEvent.click(within(ventana).getByRole("switch", { name: "Activo" }));
    fireEvent.click(within(ventana).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(estado.enviado).toEqual([
      { hook: "updatePlan", vars: { id: "p1", body: expect.objectContaining({ is_active: false }) } },
    ]);
    expect(avisos.show[0]).toEqual({ color: "teal", message: 'Plan "Mensual" desactivado.' });
  });

  it("si el servidor rechaza el cambio del plan, avisa en rojo con el motivo", async () => {
    estado.falla = true;
    montar(<PlansPage />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Mensual" }));
    const ventana = await screen.findByRole("dialog");
    fireEvent.click(within(ventana).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(avisos.show[0]).toEqual({ color: "red", message: "Sin permiso." });
  });

  it("los servicios pendientes salen con su contador y se activan desde su ventana", async () => {
    estado.servicios = [YOGA];
    montar(<PlansPage />);
    expect(screen.getByText("1 servicio pendiente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Activar Yoga" }));
    const ventana = await screen.findByRole("dialog");
    fireEvent.click(within(ventana).getByRole("button", { name: "Activar servicio" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(estado.enviado).toEqual([
      {
        hook: "updateService",
        vars: { id: "s1", body: expect.objectContaining({ status: "active", access_type: "included", price: "0" }) },
      },
    ]);
    expect(avisos.show[0]).toEqual({ color: "teal", message: "Servicio activado." });
  });

  it("si activar el servicio falla, avisa en rojo con el motivo del servidor", async () => {
    estado.servicios = [YOGA];
    estado.falla = true;
    montar(<PlansPage />);
    fireEvent.click(screen.getByRole("button", { name: "Activar Yoga" }));
    const ventana = await screen.findByRole("dialog");
    fireEvent.click(within(ventana).getByRole("button", { name: "Activar servicio" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(avisos.show[0]).toEqual({ color: "red", message: "Sin permiso." });
  });

  it("una oferta se abre y desde ahí se prende", async () => {
    estado.ofertas = [OFERTA];
    montar(<PlansPage />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir la oferta Promo octubre" }));
    const ventana = await screen.findByRole("dialog");
    fireEvent.click(within(ventana).getByRole("switch", { name: "Activa: Promo octubre" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(estado.enviado).toEqual([{ hook: "toggleOffer", vars: { offerId: "o1", is_active: true } }]);
  });
});

describe("PlansPage — interruptor de la oferta", () => {
  it("prender una oferta avisa en verde", async () => {
    montar(<InterruptorOferta gymId="gym-1" oferta={OFERTA as never} />);
    fireEvent.click(screen.getByRole("switch", { name: "Activa: Promo octubre" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(estado.enviado).toEqual([{ hook: "toggleOffer", vars: { offerId: "o1", is_active: true } }]);
    expect(avisos.show[0]).toEqual({ color: "teal", message: 'Oferta "Promo octubre" activada.' });
  });

  it("si el servidor lo rechaza, avisa en rojo con el motivo", async () => {
    estado.falla = true;
    montar(<InterruptorOferta gymId="gym-1" oferta={OFERTA as never} />);
    fireEvent.click(screen.getByRole("switch", { name: "Activa: Promo octubre" }));
    await waitFor(() => expect(avisos.show).toHaveLength(1));
    expect(avisos.show[0]).toEqual({ color: "red", message: "Sin permiso." });
  });

  it("valor y vigencia se leen en palabras", () => {
    expect(valorOferta({ offer_type: "percent", value: "30" })).toBe("30%");
    expect(valorOferta({ offer_type: "free_months", value: "1" })).toBe("1 mes gratis");
    expect(valorOferta({ offer_type: "free_months", value: "2" })).toBe("2 meses gratis");
    expect(vigenciaOferta({ valid_from: null, valid_to: null })).toBe("Sin fecha");
    expect(vigenciaOferta({ valid_from: "2026-11-01", valid_to: null })).toMatch(/^Desde /);
    expect(vigenciaOferta({ valid_from: null, valid_to: "2026-11-30" })).toMatch(/^Hasta /);
  });
});

/**
 * La ventana del plan: antes la edición solo dejaba cambiar nombre, precio,
 * duración, límite y servicios; «Acceso a clases especiales», «Open gym»,
 * «Penalización no-show (pts)» y «Renovación automática» se fijaban al crear.
 */
describe("PlansPage — ventana del plan", () => {
  it("al editar manda clases especiales, open gym, renovación y penalización", async () => {
    const onSave = vi.fn(async () => {});
    const plan = {
      ...PLAN,
      special_classes_access: false,
      open_gym_access: true,
      auto_renew_default: true,
      noshow_penalty: { community_points: -10, global_points: -5, notify: true, message: "Hola" },
    };
    montar(<PlanModal plan={plan as never} serviceOptions={[]} saving={false} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Acceso a clases especiales" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Open gym" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Renovación automática/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Penalización no-show/ }), { target: { value: "-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const body = (onSave.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({
        special_classes_access: true,
        open_gym_access: false,
        auto_renew_default: false,
        // Conserva lo que el panel no muestra (puntos globales, mensaje).
        noshow_penalty: { community_points: -20, global_points: -5, notify: true, message: "Hola" },
      }),
    );
    // Sin tocar «Activo» no se manda: no se pisa un cambio hecho desde otro lado.
    expect(body).not.toHaveProperty("is_active");
    // El tipo de plan solo se elige al crearlo.
    expect(body).not.toHaveProperty("group_kind");
  });

  it("«Precio (Q)» es numérico: manda solo el número, sin la Q ni comas", async () => {
    const onSave = vi.fn(async () => {});
    montar(<PlanModal plan={PLAN as never} serviceOptions={[]} saving={false} onClose={() => {}} onSave={onSave} />);
    const precio = await screen.findByRole("textbox", { name: "Precio (Q)" });
    fireEvent.change(precio, { target: { value: "Q1,500" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toEqual([expect.objectContaining({ price: "1500" })]);
  });

  it("el alta de un plan familiar manda el tipo y las personas que cubre", async () => {
    const onSave = vi.fn(async () => {});
    montar(<PlanModal plan="nuevo" serviceOptions={[]} saving={false} onClose={() => {}} onSave={onSave} />);
    const crear = await screen.findByRole("button", { name: "Crear plan" });
    expect((crear as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Familiar" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), { target: { value: "Familiar x4" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Precio del paquete (Q)" }), { target: { value: "1200" } });
    expect(screen.queryByRole("switch", { name: "Activo" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toEqual([
      expect.objectContaining({
        name: "Familiar x4",
        price: "1200",
        group_kind: "family",
        max_members: 4,
        auto_renew_default: true,
        noshow_penalty: expect.objectContaining({ community_points: -10 }),
      }),
    ]);
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
