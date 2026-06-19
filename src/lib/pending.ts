import type { PendingSummary } from "../api/types";

export type PendingKey = Exclude<keyof PendingSummary, "total">;

/**
 * Pendientes accionables del panel admin. Cada uno enlaza a la página donde se
 * resuelve y se muestra en: la campana de notificaciones, el badge del menú
 * lateral y el panel de pendientes del dashboard. El orden es de más a menos
 * urgente. Mantener sincronizado con `PendingSummary` (backend resumen_pendientes).
 */
export const PENDING_ITEMS: { key: PendingKey; label: string; to: string }[] = [
  { key: "solicitudes", label: "Solicitudes por revisar", to: "/panel/solicitudes" },
  { key: "coaches", label: "Coaches por aprobar", to: "/panel/coaches" },
  { key: "posts", label: "Posts en moderación", to: "/panel/comunidad" },
  { key: "clases_sin_wod", label: "Clases sin rutina (próx. 48h)", to: "/panel/clases" },
  { key: "tickets", label: "Reportes abiertos", to: "/panel/tickets" },
  { key: "pedidos", label: "Pedidos por entregar", to: "/panel/inventario" },
  { key: "clubes", label: "Clubes por aprobar", to: "/panel/clubes" },
  { key: "morosos", label: "Atletas morosos", to: "/panel/atletas" },
];

/** Ruta del nav -> contador que se muestra como badge a su derecha. */
export const NAV_BADGE: Record<string, PendingKey> = Object.fromEntries(
  PENDING_ITEMS.map((i) => [i.to, i.key]),
);
