/**
 * Pruebas del interceptor de sesión del panel: decide cuándo se da por muerta la
 * sesión de un admin. Espejo de `nucleo-app-mobile/src/api/client.test.ts`.
 *
 * Los cuerpos de error son los que devuelve de verdad `/auth/refresh` (medidos con
 * curl contra la API el 2026-09-29): un refresh vencido o ilegible es un 401, no un
 * 400. Mientras el interceptor esperó un 400, la sesión caducada nunca se cerraba.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { api, tokenStore } from "./client";

type Respuesta = { status: number; data?: unknown };
let responder: (config: InternalAxiosRequestConfig) => Respuesta;

function errorHttp(status: number, data: unknown = {}): AxiosError {
  const config = {} as InternalAxiosRequestConfig;
  const response = { data, status, statusText: String(status), headers: {}, config };
  return new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, null, response as never);
}

const TOKEN_INVALIDO = {
  detail: "El token es inválido o ha expirado",
  code: "token_not_valid",
  message: "El token es inválido o ha expirado",
};

// Lo que responde /me a una cuenta con `is_active=False`, aunque el access sea
// recién salido del refresh (medido con curl el 2026-09-29).
const USUARIO_INACTIVO = {
  detail: "El usuario está inactivo",
  code: "authentication_failed",
  message: "El usuario está inactivo",
};

const REFRESH_OK = { data: { access: "access-nuevo", refresh: "refresh-2" } } as never;

// jsdom no navega: `location` se cambia por un objeto que solo anota adónde
// quiso mandar el interceptor.
const ubicacion = { href: "" };

beforeAll(() => {
  // Adaptador falso: `responder` decide qué contesta la API en cada prueba.
  api.defaults.adapter = async (config) => {
    const r = responder(config as InternalAxiosRequestConfig);
    const response = {
      data: r.data ?? {},
      status: r.status,
      statusText: String(r.status),
      headers: {},
      config,
    };
    if (r.status >= 200 && r.status < 300) return response as never;
    throw new AxiosError(`HTTP ${r.status}`, "ERR_BAD_RESPONSE", config, null, response as never);
  };
});

beforeEach(() => {
  localStorage.clear();
  ubicacion.href = "http://localhost/panel";
  vi.stubGlobal("location", ubicacion);
  // El access vencido: /me siempre contesta 401 hasta que llegue uno nuevo.
  responder = (config) =>
    config.headers?.Authorization === "Bearer access-nuevo"
      ? { status: 200, data: { ok: true } }
      : { status: 401, data: TOKEN_INVALIDO };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("renovación de sesión del panel", () => {
  it("un 401 token_not_valid del refresh cierra la sesión y manda a /login", async () => {
    tokenStore.set("access-vencido", "refresh-vencido");
    vi.spyOn(axios, "post").mockRejectedValue(errorHttp(401, TOKEN_INVALIDO));

    await expect(api.get("/me")).rejects.toBeDefined();

    // Antes se quedaba en /panel con los dos tokens muertos y el panel decía
    // «todavía ningún gimnasio te ha dado acceso» a un admin de 14 días.
    expect(tokenStore.access).toBeNull();
    expect(tokenStore.refresh).toBeNull();
    expect(ubicacion.href).toBe("/login");
  });

  it("un 400 token_not_valid también la cierra (compatibilidad)", async () => {
    tokenStore.set("access-vencido", "refresh-vencido");
    vi.spyOn(axios, "post").mockRejectedValue(errorHttp(400, TOKEN_INVALIDO));

    await expect(api.get("/me")).rejects.toBeDefined();

    expect(tokenStore.refresh).toBeNull();
    expect(ubicacion.href).toBe("/login");
  });

  it("un 429 del throttle NO cierra la sesión ni borra el refresh", async () => {
    // La cuota de /auth/refresh va por IP: todo el box comparte el wifi y el 429
    // le llega a todos a la vez. Cerrar aquí expulsaba al gimnasio entero.
    tokenStore.set("access-vencido", "refresh-1");
    vi.spyOn(axios, "post").mockRejectedValue(errorHttp(429, { code: "throttled" }));

    await expect(api.get("/me")).rejects.toBeDefined();

    expect(tokenStore.access).toBe("access-vencido");
    expect(tokenStore.refresh).toBe("refresh-1");
    expect(ubicacion.href).toBe("http://localhost/panel");
  });

  it("un bache de red o un 5xx tampoco cierran la sesión", async () => {
    for (const fallo of [new AxiosError("Network Error"), errorHttp(502)]) {
      tokenStore.set("access-vencido", "refresh-1");
      vi.spyOn(axios, "post").mockRejectedValue(fallo);

      await expect(api.get("/me")).rejects.toBeDefined();

      expect(tokenStore.refresh).toBe("refresh-1");
      expect(ubicacion.href).toBe("http://localhost/panel");
      vi.restoreAllMocks();
    }
  });

  it("un refresh que funciona guarda el refresh ROTADO y reintenta la petición", async () => {
    tokenStore.set("access-vencido", "refresh-1");
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { access: "access-nuevo", refresh: "refresh-2" },
    } as never);

    const respuesta = await api.get("/me");

    expect(respuesta.status).toBe(200);
    // Si no se guarda el rotado, la sesión muere a los 14 días del login aunque
    // el admin use el panel a diario.
    expect(tokenStore.refresh).toBe("refresh-2");
    expect(tokenStore.access).toBe("access-nuevo");
  });
});

describe("cuenta desactivada", () => {
  it("un 401 con el reintento ya gastado cierra la sesión y manda a /login", async () => {
    // /me rechaza incluso el access recién renovado, pero /auth/refresh da 200:
    // SimpleJWT 5.3.1 no mira `is_active` al renovar. Antes el reintento solo se
    // rechazaba y el panel se quedaba diciendo que no había gimnasio.
    tokenStore.set("access-1", "refresh-1");
    responder = () => ({ status: 401, data: USUARIO_INACTIVO });
    const refresh = vi.spyOn(axios, "post").mockResolvedValue(REFRESH_OK);

    await expect(api.get("/me")).rejects.toBeDefined();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tokenStore.access).toBeNull();
    expect(tokenStore.refresh).toBeNull();
    expect(ubicacion.href).toBe("/login");
  });

  it("si otra pestaña ya entró con otra cuenta, el 401 del reintento no la saca", async () => {
    tokenStore.set("access-1", "refresh-1");
    responder = (config) => {
      // Mientras viaja el reintento, otra pestaña inicia sesión con otra cuenta
      // (el localStorage es compartido).
      if (config.headers?.Authorization === "Bearer access-nuevo") {
        tokenStore.set("access-otra-cuenta", "refresh-otra-cuenta");
      }
      return { status: 401, data: USUARIO_INACTIVO };
    };
    vi.spyOn(axios, "post").mockResolvedValue(REFRESH_OK);

    await expect(api.get("/me")).rejects.toBeDefined();

    expect(tokenStore.access).toBe("access-otra-cuenta");
    expect(tokenStore.refresh).toBe("refresh-otra-cuenta");
    expect(ubicacion.href).toBe("http://localhost/panel");
  });
});

describe("rutas públicas", () => {
  it("una contraseña mala en /auth/login no renueva ni cierra la sesión anterior", async () => {
    // El login responde 401 a una contraseña mala. Con una sesión vieja en el
    // navegador, tratarlo como sesión caducada renovaba, reintentaba el login,
    // volvía a dar 401 y recargaba /login: el «Credenciales inválidas» no se veía.
    // Mismo `code` que la cuenta inactiva: por el cuerpo no se distinguen, por
    // eso la exención va por ruta.
    tokenStore.set("access-viejo", "refresh-viejo");
    responder = () => ({
      status: 401,
      data: {
        detail: "La combinación de credenciales no tiene una cuenta activa",
        code: "authentication_failed",
      },
    });
    const refresh = vi.spyOn(axios, "post").mockResolvedValue(REFRESH_OK);

    await expect(api.post("/auth/login", { email: "a@box.gt", password: "mala" })).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(tokenStore.access).toBe("access-viejo");
    expect(tokenStore.refresh).toBe("refresh-viejo");
    expect(ubicacion.href).toBe("http://localhost/panel");
  });

  it("/auth/password-change sí exige sesión: su 401 renueva y reintenta", async () => {
    // La exención es por ruta exacta: si se ampliara a todo /auth/, un access
    // vencido al cambiar la contraseña ya no se renovaría.
    tokenStore.set("access-vencido", "refresh-1");
    const refresh = vi.spyOn(axios, "post").mockResolvedValue(REFRESH_OK);

    const respuesta = await api.post("/auth/password-change", { new_password: "nueva-segura" });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(respuesta.status).toBe(200);
  });
});
