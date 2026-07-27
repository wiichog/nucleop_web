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

import { useDecideJoinRequest, useGymClasses, useRegisterManualPayment } from "./hooks";

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
