/**
 * El título que se le pone solo a un workout (Vertikal, ronda 6):
 * «[Programa] - [Día], [Número] [Mes]», p. ej. «CrossFit - Lun, 16 Nov». Sin
 * programa (workout General) va solo la fecha: «Lun, 16 Nov».
 *
 * Espejo exacto de `nucleo-api/apps/classes/services.py:titulo_automatico_wod`
 * (no hay endpoint del título: la regla es determinista). El backend expone el
 * suyo como `Wod.titulo_automatico`; «editado a mano» = `title !== titulo_automatico`.
 */

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * `fecha` en ISO (`YYYY-MM-DD`, la del workout). Se lee como fecha de calendario,
 * sin zona horaria: «2026-11-16» es lunes en cualquier navegador. Una fecha
 * ilegible devuelve "" (el backend pone el suyo al guardar).
 */
export function tituloAutomaticoWod(fecha: string, programa?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? "");
  if (!m) return "";
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return "";
  // getUTCDay: 0 = domingo; la lista empieza en lunes (como `weekday()` de Python).
  const diaSemana = DIAS[(d.getUTCDay() + 6) % 7];
  const texto = `${diaSemana}, ${dia} ${MESES[mes - 1]}`;
  const nombre = (programa ?? "").trim();
  return nombre ? `${nombre} - ${texto}` : texto;
}

/**
 * ¿El título sigue siendo el automático? Así decide el formulario si lo recalcula
 * al cambiar fecha o programa. Un WOD sin `titulo_automatico` (backend viejo) se
 * trata como editado a mano: no se le toca el título.
 */
export function esTituloAutomatico(wod: { title: string; titulo_automatico?: string | null }): boolean {
  return !!wod.titulo_automatico && wod.title === wod.titulo_automatico;
}
