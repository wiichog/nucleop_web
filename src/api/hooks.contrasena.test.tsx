// @vitest-environment jsdom
/**
 * Cambiar la contraseña en «Mi perfil» sacaba al admin del panel: veía «Contraseña
 * actualizada» y en menos de un minuto caía en /login, sin explicación.
 *
 * El backend cierra todas las sesiones al cambiarla y responde con un par nuevo;
 * el panel lo descartaba. Estas pruebas van contra el cliente real (interceptor
 * incluido) con un servidor falso que se porta como el de verdad, medido contra
 * una API aislada el 2026-09-29:
 *  - `/auth/password-change` responde 200 con `access` y `refresh` nuevos;
 *  - un access emitido antes del cambio da 401 `authentication_failed`, «The
 *    user's password has been changed.» (`CHECK_REVOKE_TOKEN` ata cada token al
 *    hash de la contraseña);
 *  - el refresh del LOGIN da 401 `token_not_valid`: `revocar_sesiones` lo mete en
 *    la blacklist;
 *  - un refresh ya ROTADO no tiene fila en `OutstandingToken` y renueva con 200,
 *    pero el access que devuelve hereda el hash viejo y también da 401.
 *
 * Va aparte de `hooks.test.tsx` porque ese mockea `./client`, y lo que saca al
 * admin es justamente el interceptor del cliente.
 */
import type { ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../lib/auth";
import { ProfilePage } from "../pages/ProfilePage";
import { api, tokenStore } from "./client";
import { usePasswordChange } from "./hooks";

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

const ACCESS_VIEJO = "access-viejo";
const REFRESH_DEL_LOGIN = "refresh-del-login";
const REFRESH_ROTADO = "refresh-rotado";
const ACCESS_NUEVO = "access-nuevo";
const REFRESH_NUEVO = "refresh-nuevo";

const CONTRASENA_CAMBIADA = {
  detail: "The user's password has been changed.",
  code: "authentication_failed",
  message: "The user's password has been changed.",
};
const EN_LISTA_NEGRA = {
  detail: "El token está en lista negra",
  code: "token_not_valid",
  message: "El token está en lista negra",
};

const CUENTA = {
  email: "ana@box.gt",
  is_superuser: false,
  must_change_password: false,
  roles: [
    { role: "gym_admin", gym_id: "g1", gym_name: "Box Zona 10", club_id: null, club_name: null },
  ],
  athlete: null,
};

// --- Servidor falso ---------------------------------------------------------

/** A qué versión de la contraseña quedó atado cada token (el claim de `CHECK_REVOKE_TOKEN`). */
let atadoA: Map<string, number>;
let contrasenaVigente: number;
/** Los refresh que `revocar_sesiones` alcanza: solo los que emite `for_user` dejan fila. */
let revocables: Set<string>;
let listaNegra: Set<string>;
let renovaciones: number;
/** Cada refresh que el interceptor mandó a `/auth/refresh`, en orden. */
let refrescos: string[];
/** Cada petición que llegó al servidor, con el access con que salió. */
let pedidas: { ruta: string; autorizacion?: string }[];

function servidor(ruta: string, autorizacion?: string): { status: number; data: unknown } {
  const access = autorizacion?.replace(/^Bearer /, "") ?? "";
  const version = atadoA.get(access);
  if (version === undefined) return { status: 401, data: EN_LISTA_NEGRA };
  if (version !== contrasenaVigente) return { status: 401, data: CONTRASENA_CAMBIADA };
  if (ruta === "/auth/password-change") {
    contrasenaVigente += 1;
    for (const refresh of revocables) listaNegra.add(refresh);
    // `_tokens_for` emite con `for_user`: el par nuevo sí deja fila.
    atadoA.set(ACCESS_NUEVO, contrasenaVigente);
    atadoA.set(REFRESH_NUEVO, contrasenaVigente);
    revocables.add(REFRESH_NUEVO);
    return {
      status: 200,
      data: {
        detail: "Contraseña actualizada.",
        code: "password_changed",
        access: ACCESS_NUEVO,
        refresh: REFRESH_NUEVO,
      },
    };
  }
  if (ruta === "/me") return { status: 200, data: CUENTA };
  return { status: 200, data: {} };
}

function errorHttp(status: number, data: unknown): AxiosError {
  const config = {} as InternalAxiosRequestConfig;
  const response = { data, status, statusText: String(status), headers: {}, config };
  return new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, null, response as never);
}

