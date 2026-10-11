// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Atletas según quién la abre. Recordatorio, Desligar, Confirmar baja y la
 * config de riesgo/mora van por endpoints de solo admin (`GYM_ADMIN`): al coach
 * se le ofrecían y el servidor le respondía 403.
 *
 * Las acciones de fila viven en celdas de `mantine-datatable`, que no se pintan
 * bajo jsdom; por eso se prueba lo que sí se pinta (el botón de riesgo/mora) y
 * que la config del gym ni se pida para el coach.
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
}));

vi.mock("../api/hooks", () => {
  const consulta = { data: undefined, isError: false, isLoading: false, refetch: () => {} };
  const mutacion = { isPending: false, mutate: () => {}, mutateAsync: async () => ({}) };
  return {
    useAssignPlan: () => mutacion,
    useAtRisk: () => consulta,
    useBlockMembership: () => mutacion,
    useEditAthleteProfile: () => mutacion,
    useGymConfig: (gymId: string) => {
      estado.gymConfigPedido.push(gymId);
      return consulta;
    },
    useGymLeaveDecision: () => mutacion,
    useMembershipDetail: () => consulta,
    useMemberships: () => ({ ...consulta, data: [] }),
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
  });

  it("el admin ve el botón de riesgo/mora y se pide la config del gym", () => {
    estado.rol = "gym_admin";
    pintar();
    expect(screen.getByRole("button", { name: /Riesgo .* corte/ })).toBeTruthy();
    expect(estado.gymConfigPedido).toContain("gym-1");
  });

  it("el coach no ve el botón ni dispara la lectura que le daría 403", () => {
    estado.rol = "coach";
    pintar();
    expect(screen.queryByRole("button", { name: /Riesgo .* corte/ })).toBeNull();
    expect(estado.gymConfigPedido.every((g) => g === "")).toBe(true);
  });
});
