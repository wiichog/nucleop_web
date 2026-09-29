// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * «Mi perfil» · cambiar la contraseña, o crearla si la cuenta no tiene una.
 *
 * Hay dos casos en que el backend no pide la actual (`PasswordChangeSerializer.validate`
 * se la salta), y en los dos el formulario la seguía exigiendo: sin ella el botón no
 * se habilitaba.
 * - Cuando el gimnasio le restablece la contraseña a alguien, `/me` trae
 *   `must_change_password`, y la persona tenía que inventarse una que no sabe.
 * - Quien entra con Google, Facebook o Apple no tiene contraseña: `/me` trae
 *   `has_usable_password: false`, y nunca podía crear una.
 *
 * Los rechazos muestran lo que dijo el backend. Antes, sin cambio forzado, todo
 * rechazo decía «Verifica la actual», aunque lo rechazado fuera la nueva. Los
 * errores de prueba copian la respuesta real de la API.
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
  /** `has_usable_password` de `/me` (undefined = un backend que aún no lo manda). */
  tieneContrasena: true as boolean | undefined,
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
      has_usable_password: estado.tieneContrasena,
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

// Respuestas reales de `/auth/password-change`, capturadas de la API el 2026-09-29.
// En `message`, un error de campo lleva su clave interna delante; los de las reglas
// de Django (`non_field_errors`) no.
const NUEVA_RECHAZADA = {
  response: {
    status: 400,
    data: {
      detail: {
        non_field_errors: [
          "Esta contraseña es demasiado común.",
          "Esta contraseña es completamente numérica.",
        ],
      },
      code: "invalid",
      message: "Esta contraseña es demasiado común.",
    },
  },
};
const ACTUAL_INCORRECTA = {
  response: {
    status: 400,
    data: {
      detail: { current_password: ["La contraseña actual no es correcta."] },
      code: "invalid",
      message: "current_password: La contraseña actual no es correcta.",
    },
  },
};

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
  estado.tieneContrasena = true;
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
    estado.error = NUEVA_RECHAZADA;
    pintar();

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "12345678" } });
    fireEvent.click(botonActualizar());

    expect(await screen.findByText("Esta contraseña es demasiado común.")).toBeTruthy();
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

  it("sin el flag, si el backend rechaza la nueva dice por qué, no «verifica la actual»", async () => {
    estado.error = NUEVA_RECHAZADA;
    pintar();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "vieja-segura" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "12345678" } });
    fireEvent.click(botonActualizar());

    expect(await screen.findByText("Esta contraseña es demasiado común.")).toBeTruthy();
    expect(screen.queryByText(/Verifica la actual/)).toBeNull();
  });

  it("si la actual no es correcta lo dice sin la clave interna del campo", async () => {
    estado.error = ACTUAL_INCORRECTA;
    pintar();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "incorrecta" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: NUEVA } });
    fireEvent.click(botonActualizar());

    // Texto exacto: «current_password: La contraseña…» no pasa.
    expect(await screen.findByText("La contraseña actual no es correcta.")).toBeTruthy();
    expect(screen.queryByText(/current_password/)).toBeNull();
  });
});

describe("Mi perfil · cuenta sin contraseña (entra con Google, Facebook o Apple)", () => {
  it("no pide la actual, dice por qué, la crea y vuelve a leer /me", async () => {
    estado.tieneContrasena = false;
    pintar();

    expect(screen.queryByLabelText("Contraseña actual")).toBeNull();
    expect(screen.getByText(/todavía no tiene contraseña/)).toBeTruthy();
    const crear = screen.getByRole("button", { name: "Crear contraseña" }) as HTMLButtonElement;

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: NUEVA } });
    expect(crear.disabled).toBe(false);
    fireEvent.click(crear);

    await waitFor(() => expect(estado.enviados).toHaveLength(1));
    expect(estado.enviados[0]).toStrictEqual({ new_password: NUEVA });
    await waitFor(() =>
      expect(avisos.show).toEqual([{ color: "teal", message: "Contraseña creada." }]),
    );
    // Ya tiene contraseña: se vuelve a leer /me para que el siguiente cambio pida la actual.
    expect(estado.relecturasDeMe).toBe(1);
  });

  it("con un backend que todavía no manda el campo, se sigue pidiendo la actual", () => {
    estado.tieneContrasena = undefined;
    pintar();

    expect(screen.getByLabelText("Contraseña actual")).toBeTruthy();
    expect(screen.queryByText(/todavía no tiene contraseña/)).toBeNull();
    expect(botonActualizar().disabled).toBe(true);
  });
});
