// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const me = vi.fn();
const platformGyms = vi.fn();
vi.mock("../api/hooks", () => ({
  useMe: () => me(),
  usePlatformGyms: (enabled: boolean) => platformGyms(enabled),
}));
vi.mock("../api/client", () => ({ tokenStore: { access: "token", clear: vi.fn() } }));

import { AuthProvider, useAuth } from "./auth";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthProvider — a qué gimnasio/club puede entrar el usuario", () => {
  it("un gym_admin solo ve el gym de su rol y no consulta /platform/gyms", () => {
    me.mockReturnValue({
      data: {
        email: "admin@box.gt",
        is_superuser: false,
        roles: [{ role: "gym_admin", gym_id: "g1", club_id: null }],
      },
      isLoading: false,
    });
    platformGyms.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.gymIds).toEqual(["g1"]);
    expect(result.current.primaryGymId).toBe("g1");
    expect(platformGyms).toHaveBeenCalledWith(false);
  });

  it("el superadmin (sin StaffRoleAssignment por gym) se alimenta de /platform/gyms", () => {
    me.mockReturnValue({
      data: { email: "root@nucleo.app", is_superuser: true, roles: [] },
      isLoading: false,
    });
    platformGyms.mockReturnValue({
      data: [
        { id: "g1", name: "Box Uno" },
        { id: "g2", name: "Box Dos" },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(platformGyms).toHaveBeenCalledWith(true);
    expect(result.current.gyms).toEqual([
      { id: "g1", name: "Box Uno" },
      { id: "g2", name: "Box Dos" },
    ]);
    // Sin esto el superadmin veía el menú del panel con todas las páginas vacías.
    expect(result.current.primaryGymId).toBe("g1");
  });

  it("el rol club_admin habilita el club (es lo que muestra el menú «Mi club»)", () => {
    me.mockReturnValue({
      data: {
        email: "runner@box.gt",
        is_superuser: false,
        roles: [{ role: "club_admin", gym_id: null, club_id: "c1" }],
      },
      isLoading: false,
    });
    platformGyms.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.clubIds).toEqual(["c1"]);
    expect(result.current.primaryClubId).toBe("c1");
    expect(result.current.gymIds).toEqual([]);
  });
});