/** `/auth/refresh` (el interceptor lo llama con el `axios` global, no con `api`). */
function renovar(refresh: string) {
  refrescos.push(refresh);
  const version = atadoA.get(refresh);
  if (version === undefined || listaNegra.has(refresh)) {
    return Promise.reject(errorHttp(401, EN_LISTA_NEGRA));
  }
  // El access copia los claims del refresh, hash de la contraseña incluido. El
  // refresh rotado no deja fila, así que `revocar_sesiones` tampoco lo alcanza.
  renovaciones += 1;
  const access = `access-renovado-${renovaciones}`;
  const rotado = `refresh-renovado-${renovaciones}`;
  atadoA.set(access, version);
  atadoA.set(rotado, version);
  return Promise.resolve({ data: { access, refresh: rotado } });
}

type Retencion = {
  ruta: string;
  cuando: (autorizacion?: string) => boolean;
  llegar: () => void;
  suelta: Promise<void>;
};
let retenciones: Retencion[];

/**
 * Retiene la respuesta de la próxima petición a `ruta` que cumpla `cuando`: el
 * servidor la procesa al recibirla (`llego`) y el test decide cuándo le llega la
 * respuesta al panel (`soltar`). Así se ordena la carrera a voluntad.
 */
function retener(ruta: string, cuando: (autorizacion?: string) => boolean = () => true) {
  let llegar!: () => void;
  let soltar!: () => void;
  const llego = new Promise<void>((listo) => (llegar = listo));
  const suelta = new Promise<void>((listo) => (soltar = listo));
  retenciones.push({ ruta, cuando, llegar, suelta });
  return { llego, soltar };
}

beforeAll(() => {
  api.defaults.adapter = async (config) => {
    const ruta = config.url ?? "";
    const autorizacion = config.headers?.Authorization as string | undefined;
    pedidas.push({ ruta, autorizacion });
    const r = servidor(ruta, autorizacion);
    const i = retenciones.findIndex((ret) => ret.ruta === ruta && ret.cuando(autorizacion));
    if (i >= 0) {
      const [retencion] = retenciones.splice(i, 1);
      retencion.llegar();
      await retencion.suelta;
    }
    const response = {
      data: r.data,
      status: r.status,
      statusText: String(r.status),
      headers: {},
      config,
    };
    if (r.status >= 200 && r.status < 300) return response as never;
    throw new AxiosError(`HTTP ${r.status}`, "ERR_BAD_RESPONSE", config, null, response as never);
  };
});

// jsdom no navega: el interceptor solo deja anotado adónde quiso mandar al admin.
const ubicacion = { href: "" };
const EN_EL_PERFIL = "http://localhost/panel/perfil";

beforeEach(() => {
  localStorage.clear();
  ubicacion.href = EN_EL_PERFIL;
  vi.stubGlobal("location", ubicacion);
  contrasenaVigente = 1;
  atadoA = new Map([
    [ACCESS_VIEJO, 1],
    [REFRESH_DEL_LOGIN, 1],
    [REFRESH_ROTADO, 1],
  ]);
  revocables = new Set([REFRESH_DEL_LOGIN]);
  listaNegra = new Set();
  renovaciones = 0;
  refrescos = [];
  pedidas = [];
  retenciones = [];
  vi.spyOn(axios, "post").mockImplementation(((url: string, body?: { refresh?: string }) =>
    url.endsWith("/auth/refresh")
      ? renovar(body?.refresh ?? "")
      : Promise.reject(new Error(`POST inesperado a ${url}`))) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const NUEVA = { current_password: "vieja-segura", new_password: "nueva-segura-2026" };

function conQueryClient() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
}

describe("Mi perfil: cambiar la contraseña no saca al admin del panel", () => {
  it("guarda el par nuevo y la siguiente petición sale con el access nuevo", async () => {
    tokenStore.set(ACCESS_VIEJO, REFRESH_DEL_LOGIN);
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={cliente}>
        <MantineProvider>
          <Notifications />
          <MemoryRouter>
            <AuthProvider>
              <ProfilePage />
            </AuthProvider>
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    fireEvent.change(await screen.findByLabelText("Contraseña actual"), {
      target: { value: NUEVA.current_password },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: NUEVA.new_password },
    });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByText("Contraseña actualizada.")).toBeTruthy();
    expect(tokenStore.access).toBe(ACCESS_NUEVO);
    expect(tokenStore.refresh).toBe(REFRESH_NUEVO);

    // La siguiente petición del panel: el pending-summary, que se pide cada 60 s.
    // Antes salía con el access viejo, el refresh del login estaba en la blacklist
    // y el interceptor mandaba al admin a /login.
    const respuesta = await api.get("/gym/g1/pending-summary");

    expect(respuesta.status).toBe(200);
    expect(pedidas[pedidas.length - 1]).toEqual({
      ruta: "/gym/g1/pending-summary",
      autorizacion: `Bearer ${ACCESS_NUEVO}`,
    });
    expect(refrescos).toEqual([]);
    expect(ubicacion.href).toBe(EN_EL_PERFIL);
  });
});

