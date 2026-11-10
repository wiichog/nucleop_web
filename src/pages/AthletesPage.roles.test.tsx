// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// La primera pintura de Mantine bajo jsdom tarda: el límite de 5 s no alcanza.
vi.setConfig({ testTimeout: 30000 });

/**
 * Atletas según quién la abre. Recordatorio, Desligar, Confirmar baja, invitar y
 * la config de riesgo/mora van por endpoints de solo admin (`GYM_ADMIN`): al
 * coach se le ofrecían y el servidor le respondía 403.
 *
 * El padrón ya no es una `mantine-datatable` (sus celdas no se pintaban bajo
 * jsdom): son filas que se tocan, así que ahora se prueba también la fila, el
 * contador en amarillo y lo que abre la ficha.
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
  rol: "gym_admin",
  gymConfigPedido: [] as string[],
  padron: [] as unknown[],
  enRiesgo: [] as unknown[],
  detalle: null as unknown,
}));

vi.mock("../api/hooks", () => {
  const consulta = { data: undefined, isError: false, isLoading: false, refetch: () => {} };
  const mutacion = { isPending: false, isError: false, mutate: () => {}, mutateAsync: async () => ({}), reset: () => {} };
  return {
    useAssignPlan: () => mutacion,
    useAtRisk: () => ({ ...consulta, data: estado.enRiesgo }),
    useBlockMembership: () => mutacion,
    useEditAthleteProfile: () => mutacion,
    useGymConfig: (gymId: string) => {
      estado.gymConfigPedido.push(gymId);
      return consulta;
    },
    useGymLeaveDecision: () => mutacion,
    useInviteAthlete: () => mutacion,
    useMembershipDetail: (_gym: string, id: string) => ({ ...consulta, data: id ? estado.detalle : undefined }),
    useMemberships: () => ({ ...consulta, data: estado.padron }),
    usePauseMembership: () => mutacion,
    usePlanOffers: () => consulta,
    usePlans: () => consulta,
    useResetAthletePassword: () => mutacion,
    useResumeMembership: () => mutacion,
    useSendReminder: () => mutacion,
    useUnblockMembership: () => mutacion,
    useUpdateGymConfig: () => mutacion,
    useUpdateMembershipBilling: () => mutacion,
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    primaryGymId: "gym-1",
    isSuperuser: false,
    roles: [{ role: estado.rol, gym_id: "gym-1" }],
  }),
  administraGym: (roles: { role: string; gym_id: string }[], su: boolean, gymId: string) =>
    su || roles.some((r) => r.role === "gym_admin" && r.gym_id === gymId),
}));

import { AthletesPage } from "./AthletesPage";

function socio(over: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    athlete: "a-1",
    athlete_name: "Ana López",
    athlete_photo: null,
    status: "active",
    plan_name: "Mensual",
    plan_services: [],
    payment_status: "up_to_date",
    days_to_due: 20,
    renewal_date: "2026-12-01",
    payment_grace_until: null,
    community_points: 40,
    billing_group_name: "",
    ...over,
  };
}

function detalle(over: Record<string, unknown> = {}) {
  return {
    ...socio(),
    plan: "p-1",
    custom_fee: null,
    effective_fee: "350.00",
    auto_renew: false,
    payment_method_pref: "cash",
    internal_notes: "",
    status_history: [],
    payments: [],
    checkins: [],
    athlete_profile: {
      full_name: "Ana López",
      photo: null,
      birth_date: null,
      emergency_contact: null,
      sport_level: "",
      goals: "",
      profile_editable_by_gym: false,
    },
    ...over,
  };
}

function pintar() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("Atletas: lo que es solo del admin no se le ofrece al coach", () => {
  beforeEach(() => {
    estado.gymConfigPedido = [];
    estado.padron = [];
    estado.enRiesgo = [];
    estado.detalle = null;
  });

  it("el admin ve «Riesgo y mora» e «Invitar atleta», y se pide la config del gym", () => {
    estado.rol = "gym_admin";
    pintar();
    expect(screen.getByRole("button", { name: /Riesgo y mora/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Invitar atleta/ })).toBeTruthy();
    expect(estado.gymConfigPedido).toContain("gym-1");
  });

  it("el coach no ve riesgo, invitar ni los grupos de dinero, ni dispara la lectura que le daría 403", () => {
    estado.rol = "coach";
    pintar();
    expect(screen.queryByRole("button", { name: /Riesgo y mora/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Invitar atleta/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Morosos/ })).toBeNull();
    expect(estado.gymConfigPedido.every((g) => g === "")).toBe(true);
  });

  it("el coach abre la ficha pero no la administra", async () => {
    estado.rol = "coach";
    estado.padron = [socio()];
    estado.detalle = detalle();
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir ficha de Ana López" }));
    expect(await screen.findByText("Ficha del atleta")).toBeTruthy();
    expect(await screen.findByText(/Miembro desde/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Recordatorio/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Plan y cuota" })).toBeNull();
  });
});

describe("Atletas: encontrar a la persona y lo pendiente", () => {
  beforeEach(() => {
    estado.rol = "gym_admin";
    estado.gymConfigPedido = [];
    estado.enRiesgo = [];
    estado.detalle = null;
  });

  it("primero los que deben, y el contador de morosos sale en su pastilla", () => {
    estado.padron = [
      socio({ id: "m-1", athlete_name: "Ana López" }),
      socio({ id: "m-2", athlete_name: "Zoe Ruiz", payment_status: "overdue", days_to_due: -3 }),
    ];
    pintar();
    const filas = screen.getAllByRole("button", { name: /Abrir ficha de/ });
    expect(filas[0].getAttribute("aria-label")).toBe("Abrir ficha de Zoe Ruiz");
    expect(screen.getByText("Vencido hace 3 d")).toBeTruthy();
    const morosos = screen.getByRole("button", { name: /^Morosos/ });
    expect(morosos.textContent).toContain("1");
  });

  it("la búsqueda encuentra por nombre o por plan", () => {
    estado.padron = [
      socio({ id: "m-1", athlete_name: "Ana López", plan_name: "Mensual" }),
      socio({ id: "m-2", athlete_name: "Luis Pérez", plan_name: "Trimestral" }),
    ];
    pintar();
    fireEvent.change(screen.getByLabelText("Buscar atleta o plan"), { target: { value: "trim" } });
    expect(screen.queryByRole("button", { name: "Abrir ficha de Ana López" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir ficha de Luis Pérez" })).toBeTruthy();
  });

  it("quien pidió su baja sale marcado y se responde arriba de su ficha", async () => {
    estado.padron = [socio({ status: "pending_leave", leave_initiated_by: "athlete" })];
    estado.detalle = detalle({ status: "pending_leave", leave_initiated_by: "athlete" });
    pintar();
    expect(screen.getByText("1 baja por confirmar")).toBeTruthy();
    expect(screen.getAllByText("Pidió su baja").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Abrir ficha de Ana López" }));
    expect(await screen.findByRole("button", { name: "Confirmar baja" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("en la ficha del admin, «Plan y cuota» abre su ventana y avisa si la va a activar", async () => {
    estado.padron = [socio({ status: "expired" })];
    estado.detalle = detalle({ status: "expired" });
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir ficha de Ana López" }));
    fireEvent.click(await screen.findByRole("button", { name: "Plan y cuota" }));
    expect(await screen.findByText(/queda ACTIVA con vencimiento nuevo/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar plan y cuota" })).toBeTruthy();
  });

  it("a un miembro de plan grupal no se le ofrece «Plan y cuota»", async () => {
    estado.padron = [socio({ billing_group_name: "Familia López" })];
    estado.detalle = detalle({ billing_group_name: "Familia López" });
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir ficha de Ana López" }));
    expect(await screen.findByText(/Lo paga el plan grupal «Familia López»/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Recordatorio/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plan y cuota" })).toBeNull();
  });
});
