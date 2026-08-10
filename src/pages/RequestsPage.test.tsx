// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import type { JoinRequest } from "../api/types";

/**
 * La bandeja de solicitudes. Lo que se prueba es la decisión que antes se tomaba
 * a ciegas: distinguir un alta nueva de un REINGRESO (alguien que ya fue de la
 * casa) y ver que vuelve con sus puntos y su antigüedad, no de cero.
 *
 * La fila va suelta porque `mantine-datatable` no pinta celdas bajo jsdom; el
 * aviso que explica el reingreso sí vive fuera de la tabla y se prueba en la
 * página, que es donde se decide si aparece.
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

const estado = vi.hoisted(() => ({ solicitudes: [] as unknown[] }));

vi.mock("../api/hooks", () => {
  const consulta = (data: unknown) => ({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  const mutacion = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  });
  return {
    useJoinRequests: () => consulta(estado.solicitudes),
    useInviteAthlete: () => mutacion(),
    useDecideJoinRequest: () => mutacion(),
    useAssignPlan: () => mutacion(),
    usePlans: () => consulta([]),
    usePlanOffers: () => consulta([]),
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { RequestsPage, Solicitante } from "./RequestsPage";

function solicitud(over: Partial<JoinRequest> = {}): JoinRequest {
  return {
    id: "jr-1",
    athlete: "at-1",
    athlete_name: "Ana López",
    gym: "gym-1",
    membership: "mb-1",
    goal: "Volver a entrenar",
    status: "requested",
    created_at: "2026-08-09T15:00:00Z",
    history: [],
    is_rejoin: false,
    community_points: 0,
    member_since: null,
    ...over,
  } as JoinRequest;
}

function pintarFila(request: JoinRequest) {
  return render(
    <MantineProvider>
      <Solicitante request={request} />
    </MantineProvider>,
  );
}

function pintarPagina() {
  return render(
    <MantineProvider>
      <RequestsPage />
    </MantineProvider>,
  );
}

describe("RequestsPage · reingreso", () => {
  it("un exmiembro se marca como reingreso, con sus puntos y su antigüedad", () => {
    pintarFila(
      solicitud({ is_rejoin: true, community_points: 180, member_since: "2023-05-01" }),
    );

    expect(screen.getByText("Reingreso")).toBeTruthy();
    expect(screen.getByText(/180 pts de comunidad/)).toBeTruthy();
    // El año se lee del string ISO: `new Date("2023-05-01")` en la zona de
    // Guatemala retrocede un día y llegaría a decir 2022 en un 1 de enero.
    expect(screen.getByText(/en el gym desde 2023/)).toBeTruthy();
  });

  it("un alta nueva no se disfraza de reingreso", () => {
    pintarFila(solicitud({ athlete_name: "Luis Pérez" }));

    expect(screen.getByText("Luis Pérez")).toBeTruthy();
    expect(screen.queryByText("Reingreso")).toBeNull();
  });

  it("el aviso de que la relación se conserva solo sale si hay un reingreso", () => {
    estado.solicitudes = [solicitud({ is_rejoin: true, community_points: 180 })];
    const { unmount } = pintarPagina();
    expect(screen.getByText(/reabre la relación que el atleta ya tuvo/)).toBeTruthy();
    unmount();

    estado.solicitudes = [solicitud({ id: "jr-2" })];
    pintarPagina();
    expect(screen.queryByText(/reabre la relación que el atleta ya tuvo/)).toBeNull();
  });
});
