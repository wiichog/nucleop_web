import { describe, expect, it } from "vitest";
import {
  CLASS_STATUS,
  CLUB_ENTRY_STATUS,
  CLUB_RSVP_STATUS,
  CLUB_SUBMISSION_SOURCE,
  MEMBERSHIP_STATUS,
  label,
} from "./labels";

describe("label", () => {
  it("traduce un valor conocido del mapa", () => {
    expect(label(MEMBERSHIP_STATUS, "active")).toBe(MEMBERSHIP_STATUS.active);
    expect(label(CLASS_STATUS, "scheduled")).toBe(CLASS_STATUS.scheduled);
  });

  it("devuelve '—' para null/undefined/vacío", () => {
    expect(label(MEMBERSHIP_STATUS, null)).toBe("—");
    expect(label(MEMBERSHIP_STATUS, undefined)).toBe("—");
    expect(label(MEMBERSHIP_STATUS, "")).toBe("—");
  });

  it("hace fallback al valor crudo si no está en el mapa", () => {
    expect(label(MEMBERSHIP_STATUS, "desconocido")).toBe("desconocido");
  });
});

describe("estados del club", () => {
  it("traduce RSVP, origen del avance y estado en el reto", () => {
    expect(label(CLUB_RSVP_STATUS, "going")).toBe("Va a asistir");
    expect(label(CLUB_RSVP_STATUS, "attended")).toBe("Asistió");
    expect(label(CLUB_RSVP_STATUS, "cancelled")).toBe("Canceló");
    expect(label(CLUB_SUBMISSION_SOURCE, "self_report")).toBe("Autodeclarado");
    expect(label(CLUB_SUBMISSION_SOURCE, "activity_attendance")).toBe("Asistencia validada");
    expect(label(CLUB_ENTRY_STATUS, "active")).toBe("En curso");
    expect(label(CLUB_ENTRY_STATUS, "pending_review")).toBe("En revisión");
    expect(label(CLUB_ENTRY_STATUS, "completed")).toBe("Completado");
  });
});
