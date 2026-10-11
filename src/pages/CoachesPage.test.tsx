// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Coach, CoachRequest } from "../api/types";

/**
 * Coaches: antes no había forma de deshacer un alta. «Activo/Inactivo» era solo
 * lectura y una invitación mandada no se podía retirar. Lo que se prueba es que
 * las dos salidas existen y que piden confirmación antes de tocar nada.
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
  solicitudes: [] as unknown[],
  coaches: [] as unknown[],
  decidir: vi.fn(),
  // Mutación en vuelo: { isPending, variables } para simular una fila guardándose.
  decidiendo: { isPending: false, variables: undefined as unknown },
  guardandoCoach: { isPending: false, variables: undefined as unknown },
}));

vi.mock("../api/hooks", () => {
  const consulta = (data: unknown) => ({ data, isLoading: false, isError: false, refetch: vi.fn() });
  const mutacion = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    useGymCoaches: () => consulta(estado.coaches),
    useCoachRequests: () => consulta(estado.solicitudes),
    useInviteCoach: () => mutacion(),
    useDecideCoachRequest: () => ({ ...mutacion(), ...estado.decidiendo, mutate: estado.decidir }),
    useUpdateCoach: () => ({ ...mutacion(), ...estado.guardandoCoach }),
    useDeactivateCoach: () => mutacion(),
  };
});

// `mantine-datatable` no pinta celdas bajo jsdom: una tabla mínima que llama al
// `render` de cada columna basta para probar lo que va dentro de la celda.
vi.mock("mantine-datatable", () => ({
  DataTable: ({
    records,
    columns,
  }: {
    records: Record<string, unknown>[];
    columns: { accessor: string; render?: (r: Record<string, unknown>) => React.ReactNode }[];
  }) => (
    <table>
      <tbody>
        {records.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.accessor}>{c.render ? c.render(r) : String(r[c.accessor] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1" }),
}));

import { CoachProfileSheet, CoachesPage } from "./CoachesPage";

const invitacion: CoachRequest = {
  id: "cr-1",
  gym: "gym-1",
  gym_name: "Box",
  user: "u-1",
  user_email: "coach@ejemplo.com",
  direction: "gym_invite",
  status: "pending",
  message: "",
  created_at: "2026-10-01T15:00:00Z",
};

const coach: Coach = {
  id: "sr-1",
  staff_role: "sr-1",
  name: "Coco Coach",
  email: "coco@ejemplo.com",
  photo: null,
  pay_type: "per_class",
  per_class_rate: "50.00",
  fixed_amount: "0.00",
  is_active: true,
  can_program_wods: true,
  offers_pt: false,
  pt_price: "0.00",
  pt_commission_pct: "0.0000",
  rating: null,
  rating_count: 0,
};

const pinta = (ui: React.ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

afterEach(() => {
  vi.restoreAllMocks();
  estado.decidir.mockReset();
  estado.solicitudes = [];
  estado.coaches = [];
  estado.decidiendo = { isPending: false, variables: undefined };
  estado.guardandoCoach = { isPending: false, variables: undefined };
});

describe("Cancelar invitación", () => {
  it("una invitación del gym se puede cancelar, previa confirmación", () => {
    estado.solicitudes = [invitacion];
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    pinta(<CoachesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar invitación" }));
    expect(confirmar).toHaveBeenCalled();
    expect(estado.decidir).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar invitación" }));
    expect(estado.decidir).toHaveBeenCalledWith(
      { requestId: "cr-1", action: "cancel" },
      expect.anything(),
    );
  });

  it("una solicitud del coach no se cancela: se aprueba o se rechaza", () => {
    estado.solicitudes = [{ ...invitacion, direction: "coach_apply" }];
    pinta(<CoachesPage />);
    expect(screen.queryByRole("button", { name: "Cancelar invitación" })).toBeNull();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeTruthy();
  });
});

describe("Dar de baja", () => {
  it("el perfil del coach ofrece «Dar de baja»", () => {
    const onDarDeBaja = vi.fn();
    pinta(<CoachProfileSheet coach={coach} onClose={() => {}} onDarDeBaja={onDarDeBaja} />);
    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));
    expect(onDarDeBaja).toHaveBeenCalledWith(coach);
  });
});

describe("Solo espera la fila que se está guardando", () => {
  const deshabilitado = (el: HTMLElement) => (el as HTMLButtonElement).disabled;

  it("aprobar una solicitud no bloquea las demás filas", () => {
    estado.solicitudes = [
      { ...invitacion, id: "cr-1", direction: "coach_apply" },
      { ...invitacion, id: "cr-2", user_email: "otro@ejemplo.com", direction: "coach_apply" },
    ];
    estado.decidiendo = { isPending: true, variables: { requestId: "cr-1", action: "approve" } };
    pinta(<CoachesPage />);

    const [aprobar1, aprobar2] = screen.getAllByRole("button", { name: "Aprobar" });
    const [rechazar1, rechazar2] = screen.getAllByRole("button", { name: "Rechazar" });
    expect(aprobar1.getAttribute("data-loading")).toBe("true");
    expect(rechazar1.getAttribute("data-loading")).toBeNull();
    expect(deshabilitado(rechazar1)).toBe(true);
    expect(deshabilitado(aprobar2)).toBe(false);
    expect(deshabilitado(rechazar2)).toBe(false);
  });

  it("guardar «Sube el workout» de un coach no apaga el de los demás", () => {
    estado.coaches = [coach, { ...coach, id: "sr-2", staff_role: "sr-2", name: "Otra Coach" }];
    estado.guardandoCoach = { isPending: true, variables: { staffId: "sr-1", body: {} } };
    pinta(<CoachesPage />);

    const uno = screen.getByLabelText(/Coco Coach suba/) as HTMLInputElement;
    const dos = screen.getByLabelText(/Otra Coach suba/) as HTMLInputElement;
    expect(uno.disabled).toBe(true);
    expect(dos.disabled).toBe(false);
  });
});
