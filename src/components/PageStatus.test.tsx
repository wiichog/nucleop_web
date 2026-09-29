// @vitest-environment jsdom
/**
 * `NoGymAssigned` es lo que pintan las páginas del gym cuando no hay gimnasio
 * activo. El `AuthProvider` deja los roles vacíos tanto si /me responde sin roles
 * como si /me FALLA, así que el componente solo puede decir «ningún gimnasio te
 * ha dado acceso» cuando la cuenta de verdad cargó.
 *
 * Va contra el cliente real del panel (interceptor incluido) con un adaptador
 * falso, como `src/api/client.test.ts`: el 429 del throttle de /auth/refresh le
 * llega a React Query como el 401 original de /me, y eso es lo que se reproduce.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  QueryClientConfig,
} from "@tanstack/react-query";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { api, tokenStore } from "../api/client";
import { AuthProvider, useAuth } from "../lib/auth";
import { NoGymAssigned } from "./PageStatus";

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

type Respuesta = { status: number; data?: unknown } | "sin-red";
/** Qué contesta la API por ruta; cada llamada consume la siguiente respuesta. */
let guion: Record<string, Respuesta[]>;
let pedidas: string[];

function errorHttp(status: number, data: unknown = {}): AxiosError {
  const config = {} as InternalAxiosRequestConfig;
  const response = { data, status, statusText: String(status), headers: {}, config };
  return new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, null, response as never);
}

const TOKEN_INVALIDO = { detail: "El token es inválido o ha expirado", code: "token_not_valid" };

const CUENTA_SIN_GYM = {
  email: "ana@box.gt",
  is_superuser: false,
  roles: [],
  athlete: { first_name: "Ana", last_name: "López", photo_url: null },
};

beforeAll(() => {
  api.defaults.adapter = async (config) => {
    const ruta = config.url ?? "";
    pedidas.push(ruta);
    const cola = guion[ruta] ?? [];
    const r = (cola.length > 1 ? cola.shift() : cola[0]) ?? { status: 404 };
    if (r === "sin-red") throw new AxiosError("Network Error", "ERR_NETWORK", config);
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
  tokenStore.set("access-1", "refresh-1");
  guion = {};
  pedidas = [];
  // Nadie debería navegar aquí; si el interceptor lo intenta, queda anotado.
  vi.stubGlobal("location", { href: "http://localhost/panel" });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
});

function pintar(consultas: NonNullable<QueryClientConfig["defaultOptions"]>["queries"] = {}) {
  // Sin reintentos automáticos: el caso es «ya falló», no «está fallando».
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, ...consultas } } });
  const pantalla = render(
    <QueryClientProvider client={cliente}>
      <MantineProvider>
        <NoGymAssigned />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return { ...pantalla, cliente };
}

const NO_CARGO = /No pudimos cargar tu cuenta/;
const SIN_GYM = /todavía ningún gimnasio te ha dado acceso/;

