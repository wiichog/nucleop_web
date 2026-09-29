// @vitest-environment jsdom
/**
 * El botón de reportar un problema, en el header del panel, lee `/reports/config`
 * para saber si el superadmin apagó el reporter. Salía junto con /me con solo tener
 * token: si /me fallaba por un 429 del throttle de /auth/refresh, cada reintento de
 * la config gastaba otro refresh (en el navegador, 3 de los 7 de una carga). Ahora
 * espera a que cargue la cuenta.
 *
 * Va contra el cliente real del panel (interceptor incluido) con un adaptador
 * falso, como `PageStatus.test.tsx`.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { api, tokenStore } from "../api/client";
import { AuthProvider } from "../lib/auth";
import { ReportIssueButton } from "./ReportIssueModal";

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

type Respuesta = { status: number; data?: unknown };
/** Qué contesta la API por ruta; cada llamada consume la siguiente respuesta. */
let guion: Record<string, Respuesta[]>;
let pedidas: string[];

function errorHttp(status: number, data: unknown = {}): AxiosError {
  const config = {} as InternalAxiosRequestConfig;
  const response = { data, status, statusText: String(status), headers: {}, config };
  return new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, null, response as never);
}

const TOKEN_INVALIDO = { detail: "El token es inválido o ha expirado", code: "token_not_valid" };
const CUENTA = { email: "ana@box.gt", is_superuser: false, roles: [], athlete: null };
const BOTON = { name: "Reportar un problema" };

beforeAll(() => {
  api.defaults.adapter = async (config) => {
    const ruta = config.url ?? "";
    pedidas.push(ruta);
    const cola = guion[ruta] ?? [];
    const r = (cola.length > 1 ? cola.shift() : cola[0]) ?? { status: 404 };
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
});

function pintar() {
  // Los 3 reintentos que React Query hace por defecto, sin la espera entre ellos.
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
  render(
    <QueryClientProvider client={cliente}>
      <MantineProvider>
        <MemoryRouter>
          <AuthProvider>
            <ReportIssueButton />
          </AuthProvider>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return cliente;
}

const pedidasDeConfig = () => pedidas.filter((ruta) => ruta === "/reports/config");

describe("ReportIssueButton · la config del reporter espera a la cuenta", () => {
  it("mientras /me falla por el 429 del refresh, no pide la config ni gasta refresh de más", async () => {
    guion["/me"] = [{ status: 401, data: TOKEN_INVALIDO }];
    guion["/reports/config"] = [{ status: 401, data: TOKEN_INVALIDO }];
    const refresh = vi
      .spyOn(axios, "post")
      .mockRejectedValue(errorHttp(429, { detail: "Espera 42 segundos.", code: "throttled" }));
    const cliente = pintar();

    await waitFor(() => expect(cliente.getQueryState(["me"])?.status).toBe("error"));
    expect(pedidasDeConfig()).toEqual([]);
    // Solo los intentos de /me (1 + 3 reintentos) pidieron refresh.
    expect(refresh).toHaveBeenCalledTimes(4);
    // Sin config el botón se muestra igual.
    expect(screen.getByRole("button", BOTON)).toBeTruthy();
  });

  it("con la cuenta cargada pide la config y respeta el kill-switch", async () => {
    guion["/me"] = [{ status: 200, data: CUENTA }];
    guion["/reports/config"] = [
      {
        status: 200,
        data: { web_enabled: false, mobile_enabled: true, updated_at: "2026-09-29T00:00:00Z" },
      },
    ];
    pintar();

    await waitFor(() => expect(screen.queryByRole("button", BOTON)).toBeNull());
    expect(pedidasDeConfig()).toHaveLength(1);
  });
});
