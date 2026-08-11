import type { PendingSummary } from "../api/types";

export type PendingKey = Exclude<keyof PendingSummary, "total">;

/**
 * Pendientes accionables del panel admin. Cada uno enlaza a la página —y a la
 * PESTAÑA/FILTRO— donde se resuelve, y se muestra en: la campana de
 * notificaciones, el badge del menú lateral y el panel de pendientes del
 * dashboard. El orden es de más a menos urgente. Mantener sincronizado con
 * `PendingSummary` (backend `resumen_pendientes`).
 *
 * `to` puede llevar query string: "pedidos por entregar" no se resuelve en la
 * pantalla de inventario sino en su pestaña de pedidos, y una baja pedida por el
 * atleta se resuelve con el padrón filtrado. Enlazar a la pantalla "en general"
 * dejaba al admin buscando dónde estaba el pendiente que acababa de tocar.
 */
export const PENDING_ITEMS: { key: PendingKey; label: string; to: string }[] = [
  { key: "solicitudes", label: "Solicitudes por revisar", to: "/panel/solicitudes" },
  { key: "coaches", label: "Coaches por aprobar", to: "/panel/coaches" },
  // Un coach pidió una clase concreta sin asignar: pedir NO asigna nada, así que
  // si el gym no responde la clase se queda sin coach. Va a su pestaña, no al
  // calendario "en general": lo que se decide es quién da esa franja.
  {
    key: "solicitudes_clase",
    label: "Coaches que piden clase",
    to: "/panel/clases?tab=requests",
  },
  { key: "posts", label: "Posts en moderación", to: "/panel/comunidad" },
  // Un comentario reportado ya está OCULTO del feed: si no aparece aquí, nadie se
  // entera de que hay algo esperando revisión salvo que entre a Comunidad.
  { key: "comentarios", label: "Comentarios reportados", to: "/panel/comunidad" },
  // Debido proceso: un descargo sin revisar deja al atleta sancionado sin
  // respuesta, y si el gym no contesta la apelación escala a Nucleo.
  { key: "apelaciones", label: "Apelaciones por revisar", to: "/panel/comunidad" },
  { key: "clases_sin_wod", label: "Clases sin rutina (próx. 48h)", to: "/panel/clases" },
  { key: "tickets", label: "Reportes abiertos", to: "/panel/tickets" },
  { key: "pedidos", label: "Pedidos por entregar", to: "/panel/inventario?tab=pedidos" },
  { key: "clubes", label: "Clubes por aprobar", to: "/panel/clubes" },
  // Baja que pidió el ATLETA: suma a `total` en el backend, así que si no se
  // listaba aquí la campana marcaba pendientes y el desplegable decía "todo al
  // día" — y el gym nunca se enteraba de que alguien pidió irse.
  { key: "bajas", label: "Bajas por confirmar", to: "/panel/atletas?filtro=bajas" },
  { key: "morosos", label: "Atletas morosos", to: "/panel/atletas?filtro=morosos" },
];

/**
 * Ruta base del nav -> contadores que se suman en el badge de su derecha. Varios
 * pendientes pueden caer en la misma pantalla (morosos y bajas viven los dos en
 * Atletas): con un solo contador por ruta, el último ganaba y el badge del menú
 * mentía.
 */
export const NAV_BADGE_KEYS: Record<string, PendingKey[]> = PENDING_ITEMS.reduce(
  (acc, item) => {
    const base = item.to.split("?")[0];
    (acc[base] ??= []).push(item.key);
    return acc;
  },
  {} as Record<string, PendingKey[]>,
);

/** Suma los pendientes que se muestran en el badge de una ruta del nav. */
export function navBadgeCount(
  to: string,
  counts: PendingSummary | undefined,
): number {
  if (!counts) return 0;
  return (NAV_BADGE_KEYS[to] ?? []).reduce((acc, key) => acc + (counts[key] ?? 0), 0);
}