describe("una consulta que salió con el access viejo y vuelve con 401 después del cambio", () => {
  it("si el par nuevo ya está guardado, renueva con el refresh NUEVO y el reintento sale bien", async () => {
    tokenStore.set(ACCESS_VIEJO, REFRESH_DEL_LOGIN);
    const cambio = retener("/auth/password-change");
    const enVuelo = retener("/gym/g1/pending-summary");
    const { result } = renderHook(() => usePasswordChange(), { wrapper: conQueryClient() });

    let cambiar!: Promise<unknown>;
    act(() => {
      cambiar = result.current.mutateAsync(NUEVA);
    });
    // El servidor ya cambió la contraseña; su respuesta viene en camino.
    await cambio.llego;
    // El pending-summary sale con el access viejo y el servidor lo rechaza.
    const consulta = api.get("/gym/g1/pending-summary");
    await enVuelo.llego;

    // Primero le llega al panel la respuesta del cambio y después el 401.
    await act(async () => {
      cambio.soltar();
      await cambiar;
    });
    enVuelo.soltar();

    await expect(consulta).resolves.toMatchObject({ status: 200 });
    // El refresh del login está en la blacklist: renovar con él era la expulsión.
    expect(refrescos).toEqual([REFRESH_NUEVO]);
    expect(pedidas.filter((p) => p.ruta === "/gym/g1/pending-summary")).toEqual([
      { ruta: "/gym/g1/pending-summary", autorizacion: `Bearer ${ACCESS_VIEJO}` },
      { ruta: "/gym/g1/pending-summary", autorizacion: "Bearer access-renovado-1" },
    ]);
    expect(tokenStore.refresh).toBe("refresh-renovado-1");
    expect(ubicacion.href).toBe(EN_EL_PERFIL);
  });

  it("si su reintento salió con un access renovado del refresh VIEJO, ese 401 no cierra la sesión nueva", async () => {
    // Un refresh ya rotado: sin fila en OutstandingToken, `revocar_sesiones` no lo
    // alcanza y renueva con 200… un access atado todavía a la contraseña vieja.
    tokenStore.set(ACCESS_VIEJO, REFRESH_ROTADO);
    const cambio = retener("/auth/password-change");
    // Solo el reintento; el primer intento (con el access viejo) vuelve al tiro.
    const reintento = retener("/gym/g1/pending-summary", (a) => a !== `Bearer ${ACCESS_VIEJO}`);
    const { result } = renderHook(() => usePasswordChange(), { wrapper: conQueryClient() });

    let cambiar!: Promise<unknown>;
    act(() => {
      cambiar = result.current.mutateAsync(NUEVA);
    });
    await cambio.llego;

    // El 401 de la consulta le gana a la respuesta del cambio: el interceptor
    // renueva con el refresh viejo y el reintento sale con ese access.
    const consulta = api.get("/gym/g1/pending-summary");
    await reintento.llego;
    expect(refrescos).toEqual([REFRESH_ROTADO]);

    await act(async () => {
      cambio.soltar();
      await cambiar;
    });
    reintento.soltar();

    // La consulta falla (su access era de la contraseña vieja), pero la guarda del
    // reintento ve que el token rechazado ya no es el guardado y no expulsa.
    await expect(consulta).rejects.toMatchObject({ response: { status: 401 } });
    expect(tokenStore.access).toBe(ACCESS_NUEVO);
    expect(tokenStore.refresh).toBe(REFRESH_NUEVO);
    expect(ubicacion.href).toBe(EN_EL_PERFIL);

    // Y la siguiente petición ya sale con el access nuevo.
    await expect(api.get("/me")).resolves.toMatchObject({ status: 200 });
    expect(pedidas[pedidas.length - 1].autorizacion).toBe(`Bearer ${ACCESS_NUEVO}`);
  });
});
