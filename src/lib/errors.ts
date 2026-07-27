/**
 * Lectura del contrato de error de la API: `{ detail, code, message }`
 * (apps/common/exceptions). El backend ya traduce los rechazos de Pagalo a
 * mensajes amables en `detail`; el panel los tiraba a la basura y mostraba un
 * texto genérico, así que el gym nunca sabía POR QUÉ falló un cobro.
 */
export function errMsg(error: unknown, porDefecto = "Algo salió mal. Intenta de nuevo."): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) return data;
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    for (const key of ["detail", "message", "error"]) {
      const value = body[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    // Errores de validación de DRF: { campo: ["mensaje", ...] }.
    for (const value of Object.values(body)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) return value[0];
    }
  }
  return porDefecto;
}
