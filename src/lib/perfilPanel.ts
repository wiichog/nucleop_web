import type { Role } from "../api/hooks";

/**
 * Con qué perfil entra alguien al panel de UN gimnasio. Decide el menú y qué
 * rutas puede abrir. Es el espejo de los grupos del backend
 * (`apps/common/permissions.py`); la autoridad sigue siendo el backend, esto
 * solo evita enseñar pantallas que van a contestar 403.
 *
 * - `admin`: todo el panel.
 * - `recepcion` (rol `front_desk`, Vertikal 23-nov-2026): la puerta, pasar
 *   lista, el padrón con cuotas, solicitudes, cobros en mostrador y el POS.
 * - `coach`: las clases. El resto del panel es del admin (y el backend ya no le
 *   da ingresos, cobros ni la ficha con pagos del socio).
 * - `otro`: sin rol de gym en este gimnasio (admin de club, trainer): el panel
 *   se comporta como siempre.
 */
export type PerfilPanel = "admin" | "recepcion" | "coach" | "otro";

export function perfilEnGym(
  roles: Role[],
  isSuperuser: boolean,
  gymId: string | null | undefined,
): PerfilPanel {
  if (isSuperuser) return "admin";
  if (!gymId) return "otro";
  const mios = roles.filter((r) => r.gym_id === gymId);
  // Con varios roles en el mismo gym manda el más amplio.
  if (mios.some((r) => r.role === "gym_admin" || r.role === "superadmin")) return "admin";
  if (mios.some((r) => r.role === "front_desk")) return "recepcion";
  if (mios.some((r) => r.role === "coach")) return "coach";
  return "otro";
}

/** Rutas del panel por perfil. `null` = sin restricción (lo decide el backend). */
const RUTAS: Record<PerfilPanel, string[] | null> = {
  admin: null,
  otro: null,
  recepcion: [
    "/panel/recepcion",
    "/panel/atletas",
    "/panel/solicitudes",
    "/panel/pagos",
    "/panel/pos",
  ],
  coach: ["/panel/clases"],
};

/** Las que cualquiera con sesión puede abrir: su propia cuenta. */
const SIEMPRE = ["/panel/perfil"];

export function rutaPermitida(perfil: PerfilPanel, pathname: string): boolean {
  const rutas = RUTAS[perfil];
  if (rutas === null) return true;
  const ruta = pathname.replace(/\/+$/, "");
  return [...rutas, ...SIEMPRE].some((r) => ruta === r || ruta.startsWith(`${r}/`));
}

/** Adónde mandar a alguien que abrió una ruta que no es de su perfil. */
export function inicioDe(perfil: PerfilPanel): string {
  return RUTAS[perfil]?.[0] ?? "/panel";
}

/** ¿Ve la relación de DINERO del socio (cuota, mora)? Espejo de `ve_cuotas`. */
export function veCuotas(perfil: PerfilPanel): boolean {
  return perfil === "admin" || perfil === "recepcion";
}
