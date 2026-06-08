// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock del cliente axios: la primera página trae cursor a la segunda.
const get = vi.fn();
vi.mock("./client", () => ({
  api: { get: (...a: unknown[]) => get(...a), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  tokenStore: { access: "t", refresh: null, set: vi.fn(), clear: vi.fn() },
}));

import { useGymClasses } from "./hooks";

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
