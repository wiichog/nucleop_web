import type { GymAdmin } from "../../api/types";

/**
 * Catálogos y reglas del contrato de un gimnasio con Nucleo. Viven aparte de la
 * página para que la lista, el alta y la ficha del gym hablen el mismo idioma
 * («Starter», «Activa») sin importarse entre sí.
 */

export const SAAS_PLANS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

export const ESTADOS_SUSCRIPCION = [
  { value: "active", label: "Activa" },
  { value: "paused", label: "Pausada" },
  { value: "cancelled", label: "Cancelada" },
];

/** Etiqueta en español de un valor de catálogo; la lista usa las mismas que el formulario. */
export function etiquetaDe(opciones: { value: string; label: string }[], valor?: string | null): string {
  if (!valor) return "—";
  return opciones.find((o) => o.value === valor)?.label ?? valor;
}

/**
 * El recargo se escribe en decimales (0.0300) y se lee en porcentaje (3.00 %).
 * Junto al campo se muestra la lectura para que un «3» (300 %) salte a la vista
 * antes de guardar. Vacío o no numérico = null.
 */
export function pctTexto(valor: string | null | undefined): string | null {
  if (valor == null || !String(valor).trim()) return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return `${(n * 100).toFixed(2)} %`;
}

/**
 * Un gimnasio operando sin suscripción no tiene cuota que cobrarle: es lo
 * pendiente de esta pantalla. Uno suspendido no cuenta (no opera).
 */
export function faltaSuscripcion(g: Pick<GymAdmin, "is_active" | "subscription">): boolean {
  return g.is_active !== false && !g.subscription;
}

/**
 * El servidor guarda la suscripción completa de una vez y exige el monto mensual:
 * sin «Suscripción mensual» no hay dónde guardar «Estado suscripción» ni «Próximo cobro».
 * Devuelve el motivo por el que no se puede guardar, o null si se puede. Se revisa
 * ANTES de mandar nada, para no avisar «Gimnasio actualizado.» con cambios perdidos.
 */
export function motivoSuscripcionSinMonto(opts: {
  monthlyPrice: string;
  teniaSuscripcion: boolean;
  status: string | null;
  nextBillingDate: Date | null;
}): string | null {
  if (opts.monthlyPrice.trim()) return null;
  if (opts.teniaSuscripcion) {
    return "«Suscripción mensual» no puede quedar vacía: este gimnasio ya tiene suscripción. Escribe el monto y vuelve a presionar «Guardar».";
  }
  if ((opts.status ?? "active") !== "active" || opts.nextBillingDate) {
    return "Para guardar «Estado suscripción» o «Próximo cobro» escribe primero el monto en «Suscripción mensual».";
  }
  return null;
}
