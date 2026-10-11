// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

/**
 * Bitácora: promete «Quién hizo qué». Con dos admins en el mismo gym, el rol
 * solo («Admin de gym») no dice quién fue; la fila tiene que traer el nombre.
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

const filas = vi.hoisted(() => [
  {
    id: "1",
    descripcion: "Registró una venta",
    actor_rol: "Admin de gym",
    actor_nombre: "Carla Coach",
    action: "erp.sale",
    entity: "Sale",
    created_at: "2026-10-01T12:00:00Z",
  },
  {
    id: "2",
    descripcion: "Cambió el estado de una membresía",
    actor_rol: "Sistema/atleta",
    actor_nombre: "",
    action: "membership_transition",
    entity: "membership",
    created_at: "2026-10-01T11:00:00Z",
  },
]);

vi.mock("../api/hooks", () => ({
  useAuditLogs: () => ({ data: filas, isError: false, isLoading: false, refetch: vi.fn() }),
  useExportAudit: () => ({ isPending: false, mutate: vi.fn() }),
}));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1" }),
}));

import { AuditPage } from "./AuditPage";

describe("AuditPage", () => {
  it("«Quién» muestra el nombre y el rol; sin actor, solo el rol", () => {
    render(
      <MantineProvider>
        <AuditPage />
      </MantineProvider>,
    );
    expect(screen.getByText("Carla Coach")).toBeTruthy();
    expect(screen.getByText("Admin de gym")).toBeTruthy();
    expect(screen.getByText("Sistema/atleta")).toBeTruthy();
  });
});
