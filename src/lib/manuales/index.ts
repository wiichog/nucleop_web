import type { Manual, ManualesPorRuta } from "./tipos";
import { manualesOperacion } from "./operacion";

export type { Manual } from "./tipos";

/** Un archivo por grupo del menú; aquí se juntan todos. */
export const MANUALES: ManualesPorRuta = {
  ...manualesOperacion,
};

/**
 * Rutas que sólo valen idénticas. `/panel` es el Dashboard: sin esto su manual
 * se mostraría en cualquier pantalla del panel que todavía no tenga el suyo.
 */
const SOLO_EXACTA = new Set(["/panel"]);

/**
 * El manual de la pantalla en `pathname`: la llave más larga que sea la ruta
 * misma o un prefijo de ella seguido de `/`. Así las subpantallas (detalle,
 * edición) muestran el manual de su listado.
 */
export function manualDeRuta(pathname: string): Manual | null {
  const ruta = pathname.replace(/\/+$/, "") || "/";
  let mejor: string | null = null;
  for (const llave of Object.keys(MANUALES)) {
    const coincide =
      ruta === llave || (!SOLO_EXACTA.has(llave) && ruta.startsWith(`${llave}/`));
    if (coincide && (!mejor || llave.length > mejor.length)) mejor = llave;
  }
  return mejor ? MANUALES[mejor] : null;
}
