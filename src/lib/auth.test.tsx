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

describe("AuthProvider — con qué nombre se rotula cada gimnasio/club del selector", () => {
  const GYM = "72079e08-1c2d-4e5f-8a9b-0c1d2e3f4a5b";

  it("el dueño ve el nombre de su gym, que viaja en su rol de /me", () => {
    // El bug: /platform/gyms es solo del superadmin, así que el encabezado de un
    // dueño decía «Gym 72079e08».
    me.mockReturnValue({
      data: {
        email: "admin@nucleo.app",
        is_superuser: false,
        roles: [
          { role: "gym_admin", gym_id: GYM, club_id: null, gym_name: "CrossFit Demo", club_name: null },
        ],
      },
      isLoading: false,
    });
    platformGyms.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.gyms).toEqual([{ id: GYM, name: "CrossFit Demo" }]);
    expect(platformGyms).toHaveBeenCalledWith(false);
  });

  it("con roles en varios gyms, cada uno sale una vez y con su nombre", () => {
    me.mockReturnValue({
      data: {
        email: "coach@box.gt",
        is_superuser: false,
        roles: [
          { role: "gym_admin", gym_id: "g1", club_id: null, gym_name: "Box Uno", club_name: null },
          { role: "coach", gym_id: "g1", club_id: null, gym_name: "Box Uno", club_name: null },
          { role: "coach", gym_id: "g2", club_id: null, gym_name: "Box Dos", club_name: null },
        ],
      },
      isLoading: false,
    });
    platformGyms.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.gyms).toEqual([
      { id: "g1", name: "Box Uno" },
      { id: "g2", name: "Box Dos" },
    ]);
  });

  it("el admin de club ve el nombre de su club", () => {
    me.mockReturnValue({
      data: {
        email: "runner@box.gt",
        is_superuser: false,
        roles: [
          { role: "club_admin", gym_id: null, club_id: "c1", gym_name: null, club_name: "Corredores GT" },
        ],
      },
      isLoading: false,
    });
    platformGyms.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.clubs).toEqual([{ id: "c1", name: "Corredores GT" }]);
    expect(result.current.clubIds).toEqual(["c1"]);
  });

  it("si la API todavía no manda el nombre, se ve el recorte del id como antes", () => {
    // Ventana entre desplegar el panel y desplegar la API: no se rompe nada.
    me.mockReturnValue({
      data: {
        email: "admin@nucleo.app",
        is_superuser: false,
        roles: [
          { role: "gym_admin", gym_id: GYM, club_id: null },
          { role: "club_admin", gym_id: null, club_id: "c1a2b3c4-0000-0000-0000-000000000000" },
        ],
      },
      isLoading: false,
    });
    platformGyms.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.gyms).toEqual([{ id: GYM, name: "Gym 72079e08" }]);
    expect(result.current.clubs.map((club) => club.name)).toEqual(["Club c1a2b3c4"]);
  });
});