describe("NoGymAssigned solo dice que no hay gimnasio si la cuenta cargó", () => {
  it("con un 429 del refresh, un 5xx o sin red dice que no pudo cargar, y la sesión sigue", async () => {
    const casos: [string, () => void][] = [
      [
        "429 del throttle de /auth/refresh",
        () => {
          guion["/me"] = [{ status: 401, data: TOKEN_INVALIDO }];
          vi.spyOn(axios, "post").mockRejectedValue(
            errorHttp(429, { detail: "Espera 42 segundos.", code: "throttled" }),
          );
        },
      ],
      ["502 durante un deploy", () => (guion["/me"] = [{ status: 502 }])],
      ["red caída", () => (guion["/me"] = ["sin-red"])],
    ];
    for (const [caso, preparar] of casos) {
      preparar();
      const { unmount } = pintar();

      expect(await screen.findByText(NO_CARGO), caso).toBeTruthy();
      expect(screen.queryByText(SIN_GYM), caso).toBeNull();
      expect(screen.getByRole("button", { name: "Reintentar" }), caso).toBeTruthy();
      // No es sesión muerta: nadie la cerró.
      expect(tokenStore.refresh, caso).toBe("refresh-1");

      unmount();
      vi.restoreAllMocks();
    }
  });

  it("Reintentar vuelve a pedir /me y, si la cuenta de verdad no tiene gym, ahora sí lo dice", async () => {
    guion["/me"] = [{ status: 502 }, { status: 200, data: CUENTA_SIN_GYM }];
    pintar();

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText(SIN_GYM)).toBeTruthy();
    expect(screen.getByText("Hola, Ana López")).toBeTruthy();
    expect(screen.queryByText(NO_CARGO)).toBeNull();
    expect(pedidas.filter((ruta) => ruta === "/me")).toHaveLength(2);
  });

  it("del superadmin tampoco miente si falló /platform/gyms, de donde sale su lista", async () => {
    guion["/me"] = [{ status: 200, data: { email: "root@nucleo.app", is_superuser: true, roles: [] } }];
    guion["/platform/gyms"] = [{ status: 503 }, { status: 200, data: [] }];
    pintar();

    expect(await screen.findByText(NO_CARGO)).toBeTruthy();
    expect(screen.queryByText(SIN_GYM)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(screen.queryByText(NO_CARGO)).toBeNull());
    expect(pedidas.filter((ruta) => ruta === "/platform/gyms")).toHaveLength(2);
  });

  it("sin red la consulta queda en pausa (sin error): espera la conexión en vez de mentir", async () => {
    guion["/me"] = [{ status: 200, data: CUENTA_SIN_GYM }];
    onlineManager.setOnline(false);
    pintar();

    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();
    expect(screen.queryByText(SIN_GYM)).toBeNull();
    expect(pedidas).toEqual([]);

    // Al volver la red, React Query reanuda solo y la cuenta carga.
    onlineManager.setOnline(true);
    expect(await screen.findByText(SIN_GYM)).toBeTruthy();
  });

  it("con la pestaña oculta React Query también pausa, y eso no es «sin conexión»", async () => {
    // Medido en el navegador: con el 429 del refresh y la pestaña en segundo
    // plano, /me quedó en pausa con `navigator.onLine === true`. La pausa espera
    // red O que vuelva la pestaña; decir «Sin conexión» ahí era falso.
    guion["/me"] = [{ status: 502 }, { status: 200, data: CUENTA_SIN_GYM }];
    focusManager.setFocused(false);
    const { cliente } = pintar({ retry: 1, retryDelay: 0 });

    await waitFor(() => expect(cliente.getQueryState(["me"])?.fetchStatus).toBe("paused"));
    expect(screen.getByText("Cargando tu cuenta…")).toBeTruthy();
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
    expect(screen.queryByText(SIN_GYM)).toBeNull();

    // Al volver a la pestaña el reintento sigue solo.
    focusManager.setFocused(true);
    expect(await screen.findByText(SIN_GYM)).toBeTruthy();
  });

  it("una cuenta que de verdad no tiene gimnasio lo sigue viendo tal cual", async () => {
    guion["/me"] = [{ status: 200, data: CUENTA_SIN_GYM }];
    pintar();

    expect(await screen.findByText("ana@box.gt")).toBeTruthy();
    expect(screen.getByText(SIN_GYM)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });
});

describe("con el AuthProvider y la compuerta del panel", () => {
  /** El mismo corte que `Protected` (AdminShell): spinner mientras la cuenta carga. */
  function Compuerta() {
    const { loading } = useAuth();
    return loading ? <p>spinner</p> : <NoGymAssigned />;
  }

  it("si /me falló, montar la página no lo reintenta: el error se queda a la vista", async () => {
    // Medido en el navegador con la pestaña visible: al fallar /me la página
    // montaba su propio lector de /me, que lo reintentaba; sin datos la consulta
    // volvía a `pending`, la compuerta volvía al spinner y desmontaba la página,
    // que al fallar se montaba otra vez. Spinner eterno en ciclos de 7 s hasta que
    // vencía el 429, sin que el admin viera nunca el «Reintentar».
    guion["/me"] = [{ status: 502 }];
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={cliente}>
        <MantineProvider>
          <AuthProvider>
            <Compuerta />
          </AuthProvider>
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(NO_CARGO)).toBeTruthy();
    // Margen para que un reintento al montar, si lo hubiera, se dispare.
    await new Promise((listo) => setTimeout(listo, 100));

    expect(screen.getByText(NO_CARGO)).toBeTruthy();
    expect(screen.queryByText("spinner")).toBeNull();
    expect(pedidas.filter((ruta) => ruta === "/me")).toHaveLength(1);
  });
});
