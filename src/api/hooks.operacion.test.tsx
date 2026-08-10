// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/**
 * Los tres flujos que hasta hoy obligaban a entrar al Django admin y ahora tienen
 * hook propio: **bloquear/desbloquear** una membresía, editar la **ficha pública**
 * del gimnasio y **admitir** a alguien en la puerta.
 *
 * Van en un archivo aparte de `hooks.test.tsx` a propósito: ese mockea `patch`
 * como un `vi.fn()` mudo, y la ficha del gimnasio se guarda justamente con PATCH.
 *
 * Lo que se prueba no es "que llame al API", sino las tres cosas que si se
 * rompen el panel miente:
 *  1. la ruta lleva el `gym_id` dentro — es el aislamiento por gimnasio, y sin él
 *     el backend responde 403/404 en vez de sancionar a quien se pidió;
 *  2. la mutación invalida la ficha y el padrón — si no, el operador bloquea a
 *     alguien y lo sigue viendo activo;
 *  3. la puerta manda el ATLETA, no la credencial: qué pase se consume lo decide
 *     el backend (`validar_acceso`), y elegirlo aquí sería negocio en el cliente.
 */

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
vi.mock("./client", () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: vi.fn(),
  },
  tokenStore: { access: "t", refresh: null, set: vi.fn(), clear: vi.fn() },
}));

import {
  useAccessAdmit,
  useAccessSearch,
  useBlockMembership,
  useUnblockMembership,
  useUpdateGymProfile,
} from "./hooks";

/** Renderiza el hook y devuelve las claves de caché que invalidó al resolver. */
async function invalidadasPor(
  usar: () => { mutateAsync: (v: never) => Promise<unknown> },
  variables: unknown,
): Promise<string[]> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const { result } = renderHook(usar, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  });
  await act(async () => {
    await result.current.mutateAsync(variables as never);
  });
  return spy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
}

describe("bloquear y desbloquear una membresía", () => {
  it("bloquea la membresía DE ESE gym y manda el motivo", async () => {
    post.mockReset().mockResolvedValue({ data: { id: "m1", status: "blocked" } });
    const keys = await invalidadasPor(() => useBlockMembership("gym-1"), {
      membershipId: "m1",
      reason: "Incumplimiento del reglamento",
    });

    expect(post).toHaveBeenCalledWith("/gym/gym-1/memberships/m1/block", {
      reason: "Incumplimiento del reglamento",
    });
    // Sin estas dos, el socio queda bloqueado y el panel lo sigue pintando activo.
    expect(keys).toContain(JSON.stringify(["memberships", "gym-1"]));
    expect(keys).toContain(JSON.stringify(["membership-detail", "gym-1", "m1"]));
  });

  it("sin motivo manda la cadena vacía, no `undefined`", async () => {
    // `undefined` desaparece al serializar el JSON y el serializer del backend
    // recibiría el campo ausente: se prefiere mandarlo explícito y vacío.
    post.mockReset().mockResolvedValue({ data: { id: "m1" } });
    await invalidadasPor(() => useBlockMembership("gym-1"), { membershipId: "m1" });
    expect(post.mock.calls[0][1]).toEqual({ reason: "" });
  });

  it("desbloquear pega a /unblock (no repite el bloqueo)", async () => {
    post.mockReset().mockResolvedValue({ data: { id: "m1", status: "expired" } });
    await invalidadasPor(() => useUnblockMembership("gym-1"), { membershipId: "m1" });
    expect(post.mock.calls[0][0]).toBe("/gym/gym-1/memberships/m1/unblock");
  });
});

describe("ficha pública del gimnasio", () => {
  it("guarda con PATCH sobre el gym y refresca lo que muestra su nombre", async () => {
    patch.mockReset().mockResolvedValue({ data: { id: "gym-1", name: "Box Zona 15" } });
    const keys = await invalidadasPor(() => useUpdateGymProfile("gym-1"), {
      name: "Box Zona 15",
      description: "CrossFit y funcional.",
    });

    expect(patch).toHaveBeenCalledWith("/gym/gym-1", {
      name: "Box Zona 15",
      description: "CrossFit y funcional.",
    });
    expect(keys).toContain(JSON.stringify(["gym-config", "gym-1"]));
  });
});

describe("puerta del gimnasio", () => {
  it("admitir manda el atleta y la clase: la credencial la elige el backend", async () => {
    post.mockReset().mockResolvedValue({ data: { granted: true, already_registered: false } });
    const keys = await invalidadasPor(() => useAccessAdmit("gym-1", "class-9"), {
      athleteId: "at-7",
    });

    expect(post).toHaveBeenCalledWith("/gym/gym-1/access/admit", {
      action: "class_checkin",
      athlete_id: "at-7",
      gym_class_id: "class-9",
    });
    // El panel NUNCA decide si se consume la membresía o el pase drop-in.
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain("membership_id");
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain("dropin_purchase_id");
    expect(keys).toContain(JSON.stringify(["class-checkins", "gym-1", "class-9"]));
  });

  it("el buscador no consulta con menos de dos letras", () => {
    get.mockReset().mockResolvedValue({ data: { results: [], open_classes: [] } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const w = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    // Una letra dispara una consulta por cada tecla y el backend la descarta
    // igual (mínimo 2): es tráfico que solo sirve para hacer parpadear la lista.
    renderHook(() => useAccessSearch("gym-1", "a", "class-9"), { wrapper: w });
    expect(get).not.toHaveBeenCalled();
  });

  it("el buscador acota la búsqueda a la clase que recepción está pasando", async () => {
    get.mockReset().mockResolvedValue({ data: { query: "ana", count: 0, results: [], open_classes: [] } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const w = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAccessSearch("gym-1", " ana ", "class-9"), {
      wrapper: w,
    });
    await act(async () => {
      await result.current.refetch();
    });
    const url = get.mock.calls[0][0] as string;
    expect(url).toContain("/gym/gym-1/access/search");
    // Sin `gym_class_id` la ficha vendría contra "la clase abierta más cercana",
    // que no tiene por qué ser la que el operador tiene abierta en pantalla.
    expect(url).toContain("gym_class_id=class-9");
    expect(url).toContain("q=ana");
  });
});
