import type { Membership } from "../../api/types";

/**
 * Reglas del padrón de Atletas que no dependen de la pantalla. Viven aparte para
 * probarlas sueltas y para que la ficha y la lista lean exactamente lo mismo.
 * La autoridad sigue siendo el backend: esto solo evita ofrecer un botón que el
 * servidor va a rechazar o callar una consecuencia que el operador debe ver.
 */

/** Orden por defecto del padrón: morosos arriba, luego por vencer, luego el resto. */
export const paymentPriority = (m: Membership) =>
  m.payment_status === "overdue" ? 0 : m.payment_status === "due_soon" ? 1 : 2;

/**
 * Estados de relación "viva" donde desligar pasa por el handoff de baja (la baja
 * queda pendiente hasta que el atleta la confirme). Para invitados/solicitudes la
 * baja se maneja en la bandeja de Solicitudes (rechazar), no aquí.
 */
export const LEAVE_ELIGIBLE = new Set([
  "active",
  "trial",
  "paused",
  "expired",
  "approved_no_plan",
  "drop_in",
]);

/**
 * Estados desde los que el backend acepta bloquear (`ESTADOS_BLOQUEABLES`): los
 * que tienen relación viva. Una solicitud o una invitación no se bloquean, se
 * rechazan en la bandeja de Solicitudes; y a un exmiembro no hay qué bloquearle.
 */
export const BLOQUEABLES = new Set(["active", "trial", "paused", "expired"]);

/**
 * Estados en los que asignar plan/cuota es SOLO eso. En cualquier otro de los
 * asignables (`approved_no_plan`, `trial`, `expired`, `paused`) el backend
 * además ACTIVA la membresía y le fija un vencimiento nuevo desde hoy.
 */
const PLAN_SIN_EFECTOS = new Set(["active", "drop_in"]);

/** Estados donde ni siquiera tiene sentido ofrecer el cambio de plan. */
const PLAN_NO_EDITABLE = new Set([
  "blocked",
  "former_member",
  "rejected",
  "requested",
  "invited",
  "pending_leave",
]);

/**
 * Qué le pasa REALMENTE a la relación si se guarda plan o cuota, según el estado
 * en que está. Espeja lo que hace `AssignPlanView` en el backend:
 *
 *  - `cerrado`  → ni se ofrece el formulario;
 *  - `solo_plan`→ cambia plan y cuota, y nada más (el vencimiento no se mueve);
 *  - `activa`   → además la ACTIVA y le fija vencimiento nuevo desde hoy;
 *  - `activa_y_descongela` → lo anterior Y se come el congelamiento: los días
 *    que el atleta tenía guardados se pierden, cosa que "Reanudar" sí respeta.
 */
export type EfectoDePlan = "cerrado" | "solo_plan" | "activa" | "activa_y_descongela";

export function efectoDeAsignarPlan(status?: string | null): EfectoDePlan {
  const estado = status ?? "";
  if (PLAN_NO_EDITABLE.has(estado)) return "cerrado";
  if (PLAN_SIN_EFECTOS.has(estado)) return "solo_plan";
  if (estado === "paused") return "activa_y_descongela";
  return "activa";
}

/**
 * A dónde mandar al operador cuando la relación está cerrada para "Plan y cuota".
 * Una baja pendiente, un exmiembro o un rechazado no están en la bandeja de
 * Solicitudes: mandarlo ahí era mandarlo a buscar a donde no había nada.
 */
export function dondeSeGestiona(status?: string | null): string {
  switch (status) {
    case "blocked":
      return "Levanta el bloqueo primero.";
    case "pending_leave":
      return "Respóndela en la pastilla «Bajas» de esta pantalla.";
    case "former_member":
    case "rejected":
      // Volver reabre esta misma relación: lo invita el gym o lo pide el atleta.
      return "Si quiere volver, invítalo desde «Solicitudes» con «Invitar atleta» o pídele que solicite entrar desde su app.";
    default:
      // `requested` / `invited`: esas sí viven en la bandeja.
      return "Gestiónala en la bandeja de Solicitudes.";
  }
}

/**
 * La sanción vigente dentro del historial de estados. El bloqueo no tiene campo
 * propio: su motivo viaja en el comentario de `MembershipStatusHistory`, que es
 * append-only. Hay que quedarse con la ENTRADA MÁS RECIENTE a "blocked": mostrar
 * un motivo viejo le pondría al gimnasio una razón equivocada en la boca.
 */
export function ultimoBloqueo<T extends { to_status: string; changed_at: string }>(
  historial: T[] | undefined,
): T | undefined {
  return [...(historial ?? [])]
    .filter((h) => h.to_status === "blocked")
    .sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1))[0];
}

/** Valor del grupo para quien no tiene servicio (mismo que `?service_type=none` del backend). */
export const SIN_SERVICIO = "none";

export function estaEnServicio(m: Membership, servicio: string) {
  const servicios = m.plan_services ?? [];
  return servicio === SIN_SERVICIO ? servicios.length === 0 : servicios.some((s) => s.id === servicio);
}

/** Grupos por servicio del plan, de más a menos, con "Sin servicio" al final. */
export function agruparPorServicio(filas: Membership[]) {
  const grupos = new Map<string, { value: string; label: string; count: number }>();
  let sinServicio = 0;
  for (const m of filas) {
    const servicios = m.plan_services ?? [];
    if (servicios.length === 0) sinServicio += 1;
    for (const s of servicios) {
      const g = grupos.get(s.id) ?? { value: s.id, label: s.name, count: 0 };
      g.count += 1;
      grupos.set(s.id, g);
    }
  }
  const lista = [...grupos.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
  if (sinServicio) lista.push({ value: SIN_SERVICIO, label: "Sin servicio", count: sinServicio });
  return lista;
}

/**
 * Lo que el gym tiene que atender de esta persona: debe, se está enfriando o
 * pidió su baja. Es lo que pinta la fila en amarillo. `enRiesgo` llega de afuera
 * porque la lista de riesgo es otra consulta (y solo del admin).
 */
export function necesitaAtencion(m: Membership, enRiesgo: boolean): boolean {
  if (m.payment_status === "overdue") return true;
  if ((m.status as string) === "pending_leave" && m.leave_initiated_by === "athlete") return true;
  return enRiesgo;
}
