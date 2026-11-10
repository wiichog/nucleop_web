// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La pantalla de Comunidad: lo que espera moderación va al frente con su
 * contador, una cola que falla no se confunde con "nada pendiente", y el coach
 * no ve lo que el servidor le rechaza.
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
  esAdmin: true,
  posts: [] as unknown[],
  comentarios: [] as unknown[],
  apelaciones: [] as unknown[],
  comentariosFallan: false,
  anuncios: [] as unknown[],
}));

vi.mock("../api/hooks", () => {
  const consulta = (data: unknown, isError = false) => ({
    data: isError ? undefined : data,
    isLoading: false,
    isError,
    refetch: vi.fn(),
  });
  const mutacion = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    useGymPendingPosts: () => consulta(estado.posts),
    useGymReportedComments: () => consulta(estado.comentarios, estado.comentariosFallan),
    useGymAppeals: () => consulta(estado.apelaciones),
    useModerationSignals: () => consulta([]),
    useDecidePost: mutacion,
    useDecideComment: mutacion,
    useDecideAppeal: mutacion,
    useServiceTypes: () => consulta([{ name: "CrossFit", is_active: true }]),
    useAthletesOfMonth: () => consulta([]),
    useAthletesOfMonthHistory: () => consulta([]),
    useMemberships: () => consulta([]),
    useSetAthleteOfMonth: mutacion,
    useGymAnnouncements: () => consulta(estado.anuncios),
    usePostAnnouncement: mutacion,
    useUpdateAnnouncement: mutacion,
    useDeleteAnnouncement: mutacion,
    useGymFeed: () => consulta([]),
  };
});

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", roles: [], isSuperuser: false }),
  administraGym: () => estado.esAdmin,
}));

import { CommunityPage } from "./CommunityPage";

function pintar() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const post = {
  id: "p1",
  body: "Nuevo PR en back squat",
  author_type: "athlete",
  author_name: "Ana",
  athlete_name: "Ana",
  created_at: "2026-11-09T12:00:00Z",
  report_count: 0,
  moderation_label: "",
  media: [],
  photo: null,
};
const comentario = {
  id: "c1",
  body: "comentario feo",
  athlete_name: "Luis",
  created_at: "2026-11-09T12:00:00Z",
  report_count: 2,
  hidden: true,
  image: null,
};

beforeEach(() => {
  estado.esAdmin = true;
  estado.posts = [];
  estado.comentarios = [];
  estado.apelaciones = [];
  estado.comentariosFallan = false;
  estado.anuncios = [];
});

describe("CommunityPage", () => {
  it("abre en Moderar: lo pendiente se ve sin tocar nada, con su contador", () => {
    estado.posts = [post];
    estado.comentarios = [comentario];
    pintar();

    expect(screen.getByRole("tab", { name: /Moderar/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Nuevo PR en back squat")).toBeTruthy();
    expect(screen.getByText("comentario feo")).toBeTruthy();
    expect(screen.getByText("2 pendientes")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeTruthy();
  });

  it("una cola que falla no dice «Nada pendiente»", () => {
    estado.comentariosFallan = true;
    pintar();

    expect(screen.queryByText("Nada pendiente.")).toBeNull();
    expect(screen.getByText(/No se pudo cargar la cola de comentarios reportados/)).toBeTruthy();
  });

  it("con las colas limpias dice «Nada pendiente.»", () => {
    pintar();
    expect(screen.getByText("Nada pendiente.")).toBeTruthy();
  });

  it("el coach no ve la pestaña Anuncios ni puede elegir atleta del mes", () => {
    estado.esAdmin = false;
    pintar();

    expect(screen.queryByRole("tab", { name: "Anuncios" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nuevo anuncio" })).toBeNull();
    expect(screen.queryByText("sin elegir", { exact: false })).toBeNull();
    // El histórico sí lo puede leer.
    expect(screen.getByText("Histórico")).toBeTruthy();
  });

  it("el admin ve Anuncios; tocar un anuncio abre la ventana para corregirlo o quitarlo", async () => {
    estado.anuncios = [
      {
        id: "a1",
        title: "Cerramos el lunes",
        body: "Feriado",
        class_type: "",
        photo: null,
        created_at: "2026-11-01T12:00:00Z",
        updated_at: "2026-11-01T12:00:00Z",
      },
    ];
    pintar();

    fireEvent.click(screen.getByRole("tab", { name: "Anuncios" }));
    expect(screen.getByRole("button", { name: "Nuevo anuncio" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar anuncio Cerramos el lunes" }));
    expect(await screen.findByText("Corregir anuncio")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quitar del feed" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
  });

  it("las clases sin atleta del mes salen como pendientes", () => {
    pintar();
    // «Todo el gym» + CrossFit, ninguna con atleta.
    expect(screen.getByText("2 sin elegir")).toBeTruthy();
  });
});
