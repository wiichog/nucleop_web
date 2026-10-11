/**
 * Validación de un periodo «Desde» – «Hasta» elegido con dos DatePickerInput.
 *
 * Antes las pantallas mandaban la fecha borrada como texto vacío y un rango al
 * revés tal cual: el servidor respondía un error genérico (o el reporte se
 * quedaba vacío) sin decir por qué. Ahora la pantalla no consulta y muestra el
 * motivo. Un periodo de un solo día (Desde = Hasta) es válido.
 */

/** Fecha local como `YYYY-MM-DD` (lo que espera la API); vacío si no hay fecha. */
export const fechaIso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : "");

export type MotivoPeriodo = { desde?: string; hasta?: string; mensaje: string };

/** Devuelve por qué el periodo no sirve, o `null` si se puede consultar. */
export function motivoPeriodoInvalido(desde: Date | null, hasta: Date | null): MotivoPeriodo | null {
  if (!desde || !hasta) {
    return {
      desde: desde ? undefined : "Elige una fecha",
      hasta: hasta ? undefined : "Elige una fecha",
      mensaje: "Elige la fecha «Desde» y la fecha «Hasta».",
    };
  }
  // Se compara el día, no la hora: el selector puede traer horas distintas.
  if (fechaIso(desde) > fechaIso(hasta)) {
    return {
      desde: "Debe ser antes de «Hasta»",
      mensaje: "La fecha «Desde» no puede ser posterior a la fecha «Hasta».",
    };
  }
  return null;
}
