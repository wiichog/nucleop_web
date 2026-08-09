// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import type { ClubContentRow } from "../api/types";

/**
 * La cola de moderación de contenido de club. Lo que se prueba es lo único cuyo
 * fallo es grave de verdad: que lo DENUNCIADO se vea de entrada (es la pestaña
 * por defecto) y que un estado vacío no se pueda confundir con "no hay nada
 * denunciado" cuando lo que pasa es otra cosa.
 */

// jsdom no implementa matchMedia y MantineProvider lo usa para el color scheme.
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
// El SegmentedControl de las pestañas monta un FloatingIndicator que observa su
// tamaño; jsdom no trae ResizeObserver.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const estado = vi.hoisted(() => ({
  denunciado: [] as ClubContentRow[],
  todo: [] as ClubContentRow[],
}));

vi.mock("../api/hooks", () => {
  const consulta = (data: unknown) => ({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  const mutacion = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useGymClubContent: (_gymId: string, filtros: { reported?: boolean } = {}) =>
      consulta(filtros.reported ? estado.denunciado : estado.todo),
    useGymClubs: () => consulta([{ id: "cl1", name: "Runners 1821" }]),
    usePlatformClubContent: () => consulta([]),
    useDecideClubContent: () => mutacion(),
    useDecidePlatformClubContent: () => mutacion(),
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { ClubContentPage } from "./ClubContentPage";

function fila(over: Partial<ClubContentRow> = {}): ClubContentRow {
  return {
    kind: "post",
    id: "c1",
    feed_item_id: "club-post-c1",
    club_id: "cl1",
    club_name: "Runners 1821",
    gym_id: "gym-1",
    title: "",
    body: "aquí vendemos cosas raras",
    author_email: "ana@demo.nucleo.fit",
    moderation_status: "approved",
    moderation_label: "",
    decision_reason: "",
    decision_note: "",
    report_count: 0,
    reported: false,
    decided_at: null,
    created_at: "2026-08-09T19:00:00Z",
    ...over,
  };
}

function pintar() {
  return render(
    <MantineProvider>
      <ClubContentPage />
    </MantineProvider>,
  );
}

describe("ClubContentPage", () => {
  it("abre en lo denunciado: el texto y el contador de denuncias se ven sin tocar nada", () => {
    const denunciada = fila({ report_count: 3, reported: true });
    estado.denunciado = [denunciada];
    estado.todo = [denunciada, fila({ id: "c2", body: "salimos a las 6am" })];

    pintar();

    expect(screen.getByText("aquí vendemos cosas raras")).toBeTruthy();
    expect(screen.getByText("Denunciado ×3")).toBeTruthy();
    // El aviso perecedero NO denunciado no se cuela en la cola urgente.
    expect(screen.queryByText("salimos a las 6am")).toBeNull();
  });

  it("con la cola limpia dice exactamente que no hay denuncias, no 'sin contenido'", () => {
    estado.denunciado = [];
    estado.todo = [fila({ id: "c2", body: "salimos a las 6am" })];

    pintar();

    expect(screen.getByText(/Nadie ha denunciado contenido en tus clubes/)).toBeTruthy();
  });

  it("lo ya retirado ofrece devolverlo, no retirarlo otra vez", () => {
    const retirada = fila({
      report_count: 1,
      reported: true,
      moderation_status: "rejected",
      decision_reason: "ofensivo",
    });
    estado.denunciado = [retirada];
    estado.todo = [retirada];

    pintar();

    expect(screen.getByRole("button", { name: "Restaurar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retirar…" })).toBeNull();
    // El motivo con el que se retiró se lee traducido, no como código crudo.
    expect(screen.getByText(/Lenguaje ofensivo/)).toBeTruthy();
  });
});
