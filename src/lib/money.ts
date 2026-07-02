// Formateo de moneda GTQ en un solo lugar. La app mostraba `Q${amount}` crudo
// (sin separador de miles, sin dígitos alineados). Aquí se centraliza el formato
// con la localización de Guatemala: símbolo "Q", coma de miles, punto decimal.

const nf = (decimals: number) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Convierte a número tolerando strings del API ("1234.00") y nulos. */
export function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
}

/**
 * Formatea un monto en Quetzales. Por defecto: 0 decimales si es entero, 2 si no.
 * Pasa `decimals` para forzar (p. ej. 2 en columnas de pagos para un ritmo parejo).
 */
export function fmtQ(
  value: number | string | null | undefined,
  opts?: { decimals?: number },
): string {
  const num = toNumber(value);
  const decimals = opts?.decimals ?? (Number.isInteger(num) ? 0 : 2);
  return nf(decimals).format(num);
}
