// @vitest-environment jsdom
/**
 * `NoGymAssigned` es lo que pintan las páginas del gym cuando no hay gimnasio
 * activo. El `AuthProvider` deja los roles vacíos tanto si /me responde sin roles
 * como si /me FALLA, así que el componente solo puede decir «ningún gimnasio te
 * ha dado acceso» cuando la cuenta de verdad cargó. Lo mismo las pantallas que
 * deciden por rol por su cuenta (plataforma y club): pasan por la misma guarda,
 * `useCuentaSinCargar`, antes de negar el acceso.
 *
 * Va contra el cliente real del panel (interceptor incluido) con un adaptador
 * falso, como `src/api/client.test.ts`: el 429 del throttle de /auth/refresh le
 * llega a React Query como el 401 original de /me, y eso es lo que se reproduce.
 */
import type { ComponentType, ReactNode } from "react";
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
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { api, tokenStore } from "../api/client";
import { AuthProvider, useAuth } from "../lib/auth";
import { ClubAdminPage } from "../pages/ClubAdminPage";
import { PlatformAppealsPage } from "../pages/PlatformAppealsPage";
import { PlatformChargebacksPage } from "../pages/PlatformChargebacksPage";
import { PlatformGymsPage } from "../pages/PlatformGymsPage";
import { PlatformReportsPage } from "../pages/PlatformReportsPage";
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
// Las pestañas y la tabla de las pantallas observan su tamaño; jsdom no trae
// ResizeObserver.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
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

/** Las tres formas en que /me falla sin que la sesión haya muerto. */
const FALLAS_DE_ME: [string, () => void][] = [
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
    for (const [caso, preparar] of FALLAS_DE_ME) {
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

/** El mismo corte que `Protected` (AdminShell): spinner mientras la cuenta carga. */
function Compuerta({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  return loading ? <p>spinner</p> : <>{children}</>;
}

describe("con el AuthProvider y la compuerta del panel", () => {
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
            <Compuerta>
              <NoGymAssigned />
            </Compuerta>
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

const SUPERADMIN = { email: "root@nucleo.app", is_superuser: true, roles: [] };
const CLUB_ADMIN = {
  email: "sofi@runners.gt",
  is_superuser: false,
  roles: [
    { role: "club_admin", gym_id: null, gym_name: null, club_id: "club-1", club_name: "Runners 1821" },
  ],
};

/** Lo que responde cada bandeja cuando la cuenta sí entra: vacía, pero cargada. */
const listasVacias = (): Record<string, Respuesta[]> => ({
  "/platform/gyms": [{ status: 200, data: [] }],
  "/platform/appeals": [{ status: 200, data: [] }],
  "/platform/billing/chargebacks": [{ status: 200, data: [] }],
  "/platform/reports?status=open&with_prompt=1": [{ status: 200, data: [] }],
  "/club/club-1/activities": [{ status: 200, data: [] }],
});

/**
 * Las pantallas que deciden por rol sin pasar por `NoGymAssigned`. Con /me caído
 * le negaban el acceso a quien sí lo tiene: «Acceso restringido» al superadmin,
 * «Sin club asignado» al club_admin. Cada una con su negativa, la cuenta que sí
 * entra y algo que solo se ve adentro.
 */
const PANTALLAS: {
  nombre: string;
  Pagina: ComponentType;
  negativa: string;
  conAcceso: unknown;
  adentro: string;
}[] = [
  {
    nombre: "Gimnasios de la plataforma",
    Pagina: PlatformGymsPage,
    negativa: "Acceso restringido",
    conAcceso: SUPERADMIN,
    adentro: "La red, gimnasio por gimnasio",
  },
  {
    nombre: "Apelaciones escaladas",
    Pagina: PlatformAppealsPage,
    negativa: "Sin acceso",
    conAcceso: SUPERADMIN,
    adentro: "No hay apelaciones esperando a Nucleo.",
  },
  {
    nombre: "Contracargos de la red",
    Pagina: PlatformChargebacksPage,
    negativa: "Sin acceso",
    conAcceso: SUPERADMIN,
    adentro: "Casos sin resolver",
  },
  {
    nombre: "Reportes del app",
    Pagina: PlatformReportsPage,
    negativa: "Sin acceso",
    conAcceso: SUPERADMIN,
    adentro: "Reportes del app",
  },
  {
    nombre: "Administrar club",
    Pagina: ClubAdminPage,
    negativa: "Sin club asignado",
    conAcceso: CLUB_ADMIN,
    adentro: "Administrar club",
  },
];

/** Como en el panel: la pantalla detrás de la compuerta, con el AuthProvider real. */
function pintarPantalla(Pagina: ComponentType) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MantineProvider>
        <MemoryRouter>
          <AuthProvider>
            <Compuerta>
              <Pagina />
            </Compuerta>
          </AuthProvider>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe.each(PANTALLAS)(
  "$nombre solo niega el acceso si la cuenta cargó",
  ({ Pagina, negativa, conAcceso, adentro }) => {
    it("con un 429 del refresh, un 5xx o sin red dice que no pudo cargar la cuenta", async () => {
      for (const [caso, preparar] of FALLAS_DE_ME) {
        preparar();
        const { unmount } = pintarPantalla(Pagina);

        expect(await screen.findByText(NO_CARGO), caso).toBeTruthy();
        expect(screen.queryByText(negativa), caso).toBeNull();
        expect(screen.getByRole("button", { name: "Reintentar" }), caso).toBeTruthy();

        unmount();
        vi.restoreAllMocks();
      }
    });

    it("Reintentar vuelve a pedir /me y quien tiene el rol entra", async () => {
      Object.assign(guion, listasVacias());
      guion["/me"] = [{ status: 502 }, { status: 200, data: conAcceso }];
      pintarPantalla(Pagina);

      fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

      // Monta la pantalla entera (tabla, formularios): con la suite en paralelo el
      // test llegó a 1,5 s, y el plazo por defecto de `findBy` es 1 s.
      expect(await screen.findByText(adentro, {}, { timeout: 5000 })).toBeTruthy();
      expect(screen.queryByText(negativa)).toBeNull();
      expect(screen.queryByText(NO_CARGO)).toBeNull();
    });

    it("a quien de verdad no tiene el rol se lo sigue negando", async () => {
      guion["/me"] = [{ status: 200, data: CUENTA_SIN_GYM }];
      pintarPantalla(Pagina);

      expect(await screen.findByText(negativa)).toBeTruthy();
      expect(screen.queryByText(NO_CARGO)).toBeNull();
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    });
  },
);
