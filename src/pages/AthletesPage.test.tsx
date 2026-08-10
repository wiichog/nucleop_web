// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

/**
 * Las dos reglas del padrón que, si se equivocan, hacen que el panel le mienta al
 * gimnasio en una conversación difícil.
 *
 * Van sueltas (no a través de la pantalla) porque viven en la ficha del atleta, a
 * la que sólo se llega por una celda de `mantine-datatable`, y esas no se pintan
 * bajo jsdom.
 */

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ primaryGymId: "gym-1", isSuperuser: false }),
}));

import { efectoDeAsignarPlan, ultimoBloqueo } from "./AthletesPage";

describe("qué pasa al asignarle plan a alguien que YA está adentro", () => {
  it("a un socio activo sólo le cambia el plan y la cuota", () => {
    // El caso que motivó todo esto: subirle la cuota a un socio a mitad de ciclo
    // sin moverle el vencimiento ni cobrarle de nuevo.
    expect(efectoDeAsignarPlan("active")).toBe("solo_plan");
    expect(efectoDeAsignarPlan("drop_in")).toBe("solo_plan");
  });

  it("a una relación que aún no está activa, la ACTIVA (y hay que avisarlo)", () => {
    // `approved_no_plan`, `trial` y `expired` entran a ACTIVE con vencimiento
    // nuevo desde hoy. Callarlo sería regalar un mes sin que nadie lo decida.
    for (const estado of ["approved_no_plan", "trial", "expired", "pending_approval"]) {
      expect(efectoDeAsignarPlan(estado)).toBe("activa");
    }
  });

  it("a una congelada, además le come los días guardados", () => {
    // Es el aviso más importante: "Reanudar" devuelve los días de la pausa y
    // asignar plan NO. Sin la advertencia, un clic de más le cuesta al atleta
    // exactamente lo que estaba protegiendo.
    expect(efectoDeAsignarPlan("paused")).toBe("activa_y_descongela");
  });

  it("no se ofrece donde no corresponde (bloqueada, baja, solicitud)", () => {
    for (const estado of [
      "blocked",
      "former_member",
      "rejected",
      "requested",
      "invited",
      "pending_leave",
    ]) {
      expect(efectoDeAsignarPlan(estado)).toBe("cerrado");
    }
  });

  it("un estado desconocido se trata como el caso peligroso, no como el inocuo", () => {
    // Si el backend agrega un estado, el panel prefiere advertir de más antes que
    // prometer que "no pasa nada" y activar una membresía a espaldas del gym.
    expect(efectoDeAsignarPlan(undefined)).toBe("activa");
    expect(efectoDeAsignarPlan("estado_que_no_existe")).toBe("activa");
  });
});

describe("motivo del bloqueo vigente", () => {
  const fila = (to_status: string, changed_at: string, comment: string) => ({
    from_status: "active",
    to_status,
    changed_at,
    comment,
  });

  it("toma la sanción MÁS RECIENTE, no la primera del historial", () => {
    // A un socio se le puede haber bloqueado antes por otra cosa; mostrar el
    // motivo viejo le pone al gimnasio una razón equivocada en la boca.
    const historial = [
      fila("blocked", "2025-01-10T10:00:00Z", "Acceso bloqueado. Motivo: pelea en el box."),
      fila("active", "2025-02-01T10:00:00Z", "Bloqueo levantado."),
      fila("blocked", "2026-08-01T10:00:00Z", "Acceso bloqueado. Motivo: cuota impaga acordada."),
    ];
    expect(ultimoBloqueo(historial)?.comment).toContain("cuota impaga acordada");
  });

  it("ignora las filas que no son un bloqueo", () => {
    const historial = [fila("paused", "2026-08-02T10:00:00Z", "Congelada por viaje.")];
    expect(ultimoBloqueo(historial)).toBeUndefined();
  });

  it("sin historial no revienta (la ficha puede llegar sin él)", () => {
    expect(ultimoBloqueo(undefined)).toBeUndefined();
    expect(ultimoBloqueo([])).toBeUndefined();
  });

  it("no reordena el historial que recibe: es un registro append-only", () => {
    const historial = [
      fila("blocked", "2025-01-10T10:00:00Z", "viejo"),
      fila("blocked", "2026-08-01T10:00:00Z", "nuevo"),
    ];
    ultimoBloqueo(historial);
    expect(historial.map((h) => h.comment)).toEqual(["viejo", "nuevo"]);
  });
});
