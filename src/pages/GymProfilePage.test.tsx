// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La ficha del gimnasio: lo que el atleta ve.
 *
 * Lo que se prueba son las tres formas en que esta pantalla podría mentirle al
 * dueño del box:
 *  1. **la vista previa** tiene que seguir al formulario, no a lo guardado: si
 *     mostrara lo guardado, el operador vería el logo viejo mientras escribe el
 *     nuevo y no tendría cómo darse cuenta de que puso una URL rota;
 *  2. **un 200 no es un guardado**: el backend ignora en silencio los campos que
 *     el gym no puede escribir, así que hay que comparar la respuesta con lo
 *     pedido antes de decir "listo";
 *  3. **la economía del contrato no se toca desde aquí**: recargo de Nucleo,
 *     cuota fija, plan SaaS y suspensión son de plataforma. Si un día alguien las
 *     agrega al formulario, este test lo frena.
 */

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

const estado = vi.hoisted(() => ({
  gym: {} as Record<string, unknown>,
  guardado: [] as Record<string, unknown>[],
  /** Lo que contesta la API; por defecto, eco de lo que se le mandó. */
  respuesta: null as Record<string, unknown> | null,
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

vi.mock("../api/hooks", () => ({
  useGymConfig: () => ({ data: estado.gym, isError: false, isLoading: false, refetch: vi.fn() }),
  useUpdateGymProfile: () => ({
    isPending: false,
    mutateAsync: async (body: Record<string, unknown>) => {
      estado.guardado.push(body);
      return estado.respuesta ?? { ...estado.gym, ...body };
    },
  }),
  useMe: () => ({ data: null }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { GymProfilePage } from "./GymProfilePage";

/** Reemplaza el contenido de un campo controlado (un solo `change`, como el DOM). */
function escribir(campo: HTMLElement, valor: string) {
  fireEvent.change(campo, { target: { value: valor } });
}

function pintar() {
  return render(
    <MantineProvider>
      <GymProfilePage />
    </MantineProvider>,
  );
}

beforeEach(() => {
  estado.gym = {
    id: "gym-1",
    name: "Box Zona 10",
    logo_url: "",
    description: "Entrenamiento funcional.",
    location_text: "Zona 10",
    address: "5a avenida 1-23",
    lat: null,
    lng: null,
    is_public: true,
    // Lo que solo escribe plataforma; el gym lo VE, pero no lo manda de vuelta.
    platform_commission_pct: "0.0300",
    fixed_fee: null,
    saas_plan: "starter",
    is_active: true,
  };
  estado.guardado = [];
  estado.respuesta = null;
  avisos.show = [];
});

describe("ficha del gimnasio", () => {
  it("la vista previa sigue lo que se está escribiendo, no lo guardado", async () => {
    pintar();

    // Arranca con lo guardado: el nombre sale dos veces (campo + vista previa).
    expect(screen.getAllByText("Box Zona 10").length).toBeGreaterThan(0);

    const nombre = screen.getByLabelText(/Nombre del gimnasio/);
    escribir(nombre, "Box Cayalá");

    // La vista previa ya dice el nombre nuevo aunque nadie haya guardado nada.
    expect(screen.getByText("Box Cayalá")).toBeTruthy();
  });

  it("guarda solo la ficha: la economía del contrato no viaja nunca", async () => {
    pintar();

    fireEvent.click(screen.getByRole("button", { name: /Guardar ficha/ }));

    await waitFor(() => expect(estado.guardado).toHaveLength(1));
    const enviado = estado.guardado[0];
    expect(enviado.name).toBe("Box Zona 10");
    expect(enviado.description).toBe("Entrenamiento funcional.");
    for (const prohibido of [
      "platform_commission_pct",
      "fixed_fee",
      "saas_plan",
      "is_active",
    ]) {
      expect(prohibido in enviado).toBe(false);
    }
    expect(avisos.show.at(-1)?.color).toBe("teal");
  });

  it("si la API no aplicó el cambio, NO se canta éxito", async () => {
    // El servidor contesta 200 pero devuelve el nombre viejo: el caso real de un
    // campo de solo lectura, que es exactamente cómo "parece hecho y no lo está".
    estado.respuesta = { ...estado.gym };
    pintar();

    const nombre = screen.getByLabelText(/Nombre del gimnasio/);
    escribir(nombre, "Box Cayalá");
    fireEvent.click(screen.getByRole("button", { name: /Guardar ficha/ }));

    await waitFor(() => expect(avisos.show.length).toBeGreaterThan(0));
    expect(avisos.show.at(-1)?.color).toBe("red");
    expect(avisos.show.at(-1)?.message).toMatch(/no guardó la ficha/i);
  });

  it("un nombre de puros espacios no se guarda: es lo primero que ve el atleta", async () => {
    // El campo vacío ya lo frena la validación nativa del navegador (`required`);
    // lo que se prueba aquí es el hueco que esa validación deja pasar y dejaría
    // al gimnasio sin nombre visible en la app de todos sus atletas.
    pintar();

    escribir(screen.getByLabelText(/Nombre del gimnasio/), "   ");
    fireEvent.click(screen.getByRole("button", { name: /Guardar ficha/ }));

    expect(estado.guardado).toHaveLength(0);
    expect(avisos.show.at(-1)?.color).toBe("red");
  });

  it("una coordenada imposible se frena aquí y no sale a la API", async () => {
    pintar();

    escribir(screen.getByLabelText(/Latitud/), "999");
    fireEvent.click(screen.getByRole("button", { name: /Guardar ficha/ }));

    expect(estado.guardado).toHaveLength(0);
    expect(avisos.show.at(-1)?.message).toMatch(/coordenadas/i);
  });

  it("borrar las coordenadas manda null, que es quitarlas (no la cadena vacía)", async () => {
    estado.gym = { ...estado.gym, lat: "14.599512", lng: "-90.518944" };
    pintar();

    escribir(screen.getByLabelText(/Latitud/), "");
    escribir(screen.getByLabelText(/Longitud/), "");
    fireEvent.click(screen.getByRole("button", { name: /Guardar ficha/ }));

    await waitFor(() => expect(estado.guardado).toHaveLength(1));
    expect(estado.guardado[0].lat).toBeNull();
    expect(estado.guardado[0].lng).toBeNull();
  });
});
