import { describe, expect, it } from "vitest";
import type { PendingSummary } from "../api/types";
import { PENDING_ITEMS, navBadgeCount } from "./pending";

/** Resumen de ejemplo con un pendiente de cada tipo que suma a `total`. */
const resumen: PendingSummary = {
  solicitudes: 1,
  coaches: 0,
  posts: 2,
  comentarios: 5,
  tickets: 0,
  clases_sin_wod: 0,
  pedidos: 2,
  clubes: 0,
  bajas: 3,
  morosos: 4,
  total: 17,
};

describe("PENDING_ITEMS", () => {
  it("lista TODOS los pendientes que el backend suma a `total`", () => {
    // Si un pendiente suma al badge pero no está aquí, la campana marca un
    // número y el desplegable dice "todo al día".
    const listados = PENDING_ITEMS.map((i) => i.key);
    for (const key of ["solicitudes", "coaches", "solicitudes_clase", "posts", "tickets", "clases_sin_wod", "pedidos", "clubes", "bajas", "morosos", "comentarios", "apelaciones", "denuncias_club"]) {
      expect(listados).toContain(key);
    }
  });

  it("enlaza el pendiente a la pestaña/filtro donde se resuelve", () => {
    const pedidos = PENDING_ITEMS.find((i) => i.key === "pedidos");
    expect(pedidos?.to).toBe("/panel/inventario?tab=pedidos");
    const bajas = PENDING_ITEMS.find((i) => i.key === "bajas");
    expect(bajas?.to).toBe("/panel/atletas?filtro=bajas");
    // La postulación se decide viendo la franja: su pestaña, no el calendario.
    const clase = PENDING_ITEMS.find((i) => i.key === "solicitudes_clase");
    expect(clase?.to).toBe("/panel/clases?tab=requests");
    // Los morosos se cobran en Membresías ("Por cobrar"), no en el padrón.
    expect(PENDING_ITEMS.find((i) => i.key === "morosos")?.to).toBe("/panel/pagos");
    expect(PENDING_ITEMS.find((i) => i.key === "clases_sin_wod")?.to).toBe("/panel/clases?tab=wod");
  });
});

describe("navBadgeCount", () => {
  it("suma los pendientes que caen en la misma pantalla", () => {
    // Comunidad recibe posts (2) + comentarios (5): con un solo contador por ruta
    // el badge del menú mostraba únicamente uno de los dos.
    expect(navBadgeCount("/panel/comunidad", resumen)).toBe(7);
    expect(navBadgeCount("/panel/atletas", resumen)).toBe(3);
    expect(navBadgeCount("/panel/pagos", resumen)).toBe(4);
  });

  it("usa la ruta BASE aunque el pendiente enlace con query string", () => {
    expect(navBadgeCount("/panel/inventario", resumen)).toBe(2);
  });

  it("es 0 sin resumen o para una ruta sin pendientes", () => {
    expect(navBadgeCount("/panel/atletas", undefined)).toBe(0);
    expect(navBadgeCount("/panel/reportes", resumen)).toBe(0);
  });
});
