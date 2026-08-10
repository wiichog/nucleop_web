// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Recepción: marcar presente a quien llegó a la clase.
 *
 * Antes esto era un selector con TODO el padrón activo. Lo que se prueba es
 * justo lo que ese selector no podía hacer y por eso obligaba a adivinar:
 *
 *  1. **quién es y cómo llega** — socio o visitante con pase, si ya reservó esta
 *     clase y si ya está marcado. Sin eso, recepción marcaba dos veces al mismo
 *     y no encontraba nunca al del drop-in (que ni salía en la lista);
 *  2. **por qué NO se puede admitir** sale del backend palabra por palabra: si el
 *     panel redactara su propia excusa, se desincronizaría de la regla real;
 *  3. **la credencial la elige el servidor**: se manda el atleta, nunca la
 *     membresía o el pase. Elegirlos aquí sería mover negocio al cliente.
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
  resultados: [] as unknown[],
  buscado: [] as { texto: string; classId?: string }[],
  admitido: [] as { athleteId: string }[],
  /** Error que lanza `admitir` (null = éxito). */
  errorAlAdmitir: null as unknown,
}));
const avisos = vi.hoisted(() => ({ show: [] as { color?: string; message?: string }[] }));

vi.mock("../api/hooks", () => ({
  useAccessSearch: (gymId: string, texto: string, classId?: string) => {
    estado.buscado.push({ texto, classId });
    return {
      data: { query: texto, count: estado.resultados.length, results: estado.resultados, open_classes: [] },
      isError: false,
      isFetching: false,
    };
  },
  useAccessAdmit: () => ({
    isPending: false,
    mutateAsync: async ({ athleteId }: { athleteId: string }) => {
      estado.admitido.push({ athleteId });
      if (estado.errorAlAdmitir) throw estado.errorAlAdmitir;
      return { granted: true, already_registered: false, code: "checkin_registered" };
    },
  }),
  // El resto del módulo lo importa `ClassesPage`; con mockearlos basta para
  // que el archivo cargue sin levantar toda la pantalla.
  useAddWodResult: () => ({}),
  useCancelClass: () => ({}),
  useClassCheckins: () => ({ data: [] }),
  useClassQr: () => ({ data: null }),
  useCreateDropinProduct: () => ({}),
  useCreateSchedule: () => ({}),
  useCreateServiceType: () => ({}),
  useCreateWod: () => ({}),
  useDeactivateDropinProduct: () => ({}),
  useDeleteClass: () => ({}),
  useDeleteSchedule: () => ({}),
  useDeleteServiceType: () => ({}),
  useGymDropinProducts: () => ({ data: [] }),
  useDeleteWod: () => ({}),
  useGymCoaches: () => ({ data: [] }),
  useGymClasses: () => ({ data: [] }),
  useGymConfig: () => ({ data: {} }),
  useGymPastClasses: () => ({ data: [] }),
  useMaterializeSchedules: () => ({}),
  useMemberships: () => ({ data: [] }),
  useSchedules: () => ({ data: [] }),
  useServiceTypes: () => ({ data: [] }),
  useUpdateClass: () => ({}),
  useUpdateDropinProduct: () => ({}),
  useUpdateGymConfig: () => ({}),
  useUpdateSchedule: () => ({}),
  useUpdateServiceType: () => ({}),
  useUploadServiceTypePhoto: () => ({}),
  useUpdateWod: () => ({}),
  useWodBoard: () => ({ data: [] }),
  useWods: () => ({ data: [] }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (n: { color?: string; message?: string }) => avisos.show.push(n) },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { RecepcionBuscador } from "./ClassesPage";

interface FichaOver {
  id?: string;
  name?: string;
  relationLabel?: string;
  isMember?: boolean;
  reservo?: boolean;
  yaPresente?: boolean;
  puedeEntrar?: boolean;
  motivo?: string;
  vendePase?: boolean;
}

function ficha(over: FichaOver = {}) {
  const {
    id = "at-1",
    name = "Ana López",
    relationLabel = "socia al día",
    isMember = true,
    reservo = true,
    yaPresente = false,
    puedeEntrar = true,
    motivo = "",
    vendePase = false,
  } = over;
  return {
    athlete: { id, name, photo: null },
    relationship: {
      kind: isMember ? "member" : "visitor",
      label: relationLabel,
      is_member: isMember,
      membership_id: isMember ? "mb-1" : null,
      status: null,
      status_label: null,
      plan_name: null,
      payment_status: null,
      renewal_date: null,
      since: null,
    },
    dropin: null,
    gym_class: {
      id: "class-9",
      class_type: "CrossFit",
      starts_at: "2026-08-10T12:00:00Z",
      duration_min: 60,
      coach_name: null,
      checkin_window_open: true,
      reserved_by_athlete: reservo,
      already_checked_in: yaPresente,
    },
    actions: [
      {
        action: "class_checkin",
        label: "Marcar asistencia",
        via: "admit",
        enabled: puedeEntrar,
        reason: puedeEntrar ? "" : "membership_overdue",
        reason_message: motivo,
        gym_class_id: "class-9",
        dropin_purchase_id: null,
      },
      ...(vendePase
        ? [
            {
              action: "sell_dropin",
              label: "Vender pase",
              via: "client",
              enabled: true,
              reason: "",
              reason_message: "",
              gym_class_id: null,
              dropin_purchase_id: null,
            },
          ]
        : []),
    ],
    phone_hint: "••••0151",
  };
}

function pintar() {
  return render(
    <MantineProvider>
      <RecepcionBuscador gymId="gym-1" classId="class-9" />
    </MantineProvider>,
  );
}

function buscar(texto: string) {
  fireEvent.change(screen.getByLabelText(/Buscar a quien llegó/), { target: { value: texto } });
}

beforeEach(() => {
  estado.resultados = [];
  estado.buscado = [];
  estado.admitido = [];
  estado.errorAlAdmitir = null;
  avisos.show = [];
});

describe("recepción · buscar y marcar presente", () => {
  it("dice si la persona ya reservó esta clase y si ya está marcada", () => {
    estado.resultados = [ficha({ reservo: true, yaPresente: true })];
    pintar();
    buscar("ana");

    expect(screen.getByText("Reservó")).toBeTruthy();
    expect(screen.getByText("Ya presente")).toBeTruthy();
    // Ya está adentro: el botón no invita a gastarle otra entrada.
    const boton = screen.getByRole("button", { name: "Presente" }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });

  it("el visitante con pase aparece, aunque no esté en el padrón", () => {
    estado.resultados = [
      ficha({ id: "at-9", name: "Vis Itante", isMember: false, relationLabel: "visitante con pase" }),
    ];
    pintar();
    buscar("vis");

    expect(screen.getByText("Vis Itante")).toBeTruthy();
    expect(screen.getByText("visitante con pase")).toBeTruthy();
  });

  it("cuando el backend no lo deja entrar, se muestra SU motivo y el botón no se puede apretar", () => {
    estado.resultados = [
      ficha({ puedeEntrar: false, motivo: "Tiene la cuota vencida.", vendePase: true }),
    ];
    pintar();
    buscar("ana");

    expect(screen.getByText("Tiene la cuota vencida.")).toBeTruthy();
    expect(screen.getByText("Requiere pase")).toBeTruthy();
    const boton = screen.getByRole("button", { name: "Marcar presente" }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(estado.admitido).toHaveLength(0);
  });

  it("marcar presente manda el atleta (la credencial la decide el backend)", async () => {
    estado.resultados = [ficha()];
    pintar();
    buscar("ana");

    fireEvent.click(screen.getByRole("button", { name: "Marcar presente" }));

    await waitFor(() => expect(estado.admitido).toEqual([{ athleteId: "at-1" }]));
    expect(avisos.show.at(-1)?.color).toBe("teal");
  });

  it("marcar dos veces al mismo NO se pinta como error: la persona está adentro", async () => {
    estado.resultados = [ficha()];
    estado.errorAlAdmitir = {
      response: { data: { code: "checkin_duplicate", detail: "Ya tiene check-in en esta clase." } },
    };
    pintar();
    buscar("ana");

    fireEvent.click(screen.getByRole("button", { name: "Marcar presente" }));

    await waitFor(() => expect(avisos.show.length).toBeGreaterThan(0));
    expect(avisos.show.at(-1)?.color).toBe("teal");
    expect(avisos.show.at(-1)?.message).toMatch(/ya estaba marcado/i);
  });

  it("la búsqueda va acotada a la clase que se está pasando", () => {
    estado.resultados = [];
    pintar();
    buscar("ana");

    expect(estado.buscado.at(-1)).toEqual({ texto: "ana", classId: "class-9" });
  });
});
