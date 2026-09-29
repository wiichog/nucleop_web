// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * «Mi perfil» · cambiar la contraseña después de un restablecimiento.
 *
 * Cuando el gimnasio le restablece la contraseña a alguien, `/me` trae
 * `must_change_password` y el backend deja de pedir la actual
 * (`PasswordChangeSerializer.validate` se la salta). El formulario la seguía
 * exigiendo: sin ella el botón no se habilitaba y la persona tenía que inventarse
 * una contraseña que no sabe.
 *
 * Se mockea `../api/hooks` en el borde: lo que se prueba es qué pide la pantalla
 * y qué le pasa al hook, que es literalmente el cuerpo del POST.
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

const estado = vi.hoisted(() => ({
  /** `must_change_password` de `/me`. */
  cambioForzado: false,
  /** Cada cuerpo que la pantalla le pasó a `usePasswordChange`. */
  enviados: [] as Record<string, unknown>[],
  /** Veces que la pantalla volvió a pedir `/me`. */
  relecturasDeMe: 0,
  /** Error que lanza el cambio (null = éxito). */
  error: null as unknown,
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

vi.mock("../api/hooks", () => ({
  useMe: () => ({
    data: {
      email: "ana@box.gt",
      is_superuser: false,
      must_change_password: estado.cambioForzado,
      roles: [],
      athlete: null,
    },
    refetch: async () => {
      estado.relecturasDeMe += 1;
    },
  }),
  usePasswordChange: () => ({
    isPending: false,
    mutateAsync: async (body: Record<string, unknown>) => {
      estado.enviados.push(body);
      if (estado.error) throw estado.error;
      return { access: "access-nuevo", refresh: "refresh-nuevo" };
    },
  }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    email: "ana@box.gt",
    roles: [],
    isSuperuser: false,
    logout: () => {},
    primaryGymId: null,
    gyms: [],
  }),
}));

import { ProfilePage } from "./ProfilePage";

const NUEVA = "nueva-segura-2026";

function pintar() {
  return render(
    <MantineProvider>
      <ProfilePage />
    </MantineProvider>,
  );
}

function botonActualizar() {
  return screen.getByRole("button", { name: "Actualizar contraseña" }) as HTMLButtonElement;
}

beforeEach(() => {
  estado.cambioForzado = false;
  estado.enviados = [];
  estado.relecturasDeMe = 0;
  estado.error = null;
  avisos.show = [];
});

describe("Mi perfil · cambio de contraseña tras un restablecimiento", () => {
  it("con must_change_password no pide la actual, dice por qué y el envío no la lleva", async () => {
    estado.cambioForzado = true;
    pintar();

    expect(screen.queryByLabelText("Contraseña actual")).toBeNull();
    expect(screen.getByText(/no te pedimos la actual/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: NUEVA } });
    expect(botonActualizar().disabled).toBe(false);
    fireEvent.click(botonActualizar());

    await waitFor(() => expect(estado.enviados).toHaveLength(1));
    // `toStrictEqual`: una clave `current_password` vacía o `undefined` también falla.
    expect(estado.enviados[0]).toStrictEqual({ new_password: NUEVA });
    expect(estado.enviados[0]).not.toHaveProperty("current_password");
    await waitFor(() =>
      expect(avisos.show).toEqual([{ color: "teal", message: "Contraseña actualizada." }]),
    );
    // El backend apagó el flag al guardarla: se vuelve a leer /me para que el
    // siguiente cambio pida la actual otra vez.
    expect(estado.relecturasDeMe).toBe(1);
  });

  it("con must_change_password, si el backend rechaza la nueva dice por qué, no «verifica la actual»", async () => {
    estado.cambioForzado = true;
    estado.error = {
      response: {
        data: {
          detail: { new_password: ["Esta contraseña es demasiado común."] },
          code: "invalid",
          message: "new_password: Esta contraseña es demasiado común.",
        },
      },
    };
    pintar();

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "password123" } });
    fireEvent.click(botonActualizar());

    expect(await screen.findByText(/demasiado común/)).toBeTruthy();
    expect(screen.queryByText(/Verifica la actual/)).toBeNull();
    expect(estado.relecturasDeMe).toBe(0);
  });

  it("sin el flag la actual se sigue exigiendo y viaja en el envío", async () => {
    pintar();

    expect(screen.queryByText(/no te pedimos la actual/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: NUEVA } });
    expect(botonActualizar().disabled).toBe(true);
    fireEvent.click(botonActualizar());
    expect(estado.enviados).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "vieja-segura" },
    });
    expect(botonActualizar().disabled).toBe(false);
    fireEvent.click(botonActualizar());

    await waitFor(() => expect(estado.enviados).toHaveLength(1));
    expect(estado.enviados[0]).toStrictEqual({
      current_password: "vieja-segura",
      new_password: NUEVA,
    });
    await waitFor(() =>
      expect(avisos.show).toEqual([{ color: "teal", message: "Contraseña actualizada." }]),
    );
    expect(estado.relecturasDeMe).toBe(0);
  });
});
