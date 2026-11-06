import type { Wod } from "../api/types";

/**
 * La semana de programación del panel: columnas de lunes a domingo, como la
 * escribe el box en su sistema de programación. Todo en fecha LOCAL (el box está
 * en Guatemala): `toISOString` daría el día siguiente a partir de las 18:00.
 */

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** «2026-11-05» en hora local. */
export function isoLocal(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

/** La fecha «2026-11-05» como medianoche local (no UTC). */
export function deIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** El lunes de la semana de `d` (la semana va de lunes a domingo). */
export function lunesDe(d: Date): Date {
  return sumarDias(d, -((d.getDay() + 6) % 7));
}

/** Los 7 días de la semana que empieza en `lunes`. */
export function diasDeSemana(lunes: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** «Lun 02»: el encabezado de la columna. */
export function etiquetaColumna(d: Date): string {
  return `${DIAS_CORTOS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/** «jueves 5 de noviembre». */
export function fechaLarga(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** «2 – 8 de noviembre de 2026», o «30 de noviembre – 6 de diciembre de 2026». */
export function rangoDeSemana(lunes: Date): string {
  const dom = sumarDias(lunes, 6);
  const fin = `${dom.getDate()} de ${MESES[dom.getMonth()]} de ${dom.getFullYear()}`;
  if (lunes.getMonth() === dom.getMonth()) return `${lunes.getDate()} – ${fin}`;
  const ini =
    lunes.getFullYear() === dom.getFullYear()
      ? `${lunes.getDate()} de ${MESES[lunes.getMonth()]}`
      : `${lunes.getDate()} de ${MESES[lunes.getMonth()]} de ${lunes.getFullYear()}`;
  return `${ini} – ${fin}`;
}

/**
 * El workout de un día para un programa. `programa` vacío = el «General» (sin
 * servicio): es un track propio, no «todos».
 */
export function wodDelDia(wods: Wod[], fecha: string, programa: string): Wod | undefined {
  return wods.find((w) => w.date === fecha && (w.service_type ?? "") === programa);
}
