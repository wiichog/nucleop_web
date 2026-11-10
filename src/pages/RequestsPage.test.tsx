// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

// La primera pintura de Mantine bajo jsdom tarda: el límite de 5 s no alcanza.
vi.setConfig({ testTimeout: 30000 });
import type { JoinRequest } from "../api/types";

/**
 * La bandeja de solicitudes. Lo que se prueba es la decisión que antes se tomaba
 * a ciegas: distinguir un alta nueva de un REINGRESO (alguien que ya fue de la
 * casa) y ver que vuelve con sus puntos y su antigüedad, no de cero.
 *
 * La bandeja ya no es una tabla: son filas que se tocan y abren una ventana con
 * las decisiones, así que se prueba la página entera (la fila, el contador en
 * amarillo y que el motivo se pida al elegir rechazar).
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
  solicitudes: [] as unknown[],
  decisiones: [] as unknown[],
}));

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
    reset: vi.fn(),
    isPending: false,
    isError: false,
  });
  return {
    useJoinRequests: () => consulta(estado.solicitudes),
    useInviteAthlete: () => mutacion(),
    useDecideJoinRequest: () => ({
      ...mutacion(),
      mutate: (vars: unknown) => estado.decisiones.push(vars),
    }),
    useAssignPlan: () => mutacion(),
    usePlans: () => consulta([]),
    usePlanOffers: () => consulta([]),
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { RequestsPage, Solicitante, mensajeAsignacion } from "./RequestsPage";

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

  it("en la bandeja, el reingreso se ve en la fila sin abrirla", () => {
    estado.solicitudes = [solicitud({ is_rejoin: true, community_points: 180 })];
    const { unmount } = pintarPagina();
    expect(screen.getByText("Reingreso")).toBeTruthy();
    unmount();

    estado.solicitudes = [solicitud({ id: "jr-2" })];
    pintarPagina();
    expect(screen.queryByText("Reingreso")).toBeNull();
  });
});

describe("RequestsPage · bandeja", () => {
  it("lo pendiente sale con su contador y lo resuelto no aparece", () => {
    estado.solicitudes = [
      solicitud({ id: "jr-1", athlete_name: "Ana López", status: "requested" }),
      solicitud({ id: "jr-2", athlete_name: "Luis Pérez", status: "approved_no_plan" }),
      solicitud({ id: "jr-3", athlete_name: "Eva Ruiz", status: "active" }),
    ];
    pintarPagina();
    expect(screen.getByText("1 por decidir")).toBeTruthy();
    expect(screen.getByText("1 sin plan")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Responder a Ana López" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Responder a Luis Pérez" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Responder a Eva Ruiz" })).toBeNull();
  });

  it("el motivo se pide al elegir «Rechazar» y viaja con la decisión", async () => {
    estado.decisiones = [];
    estado.solicitudes = [solicitud()];
    pintarPagina();
    fireEvent.click(screen.getByRole("button", { name: "Responder a Ana López" }));
    expect(screen.queryByLabelText(/Motivo del rechazo/)).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    fireEvent.change(await screen.findByLabelText(/Motivo del rechazo/), {
      target: { value: "Cupo lleno" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar solicitud" }));
    expect(estado.decisiones).toEqual([
      { requestId: "jr-1", decision: "reject", comment: "Cupo lleno" },
    ]);
  });

  it("a una invitación propia no se le ofrece prueba", async () => {
    estado.solicitudes = [solicitud({ status: "invited" })];
    pintarPagina();
    fireEvent.click(screen.getByRole("button", { name: "Responder a Ana López" }));
    expect(await screen.findByRole("button", { name: "Aprobar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ofrecer prueba" })).toBeNull();
  });

  it("a una aprobada sin plan se le asigna plan, no se vuelve a decidir", async () => {
    estado.solicitudes = [solicitud({ status: "approved_no_plan" })];
    pintarPagina();
    fireEvent.click(screen.getByRole("button", { name: "Responder a Ana López" }));
    expect(await screen.findByRole("button", { name: "Asignar plan" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("«Invitar atleta» abre la ventana de invitación", async () => {
    estado.solicitudes = [];
    pintarPagina();
    expect(screen.getByText("Nada pendiente.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Invitar atleta/ }));
    expect(await screen.findByRole("button", { name: "Enviar invitación" })).toBeTruthy();
  });
});

describe("RequestsPage · confirmación de «Asignar plan»", () => {
  it("anuncia la cuota que guardó el servidor, no la tecleada (oferta de porcentaje)", () => {
    // Se tecleó 400 con una oferta del 25 %: el servidor guardó 300.
    const m = mensajeAsignacion({ custom_fee: "300.00", status: "active" });
    expect(m).toMatch(/Q\s?300\.00/);
    expect(m).not.toContain("400");
    expect(m).toContain("ya es miembro activo");
  });

  it("sin cuota guardada dice que paga el precio del plan", () => {
    expect(mensajeAsignacion({ custom_fee: null, status: "active" })).toMatch(
      /precio del plan/,
    );
  });

  it("no promete «miembro activo» si la membresía no quedó activa", () => {
    expect(mensajeAsignacion({ custom_fee: null, status: "paused" })).not.toMatch(/activo/);
  });
});
