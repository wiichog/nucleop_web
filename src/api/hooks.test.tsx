// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock del cliente axios: la primera página trae cursor a la segunda.
const get = vi.fn();
const post = vi.fn();
vi.mock("./client", () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  tokenStore: { access: "t", refresh: null, set: vi.fn(), clear: vi.fn() },
}));

import {
  useAssignPlan,
  useDecideClubContent,
  useDecideJoinRequest,
  useGymClasses,
  useGymClubContent,
  useRegisterManualPayment,
  useRetryFel,
} from "./hooks";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useGymClasses (sigue la paginación por cursor)", () => {
  it("concatena todas las páginas hasta que no hay next", async () => {
    get.mockReset();
    get
      .mockResolvedValueOnce({
        data: { results: [{ id: "a" }, { id: "b" }], next: "http://x/?cursor=PAGE2", previous: null },
      })
      .mockResolvedValueOnce({
        data: { results: [{ id: "c" }], next: null, previous: null },
      });

    const { result } = renderHook(() => useGymClasses("gym-1"), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c: { id: string }) => c.id)).toEqual(["a", "b", "c"]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("no consulta si no hay gymId", () => {
    get.mockReset();
    renderHook(() => useGymClasses(""), { wrapper: wrapper() });
    expect(get).not.toHaveBeenCalled();
  });
});

/**
 * El badge del menú (pending-summary) solo se refresca solo cada 60 s: si la
 * mutación que RESUELVE el pendiente no lo invalida, el admin resuelve algo y el
 * contador le sigue diciendo que hay trabajo.
 */
describe("las acciones que resuelven un pendiente refrescan su contador", () => {
  async function clavesInvalidadas(
    render: (qc: QueryClient) => Promise<void>,
  ): Promise<string[]> {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    await render(qc);
    return spy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
  }

  it("decidir una solicitud invalida pending-summary y el padrón", async () => {
    post.mockReset().mockResolvedValue({ data: { id: "r1" } });
    const keys = await clavesInvalidadas(async (qc) => {
      const { result } = renderHook(() => useDecideJoinRequest("gym-1"), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        ),
      });
      await act(async () => {
        await result.current.mutateAsync({ requestId: "r1", decision: "approve" });
      });
    });
    expect(keys).toContain(JSON.stringify(["pending-summary", "gym-1"]));
    expect(keys).toContain(JSON.stringify(["memberships", "gym-1"]));
  });

  it("un pago manual invalida morosidad, ficha, dashboard y pendientes", async () => {
    post.mockReset().mockResolvedValue({ data: { id: "p1" } });
    const keys = await clavesInvalidadas(async (qc) => {
      const { result } = renderHook(() => useRegisterManualPayment("gym-1"), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        ),
      });
      await act(async () => {
        await result.current.mutateAsync({ membership_id: "m1", amount: "350", method: "cash" });
      });
    });
    expect(keys).toContain(JSON.stringify(["overdue", "gym-1"]));
    expect(keys).toContain(JSON.stringify(["membership-detail", "gym-1", "m1"]));
    expect(keys).toContain(JSON.stringify(["dashboard", "gym-1"]));
    expect(keys).toContain(JSON.stringify(["pending-summary", "gym-1"]));
  });
});

/**
 * Moderación del contenido de club. Lo que se prueba no es "que llame al API"
 * sino las dos cosas que si se rompen dejan contenido ilegal publicado sin que
 * nadie lo vea: que la cola urgente pida `reported=true`, y que retirar mande el
 * motivo (sin él el backend responde 400 y el retiro no ocurre).
 */
describe("cola de contenido de clubes", () => {
  it("la cola urgente pide sólo lo denunciado, y siempre dentro del gym", async () => {
    get.mockReset().mockResolvedValue({ data: [] });
    const { result } = renderHook(
      () => useGymClubContent("gym-1", { reported: true, kind: "post" }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = get.mock.calls[0][0] as string;
    expect(url).toContain("/gym/gym-1/club-content");
    expect(url).toContain("kind=post");
    expect(url).toContain("reported=true");
  });

  it("sin filtros no ensucia la URL con parámetros vacíos", async () => {
    get.mockReset().mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useGymClubContent("gym-1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get.mock.calls[0][0]).toBe("/gym/gym-1/club-content");
  });

  it("retirar manda el motivo y refresca la cola y los pendientes", async () => {
    post.mockReset().mockResolvedValue({ data: { id: "c1" } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useDecideClubContent("gym-1"), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await act(async () => {
      await result.current.mutateAsync({
        kind: "post",
        contentId: "c1",
        action: "reject",
        reason: "ofensivo",
        note: "",
      });
    });
    expect(post).toHaveBeenCalledWith("/gym/gym-1/club-content/post/c1/reject", {
      reason: "ofensivo",
      note: "",
    });
    const keys = spy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(["gym-club-content", "gym-1"]));
    expect(keys).toContain(JSON.stringify(["pending-summary", "gym-1"]));
  });
});

/**
 * Reintento de la factura electrónica. La ruta lleva el `gym_id` dentro: es el
 * aislamiento por gimnasio del backend, y si el panel la arma sin él (o contra
 * otro gym) el reintento se cae con 403/404 en vez de emitir.
 */
describe("useRetryFel", () => {
  it("pega al pago DE ESE gym y refresca el historial", async () => {
    post.mockReset().mockResolvedValue({ data: { id: "p1", fel_status: "issued" } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useRetryFel("gym-1"), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await act(async () => {
      await result.current.mutateAsync("p1");
    });
    expect(post).toHaveBeenCalledWith("/gym/gym-1/payments/p1/fel/retry", {});
    const keys = spy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(["payments", "gym-1"]));
  });
});

/**
 * `custom_fee` tiene tres estados y el `|| null` de antes los aplastaba en dos:
 * no se podía QUITAR una cuota personalizada porque el panel nunca distinguía
 * "no la toques" de "bórrala".
 */
describe("useAssignPlan distingue no tocar la cuota de quitarla", () => {
  const cuerpoDelPost = () => post.mock.calls[0][1] as Record<string, unknown>;

  async function asignar(customFee?: string | null) {
    post.mockReset().mockResolvedValue({ data: { id: "m1" } });
    const { result } = renderHook(() => useAssignPlan("gym-1"), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ membershipId: "m1", planId: "p1", customFee });
    });
  }

  it("sin cuota indicada la clave no viaja (el backend no la toca)", async () => {
    await asignar(undefined);
    expect("custom_fee" in cuerpoDelPost()).toBe(false);
  });

  it("cuota vacía manda null explícito: eso es QUITARLA", async () => {
    await asignar(null);
    expect(cuerpoDelPost().custom_fee).toBeNull();
  });

  it("con monto manda el decimal tal cual", async () => {
    await asignar("350.00");
    expect(cuerpoDelPost().custom_fee).toBe("350.00");
  });
});
