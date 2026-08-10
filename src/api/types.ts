import type { components } from "./schema";

// Campos nuevos del backend aún no regenerados en schema.d.ts (correr `npm run gen:api`
// con el backend arriba los incorpora; mientras tanto se intersectan aquí).
export type Membership = components["schemas"]["MembershipAdmin"] & {
  plan_name?: string | null;
  athlete_photo?: string | null;
  days_to_due?: number | null;
  leave_initiated_by?: string;
  // Pausa / congelamiento (viaje, lesión). `paused_at` es el ancla del corrimiento
  // del vencimiento al reanudar; `pause_reason` es nota INTERNA del gym: no viaja
  // al atleta (mismo criterio que `internal_notes`).
  paused_at?: string | null;
  pause_reason?: string;
  pause_until?: string | null;
};
type AthleteProfileExtra = {
  full_name?: string;
  birth_date?: string | null;
  emergency_contact?: Record<string, unknown> | null;
  photo?: string | null;
};
export type MembershipDetail = Omit<
  components["schemas"]["MembershipDetailAdmin"],
  "athlete_profile"
> &
  Membership & {
    athlete_profile: components["schemas"]["MembershipDetailAdmin"]["athlete_profile"] &
      AthleteProfileExtra;
  };
export type PaymentAttempt = {
  id: string;
  attempt_number: number;
  status: string;
  gateway_code: string;
  message: string;
  created_at: string;
};
/**
 * Pago del panel (`PaymentSerializer`). Campos que el backend YA manda y el schema
 * generado todavía no declara (correr `npm run gen:api` con la API arriba los
 * incorpora); se intersectan aquí mientras tanto.
 *
 * Ojo con la aritmética del recargo: `amount` es la BASE (el ingreso del gym) y
 * `surcharge` (= `platform_commission`) el recargo de Nucleo SUMADO encima, así
 * que lo que se le cobró a la tarjeta es `total_charged`, no `amount`. Sumar
 * `amount` para "lo cobrado" subestima el cargo real del atleta.
 */
export type Payment = components["schemas"]["Payment"] & {
  /** Alias de `platform_commission`: el recargo de Nucleo (0 si no fue tarjeta). */
  surcharge?: string;
  /** `amount` + `surcharge`: lo que efectivamente pasó por la pasarela. */
  total_charged?: string;
  /** De quién es el pago (el panel lista los de todos sus atletas). */
  athlete_name?: string;
  gym_name?: string;
  failure_code?: string | null;
  failure_message?: string | null;
  attempts_count?: number;
  last_attempt_at?: string | null;
  can_retry?: boolean;
  attempts?: PaymentAttempt[];
};
export type Plan = components["schemas"]["Plan"] & {
  // Servicios del catálogo incluidos en la suscripción (aún no en el schema generado).
  service_types?: string[];
  service_type_names?: string[];
};
export type JoinRequest = components["schemas"]["JoinRequest"];
export type GymClass = components["schemas"]["GymClass"];
export type GymCheckin = components["schemas"]["GymCheckin"];
/**
 * Fila de la bitácora (`GET /gym/{id}/audit`). El backend ya la manda LEGIBLE:
 * `descripcion` es la frase en español de la acción (la misma que sale en la
 * columna «descripción» del CSV) y `actor_rol` el rol traducido —"Sistema/atleta"
 * cuando no hubo un rol de staff detrás—. Ninguno de los dos está todavía en el
 * schema generado (`npm run gen:api`), por eso la intersección.
 *
 * Ojo: `actor_id`/`actor_role` los declara el schema viejo pero el serializer YA
 * NO los envía; se leen de `actor_rol`, no de ellos.
 */
export type AuditLog = components["schemas"]["AuditLog"] & {
  descripcion: string;
  actor_rol: string;
  /**
   * LEGADO: el schema regenerado ya no lo declara porque el serializer dejó de
   * enviarlo. Se conserva opcional sólo para que el fallback de `AuditPage` siga
   * compilando; nunca llega con valor. Al limpiar ese fallback, borrar esto.
   */
  actor_role?: string;
};
export type GymAdmin = components["schemas"]["GymAdmin"] & {
  allow_future_reservations?: boolean;
  /**
   * Días sin asistir a ESTE gym para marcar al atleta "en riesgo" (1..365, def. 10).
   * Editable por gym_admin. Aún no en el schema generado (`npm run gen:api`).
   */
  risk_inactivity_days?: number;
  /**
   * Días de mora que ESTE gimnasio tolera antes del corte automático (1..365,
   * def. 30). Es política de COBRO del gym (no de plataforma), así que la editan
   * `gym_admin` y superadmin desde el panel. Nunca sale en la ficha pública del
   * gimnasio (hay test de no-fuga en el backend). Aún no en el schema generado.
   */
  overdue_grace_days?: number;
  is_active?: boolean;
};

// --- Alta y administración de gimnasios (plataforma) ---------------------------
// Vivían dentro de `pages/PlatformGymsPage.tsx`; el contrato de una ruta no puede
// vivir en una pantalla (nadie más lo encuentra y se reescribe a mano en la
// siguiente). Aquí está la única definición.

/** Cuerpo del alta COMPLETA: gym + suscripción SaaS + plan vendible + admin. */
export interface AltaGimnasio {
  name: string;
  location_text?: string;
  address?: string;
  is_public?: boolean;
  saas_plan?: string;
  /** Cuota mensual que el gym le paga a Nucleo. */
  monthly_price?: string;
  /** Recargo de Nucleo en tarjeta (0.03 = 3%). Vacío = tasa por defecto. */
  commission_pct?: string | null;
  plan_name?: string;
  /** Precio del plan VENDIBLE que se crea para el gym. */
  plan_price?: string;
  admin_email?: string;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_phone?: string;
}

/**
 * Respuesta del alta: el gym (misma forma que `GymAdmin`) + qué se creó a su
 * alrededor, para no tener que pedirlo con una segunda llamada.
 */
export type GymCreado = GymAdmin & {
  admin_email: string;
  admin_created: boolean;
  plan_id: string;
  subscription_id: string;
};

/** Administrador (`gym_admin`) del gimnasio, como lo lista la plataforma. */
export interface GymStaffAdmin {
  id: string;
  user_id: string;
  email: string;
  phone: string | null;
  name: string;
  is_active: boolean;
  granted_at: string;
  /** `true` si ya puso su contraseña y puede entrar al panel. */
  claimed: boolean;
}

export type DropinType =
  | "one_class"
  | "day"
  | "week"
  | "open_gym"
  | "special"
  | "free_trial";

// Pase drop-in que ofrece el gym (gestionado desde su panel). Aún no en el schema
// generado; tipado a mano hasta el próximo `npm run gen:api`.
export interface DropinProduct {
  id: string;
  gym: string;
  type: DropinType;
  type_label?: string;
  name?: string;
  description?: string;
  price: string;
  is_active: boolean;
}

export interface Paginated<T> {
  results: T[];
  next: string | null;
  previous: string | null;
}

export function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export interface FeedItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  gym_id: string | null;
  gym_name: string | null;
  club_name: string | null;
  actor_name: string;
  created_at: string;
  reaction_count: number;
  reacted_by_me: boolean;
  reactions?: Record<string, number>;
  comment_count?: number;
  status?: string;
  photo_url?: string | null;
  media?: FeedMedia[];
}

export interface FeedMedia {
  url: string;
  kind: "image" | "video";
}

export interface ClubActivityAdmin {
  id: string;
  name: string;
  starts_at: string;
  location: string;
  /** Ruta/recorrido de la actividad (running, ciclismo…). */
  route?: string;
  is_free: boolean;
  capacity?: number | null;
  rsvp_count?: number;
  my_rsvp?: boolean;
  created_at?: string;
}

/**
 * Última revisión del atleta en el reto. `note` nunca viene vacío cuando
 * `status === "rejected"`: el atleta tiene que poder leer por qué se lo rechazaron.
 */
export interface ClubChallengeReview {
  submission_id: string;
  status: "approved" | "rejected" | "pending";
  delta: string;
  note: string;
  reviewed_at: string;
}

export interface ClubChallenge {
  id: string;
  name: string;
  description: string;
  metric: string;
  target_value: string;
  starts_at: string;
  ends_at: string;
  points_reward: number;
  participant_count?: number;
  is_active?: boolean;
  /** Solo llega con contexto de atleta; en el panel del club es `null`. */
  my_last_review?: ClubChallengeReview | null;
  created_at?: string;
}

/**
 * Envío de progreso de un reto a revisión. El motivo de la decisión viaja en
 * `review_note` y el sello en `reviewed_at` (ola 2/3 de clubes: "el motivo llega
 * SIEMPRE"); sin tiparlos, la bandeja de revisión no podía mostrar por qué se
 * rechazó ni cuándo se resolvió.
 */
export interface ClubChallengeSubmission {
  id: string;
  challenge: string;
  athlete: string;
  athlete_name: string;
  delta: string;
  source: string;
  status: string;
  /** Actividad del club que respalda el envío (`null` si se subió a mano). */
  activity?: string | null;
  review_note?: string;
  reviewed_at?: string | null;
  created_at: string;
}

/** Fila del leaderboard = `ClubChallengeEntry` (la inscripción), no el envío. */
export interface ClubChallengeLeaderboardRow {
  id: string;
  athlete: string;
  athlete_name: string;
  progress: string;
  status: string;
  rank: number;
  joined_at?: string;
  completed_at?: string | null;
}

export interface ClubActivityRsvpRow {
  id: string;
  athlete: string;
  athlete_name: string;
  status: string;
  confirmed_at: string | null;
}

export interface AthleteOfMonth {
  id: string;
  athlete: string;
  athlete_name: string;
  athlete_photo: string | null;
  period: string;
  class_type: string;
  score: string;
  /** Imagen del anuncio (marco + foto del atleta) generada al publicar. */
  image: string | null;
  awarded_at: string;
}

export interface Dashboard {
  from: string;
  to: string;
  ingresos_tarjeta: string;
  ingresos_manual: string;
  ingresos_total: string;
  pagos: number;
  nuevos_atletas: number;
  checkins: number;
  atletas_activos: number;
  morosos: number;
  proximos_vencimientos: number;
  wods_publicados: number;
  resultados_wod: number;
  prs_nuevos: number;
  servicios_activos: number;
  clases_mas_demandadas: { class_type: string; horario: string; reservas: number }[];
}

/** Conteo de pendientes operativos del gym (badge de notificaciones del panel). */
export interface PendingSummary {
  solicitudes: number;
  coaches: number;
  posts: number;
  /**
   * Comentarios del feed ocultos por reporte (moderación reactiva), esperando
   * revisión del staff. Suma a `total`. Falta si el backend es viejo.
   */
  comentarios?: number;
  /**
   * Descargos de atletas contra una decisión de moderación de ESTE gym que
   * esperan su re-revisión (sólo `status=pending`; lo escalado a Nucleo ya no
   * espera al gym). Suma a `total`. Falta si el backend es viejo.
   */
  apelaciones?: number;
  tickets: number;
  clases_sin_wod: number;
  /** Clases de hoy sin coach (cobertura). Falta si el backend es viejo. */
  clases_sin_coach?: number;
  pedidos: number;
  clubes: number;
  /**
   * Bajas que pidió el ATLETA y el gimnasio todavía no confirma (`pending_leave`
   * con `leave_initiated_by = "athlete"`). Suma a `total`: es una decisión
   * pendiente del admin, no una watchlist. Las bajas que propuso el propio gym no
   * entran — ahí la pelota la tiene el atleta.
   */
  bajas?: number;
  morosos: number;
  /** Atletas en riesgo de abandono (usa `Gym.risk_inactivity_days`). */
  en_riesgo?: number;
  total: number;
}

// --- Cobranza: estado de cuenta gym ↔ Nucleo y depósitos (Payout) ---

/**
 * Depósito de Nucleo al gimnasio por un periodo. `amount` = neto a depositar; el
 * desglose queda CONGELADO al generarlo (no se recalcula al leerlo).
 */
export interface Payout {
  id: string;
  gym: string;
  gym_name: string;
  /** "YYYY-MM". */
  period: string;
  period_start: string | null;
  period_end: string | null;
  amount: string;
  gross_charged: string;
  platform_surcharge: string;
  refunds_total: string;
  payments_count: number;
  refunds_count: number;
  status: "pending" | "executed";
  reference: string;
  notes: string;
  executed_at: string | null;
  created_at: string;
}

/**
 * Estado de cuenta del gym con Nucleo en un periodo. Solo el dinero que pasó por
 * la PASARELA (lo que Nucleo tiene en custodia): los pagos manuales ya los cobró
 * el gym. `platform_surcharge` es el recargo de Nucleo y NUNCA se deposita.
 */
export interface GymStatement {
  gym_id: string;
  gym_name: string;
  period: string;
  period_start: string;
  period_end: string;
  currency: string;
  gross_charged: string;
  gym_revenue: string;
  platform_surcharge: string;
  /** Negativo o cero. **Ya incluye los contracargos**: no los restes otra vez. */
  refunds_total: string;
  refunds_surcharge: string;
  /** Negativo o cero. Parte de `refunds_total` que impuso el banco, no el gym. */
  chargebacks_total: string;
  chargebacks_surcharge: string;
  chargebacks_count: number;
  net_to_deposit: string;
  platform_earned: string;
  payments_count: number;
  refunds_count: number;
  payout: Payout | null;
}

/**
 * Totales de la red en el periodo. `platform_earned` es el margen REAL: el recargo
 * cobrado menos los reembolsos y menos la comisión que se quedó el proveedor de la
 * pasarela (`Payment.gateway_fee`).
 */
export interface PlatformBillingTotals {
  gross_charged: string;
  gym_revenue: string;
  refunds_total: string;
  platform_earned: string;
  net_to_deposit: string;
  gyms_count: number;
  /**
   * Desglose del margen: recargo bruto que pagaron los atletas y costo de la
   * pasarela del periodo. `PlatformTotalsSerializer` ya los expone, así que la
   * cabecera pinta el desglose.
   *
   * Siguen **opcionales a propósito**: el panel se despliega en Amplify y la API en
   * EC2, por separado. Si la web sale primero, estas dos cifras todavía no vienen y
   * el desglose se omite solo en vez de pintar "Q NaN".
   */
  platform_surcharge?: string;
  provider_fee_net?: string;
}

/** Liquidación de TODOS los gyms del periodo (solo superadmin). */
export interface PlatformStatements {
  period: string;
  period_start: string;
  period_end: string;
  currency: string;
  /** Solo gyms con movimiento por pasarela o con payout del periodo. */
  gyms: GymStatement[];
  totals: PlatformBillingTotals;
}

export interface PlanOffer {
  id: string;
  gym: string;
  plan: string | null;
  plan_name: string | null;
  name: string;
  offer_type: "percent" | "free_months";
  value: string;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvitationInput {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  comment?: string;
  trial_start?: string | null;
  trial_end?: string | null;
}

// --- ERP (§18) ---
export interface ProductComponentRef {
  component: string;
  component_name?: string;
  qty: number;
}

export interface ErpProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  sale_price: string;
  cost_price: string;
  stock_qty: number;
  reorder_level: number;
  margin_unit: string;
  needs_reorder: boolean;
  // Marketplace (tienda en la app del atleta)
  show_in_marketplace: boolean;
  description: string;
  photo: string | null;
  // Galería: imágenes adicionales del producto (la portada sigue siendo `photo`).
  images: { id: string; url: string; order: number }[];
  sizes: string[];
  colors: string[];
  delivery_days: number;
  is_upcoming: boolean;
  launch_date: string | null;
  // Receta / preparados (licuados): insumos que se descuentan al vender.
  components: ProductComponentRef[];
  is_composite: boolean;
  is_active: boolean;
  created_at: string;
}

export type ProductOrderStatus =
  | "pending_payment"
  | "reserved"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

/** Estado de la devolución. `""` = el pedido no tiene ninguna en curso. */
export type ReturnStatus = "" | "requested" | "approved" | "rejected";

export type DeliveryMethod = "pickup" | "shipping";

/** Línea del pedido (el carrito puede llevar varios productos en UN solo cobro). */
export interface ProductOrderLine {
  id: string;
  product: string;
  product_name: string;
  product_photo: string | null;
  qty: number;
  size: string;
  color: string;
  unit_price: string;
  subtotal: string;
  delivery_days: number;
}

/** Hito de la línea de tiempo del pedido (pagado → preparando → enviado → …). */
export interface ProductOrderEvent {
  id: string;
  status: ProductOrderStatus;
  status_label: string;
  note: string;
  created_at: string;
}

/**
 * Pedido/apartado de la tienda del gym. TODOS los montos son STRING decimal.
 * `total` = subtotal + envío (lo que factura el gym); `total_charged` = lo que se
 * le cobró a la tarjeta (total + recargo de Nucleo). El reembolso devuelve la
 * BASE, nunca el recargo.
 */
export interface ProductOrder {
  id: string;
  gym: string;
  gym_name: string;
  product: string;
  product_name: string;
  product_photo: string | null;
  athlete: string;
  athlete_name: string;
  qty: number;
  size: string;
  color: string;
  unit_price: string;
  subtotal: string;
  shipping_cost: string;
  total: string;
  surcharge: string;
  total_charged: string;
  kind: "purchase" | "preorder";
  status: ProductOrderStatus;
  payment: string | null;
  delivery_days: number;
  delivery_method: DeliveryMethod;
  shipping_recipient: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_notes: string;
  tracking_code: string;
  return_status: ReturnStatus;
  return_reason: string;
  return_requested_at: string | null;
  return_resolved_at: string | null;
  return_resolution_note: string;
  can_request_return: boolean;
  items_count: number;
  lines: ProductOrderLine[];
  events: ProductOrderEvent[];
  created_at: string;
}

/** Condiciones de envío de la tienda del gym. */
export interface ShippingInfo {
  enabled: boolean;
  cost: string;
  /** Envío gratis a partir de este monto (`null` = nunca). */
  free_over: string | null;
  eta_days: number;
  note: string;
}

export interface ErpMovement {
  id: string;
  product: string;
  product_name: string;
  type: string;
  qty: number;
  unit_cost: string;
  note: string;
  created_at: string;
}

export interface ErpSaleLine {
  id: string;
  product: string;
  product_name: string;
  qty: number;
  unit_price: string;
  unit_cost: string;
  subtotal: string;
}

export interface ErpSale {
  id: string;
  athlete: string | null;
  payment: string | null;
  method?: string;
  total: string;
  cogs: string;
  margin: string;
  note: string;
  return_of: string | null;
  lines: ErpSaleLine[];
  created_at: string;
}

export type ExpenseCategory =
  | "rent"
  | "utilities"
  | "equipment"
  | "marketing"
  | "payroll"
  | "inventory"
  | "other";

/**
 * Categoría al ESCRIBIR. El `& {}` conserva el autocompletado de las categorías
 * reales sin romper a las páginas que la llevan en un `useState<string | null>`.
 */
export type ExpenseCategoryInput = ExpenseCategory | (string & {});

/**
 * Gasto del gym. Histórico inmutable: NO se edita ni se borra. Para corregirlo
 * está `/correct` (anula el original y crea uno nuevo que lo reemplaza) y para
 * darlo de baja `/void`. Un gasto anulado SIGUE en la lista, marcado `is_void`.
 */
export interface ErpExpense {
  id: string;
  branch: string | null;
  category: ExpenseCategory;
  amount: string;
  description: string;
  incurred_on: string;
  proof_url: string;
  /** URL del comprobante subido (archivo privado). "" si no hay. */
  proof_file: string;
  is_void: boolean;
  voided_at: string | null;
  void_reason: string;
  /** Gasto ORIGINAL al que corrige este (si nació de un `/correct`). */
  replaces: string | null;
  /** Gasto que corrigió a este (si fue corregido). */
  replaced_by: string | null;
  created_at: string;
}

/** Proveedor del gym (compras de inventario). DELETE = soft-delete. */
export interface ErpSupplier {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  tax_id: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

export interface ErpPurchaseOrderLine {
  id: string;
  product: string;
  product_name: string;
  qty: number;
  unit_cost: string;
  received_qty: number;
  pending_qty: number;
  subtotal: string;
}

/** Orden de compra a un proveedor. Recibirla CARGA el stock con su costo real. */
export interface ErpPurchaseOrder {
  id: string;
  supplier: string;
  supplier_name: string;
  branch: string | null;
  status: PurchaseOrderStatus;
  reference: string;
  expected_on: string | null;
  ordered_on: string | null;
  received_at: string | null;
  note: string;
  total: string;
  received_total: string;
  cancel_reason: string;
  lines: ErpPurchaseOrderLine[];
  created_at: string;
}

/**
 * Montos de los reportes ERP en crudo (`/erp/reports/*`): el backend devuelve el
 * diccionario tal cual, así que los Decimal viajan como NÚMERO JSON y no como
 * string decimal. Pásalos por `fmtQ`/`toNumber` (aceptan ambos).
 */
export type ErpMonto = string | number;

/** Fila de la valuación de inventario (una por producto vivo del gym). */
export interface InventoryValuationRow {
  product: string;
  name: string;
  sku: string;
  category: string;
  category_label: string;
  stock_qty: number;
  cost_price: ErpMonto;
  /** Costo promedio ponderado de las compras del ledger (o `cost_price`). */
  avg_cost: ErpMonto;
  stock_value: ErpMonto;
  sale_price: ErpMonto;
  retail_value: ErpMonto;
  units_purchased: number;
  units_sold: number;
  daily_velocity: number;
  /** Días que dura el stock al ritmo actual (`null` = sin ventas en la ventana). */
  days_of_inventory: number | null;
  turnover: number | null;
  last_purchase_at: string | null;
  days_since_purchase: number | null;
  last_sale_at: string | null;
  days_since_sale: number | null;
  /** Con stock y CERO ventas en la ventana: capital dormido. */
  is_dead_stock: boolean;
  needs_reorder: boolean;
}

export interface InventoryValuationCategory {
  category: string;
  label: string;
  units: number;
  value: ErpMonto;
}

/** Valuación del inventario a costo, antigüedad y rotación. NO viene paginada. */
export interface InventoryValuation {
  as_of: string;
  days: number;
  total_units: number;
  total_value: ErpMonto;
  total_retail_value: ErpMonto;
  potential_margin: ErpMonto;
  products_count: number;
  dead_stock_count: number;
  dead_stock_value: ErpMonto;
  reorder_count: number;
  by_category: InventoryValuationCategory[];
  /** Ordenados por `stock_value` descendente. */
  products: InventoryValuationRow[];
}

export interface GymClub {
  id: string;
  name: string;
  club_type: string;
  /** Descripción del club (nueva en el ClubSerializer; `plan` ya no se expone). */
  description?: string;
  gym: string | null;
  gym_name: string | null;
  status: string;
  status_display: string;
  is_public: boolean;
  member_count?: number;
  created_at: string;
}

/** Anuncio del club a sus miembros (mismo contrato que el anuncio del gym). */
export interface ClubAnnouncement {
  id: string;
  club: string;
  title: string;
  body: string;
  photo: string | null;
  created_at: string;
}

/** Lo que el club_admin puede editar de su ficha (`is_public`/`status` no). */
export interface ClubProfileEditable {
  id: string;
  name: string;
  club_type: string;
  description: string;
  photo: string | null;
}

/**
 * Una fila de la cola de moderación de contenido de club (`apps/clubs/moderation.py`).
 *
 * Mezcla los CUATRO tipos que llevan texto libre dentro de un club —anuncio,
 * actividad, reto y publicación de un miembro— en un solo stream: `kind` es lo que
 * dice cuál se está mirando. Sale del schema generado, no se escribe a mano.
 *
 * La moderación aquí es REACTIVA (lo publicado ya se ve): `report_count > 0` es la
 * única señal que existe sobre el TEXTO, porque ninguna IA lo lee.
 */
export type ClubContentRow = components["schemas"]["ClubContentModeration"];

/** Tipos de contenido moderable dentro de un club, en el orden del backend. */
export type ClubContentKind = "announcement" | "activity" | "challenge" | "post";

/** Etiqueta legible de cada tipo (el backend manda el `kind` crudo). */
export const CLUB_CONTENT_KIND: Record<string, string> = {
  announcement: "Anuncio",
  activity: "Actividad",
  challenge: "Reto",
  post: "Publicación de un miembro",
};

export interface ErpBranch {
  id: string;
  name: string;
  location_text: string;
  lat: string | null;
  lng: string | null;
  created_at: string;
}

export interface Coach {
  id: string;
  staff_role: string;
  name: string;
  email: string;
  photo: string | null;
  pay_type: "per_class" | "fixed";
  per_class_rate: string;
  fixed_amount: string;
  is_active: boolean;
  /** Personal trainer: ofrece el servicio, su precio y la comisión del trainer (0-1). */
  offers_pt: boolean;
  pt_price: string;
  pt_commission_pct: string;
  rating: number | null;
  rating_count: number;
}

export interface CoachRequest {
  id: string;
  gym: string;
  gym_name: string;
  user: string;
  user_email: string;
  direction: "gym_invite" | "coach_apply";
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string;
  created_at: string;
}

export interface CoachPayout {
  id: string;
  coach: string;
  coach_email: string;
  period_start: string;
  period_end: string;
  total: string;
  status: "open" | "paid";
  paid_at: string | null;
  earnings_count: number;
  created_at: string;
}

/** Campos extra de GymClass añadidos por el sprint de coaches (no aún en el schema generado). */
export interface ClassCoachFields {
  coach: string | null;
  coach_name: string | null;
  branch: string | null;
  assignment_lead_min: number;
  assignment_deadline_at: string | null;
  is_past_assignment_deadline: boolean;
  needs_coach: boolean;
  pay_extra: boolean;
  extra_amount: string;
  // Fase servicios/horarios/WOD:
  service_type: string | null;
  service_type_name: string | null;
  color: string;
  schedule: string | null;
  needs_wod: boolean;
  // Calificación promedio de la clase (1-5★) + cuántas la calificaron.
  rating: number | null;
  rating_count: number;
}

export type ScoreType =
  | "none"
  | "for_time"
  | "amrap"
  | "rounds_reps"
  | "load"
  | "emom"
  | "points";

export interface ServiceType {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  photo: string | null;
  how_it_works: string;
  requires_wod: boolean;
  default_score_type: ScoreType;
  default_duration_min: number;
  default_capacity: number;
  default_level: string;
  included_in_plan: boolean;
  rating: number | null;
  rating_count: number;
  default_cost: string;
  completion_points: number;
  // Estado y cobro (fusión): el servicio nace "draft" y se activa al configurar
  // su precio/inclusión y asignarlo a planes desde Membresías.
  status: "draft" | "active";
  access_type: "included" | "extra";
  charge_type: "recurring" | "one_time";
  price: string;
  duration_days: number;
  plans: string[];
  is_active: boolean;
}

export interface ClassSchedule {
  id: string;
  branch: string | null;
  service_type: string;
  service_type_name: string;
  color: string;
  requires_wod: boolean;
  weekday: number;
  start_time: string; // HH:MM[:SS]
  duration_min: number;
  capacity: number;
  level: string;
  cost: string;
  included_in_plan: boolean;
  default_coach: string | null;
  assignment_lead_min: number;
  valid_from: string;
  valid_until: string | null;
  is_open_ended: boolean;
  is_active: boolean;
}

export interface Wod {
  id: string;
  service_type: string | null;
  service_type_name: string;
  date: string;
  title: string;
  description: string;
  score_type: ScoreType;
  time_cap_min: number | null;
  movements: unknown;
  published: boolean;
  is_benchmark: boolean;
  results_count: number;
}

export interface WodResult {
  id: string;
  wod: string;
  gym_class: string | null;
  athlete: string;
  athlete_name: string;
  raw_score: string;
  score_value: string;
  scaling: "rx" | "scaled" | "foundations";
  notes: string;
  rank?: number;
  created_at: string;
}

export interface ErpRevenueLine {
  line: string;
  label: string;
  revenue: string;
}

export interface ErpCategoryRevenue {
  category: string;
  label: string;
  revenue: string;
  cogs: string;
  units: number;
}

export interface ErpMethodRevenue {
  method: string;
  label: string;
  revenue: string;
}

export interface ErpExpenseCategory {
  category: string;
  label: string;
  amount: string;
}

export interface ErpPnl {
  from: string;
  to: string;
  branch: string | null;
  membership_revenue: string;
  service_revenue: string;
  retail_revenue: string;
  counter_revenue: string;
  marketplace_revenue: string;
  gross_revenue: string;
  cogs: string;
  direct_cost: string;
  gross_margin: string;
  gross_margin_pct: number;
  losses: string;
  expenses: string;
  net_profit: string;
  net_margin_pct: number;
  previous: { gross_revenue: string; net_profit: string };
  delta_revenue_pct: number | null;
  delta_net_pct: number | null;
  revenue_lines: ErpRevenueLine[];
  revenue_by_category: ErpCategoryRevenue[];
  revenue_by_method: ErpMethodRevenue[];
  expenses_by_category: ErpExpenseCategory[];
  active_members: number;
  new_members: number;
  inventory_purchases_units: number;
  /**
   * Costo de las entradas `type=purchase` de la ventana. INFORMATIVO: no resta en
   * el P&L (su costo entra como COGS al vender).
   */
  inventory_purchases_cost: ErpMonto;
  /**
   * Gastos con `category=inventory` EXCLUIDOS del OPEX para no duplicar el COGS.
   * `expenses`/`expenses_by_category` ya vienen sin ellos y sin anulados, y
   * `expenses_by_category` suma exacto `expenses`.
   */
  inventory_expensed_excluded: ErpMonto;
  top_products: { name: string; units: number }[];
}

// --- Tickets y posts de atletas (campos nuevos; correr gen:api para consolidar) ---
export interface TicketMessage {
  id: string;
  body: string;
  photo: string | null;
  author_name: string;
  is_staff: boolean;
  created_at: string;
}

export interface GymTicket {
  id: string;
  gym: string;
  athlete: string;
  athlete_name: string;
  category: string;
  category_display: string;
  subject: string;
  body: string;
  photo: string | null;
  status: "open" | "in_progress" | "resolved";
  status_display: string;
  messages: TicketMessage[];
  created_at: string;
}

export interface AthletePost {
  id: string;
  gym: string;
  athlete: string;
  athlete_name: string;
  author_name?: string;
  author_type?: "athlete" | "coach";
  body: string;
  photo: string | null;
  media?: FeedMedia[];
  status: "pending" | "approved" | "rejected";
  status_display: string;
  report_count?: number;
  moderation_label?: string;
  /**
   * Motivo por el que se sancionó (§2 del debido proceso). Es lo que se le dice
   * al autor y contra lo que puede apelar; obligatorio al rechazar. Vacío en un
   * post aprobado (aprobar limpia la sanción anterior).
   */
  decision_reason?: MotivoModeracion | "";
  /** Mismo motivo ya traducido por el backend ("Lenguaje ofensivo"). */
  decision_reason_display?: string;
  /** Aclaración libre que escribió el admin al decidir. */
  decision_note?: string;
  created_at: string;
}

/**
 * Comentario del feed reportado por un atleta y OCULTO a la espera de que el
 * gym lo revise. La moderación de comentarios es REACTIVA (un reporte lo baja
 * del feed), así que esta cola es el único camino de vuelta: sin ella, ocultar
 * un comentario sería irreversible.
 */
export interface ReportedComment {
  id: string;
  /** uuid del atleta autor (dato global; el gym solo ve su propia relación). */
  athlete: string;
  athlete_name: string;
  body: string;
  image: string | null;
  report_count: number;
  /** `true` mientras esté fuera del feed esperando la decisión del gym. */
  hidden: boolean;
  /** id sintético del ítem del feed sobre el que se comentó. */
  feed_item_id: string;
  /** Motivo con el que se sancionó (lo llena el rechazo; se limpia al restaurar). */
  decision_reason?: MotivoModeracion | "";
  /** Aclaración libre del admin al decidir. */
  decision_note?: string;
  created_at: string;
}

// --- Debido proceso: motivo de la sanción, apelaciones y señal de moderación ---

/**
 * Motivos con los que el gym puede sancionar un post o un comentario. Al
 * rechazar es OBLIGATORIO mandar uno (`400 {"code":"reason_required"}` si falta):
 * sin motivo el autor no sabe qué corregir y su apelación no tiene contra qué
 * defenderse.
 */
export type MotivoModeracion =
  | "spam"
  | "ofensivo"
  | "acoso"
  | "sexual"
  | "violencia"
  | "desinformacion"
  | "fuera_de_tema"
  | "otro";

/** Opciones del selector de motivo, en el orden en que las muestra el panel. */
export const MOTIVOS_MODERACION: { value: MotivoModeracion; label: string }[] = [
  { value: "spam", label: "Spam o publicidad" },
  { value: "ofensivo", label: "Lenguaje ofensivo" },
  { value: "acoso", label: "Acoso a otra persona" },
  { value: "sexual", label: "Contenido sexual" },
  { value: "violencia", label: "Violencia o contenido perturbador" },
  { value: "desinformacion", label: "Información falsa o engañosa" },
  { value: "fuera_de_tema", label: "No tiene que ver con el gimnasio" },
  { value: "otro", label: "Otro motivo" },
];

/**
 * Estado de una apelación. `pending` la revisa el gym; si la rechaza, el atleta
 * puede escalarla UNA vez a Nucleo (`escalated`), que es la última instancia.
 */
export type AppealStatus = "pending" | "escalated" | "accepted" | "rejected";

/**
 * Descargo de un atleta contra una decisión de moderación (post rechazado o
 * comentario oculto). Aceptarla RESTAURA el contenido: el post vuelve al feed y
 * el comentario deja de estar oculto.
 */
export interface Appeal {
  id: string;
  /** Qué se apela. El objeto en sí va en `object_id`. */
  kind: "post" | "comment";
  object_id: string;
  gym: string;
  gym_name: string;
  athlete: string;
  athlete_name: string;
  /** El descargo que escribió el atleta. */
  body: string;
  status: AppealStatus;
  status_display: string;
  /** Nota con la que el gym (o Nucleo) resolvió. */
  resolution_note: string;
  decided_at: string | null;
  escalated_at: string | null;
  created_at: string;
  /** Extracto del contenido sancionado (el gym ve qué está debatiendo). */
  content_excerpt: string;
  content_reason: MotivoModeracion | "";
  content_reason_display: string;
  content_note: string;
  /** `true` si el atleta todavía puede escalarla a Nucleo. */
  can_escalate: boolean;
}

/**
 * Fila de la señal de moderación: SÓLO conteos agregados dentro de ESTE gym.
 * Nunca trae quién bloqueó ni quién reportó, y el backend omite a quien no
 * supera el umbral de anonimato — es lo que separa una señal de una filtración.
 */
export interface ModerationSignal {
  athlete_id: string;
  athlete_name: string;
  athlete_avatar: string | null;
  bloqueos: number;
  reportes: number;
  ultima_senal: string;
}

export interface GymService {
  id: string;
  gym: string;
  name: string;
  description: string;
  photo: string | null;
  access_type: "included" | "extra";
  charge_type: "recurring" | "one_time";
  price: string;
  duration_days: number;
  class_types: string[];
  is_active: boolean;
  created_at: string;
}

// --- Reporte de errores del software (apps.bugreports) ---
// Cualquier usuario del panel REPORTA; la bandeja (`platform/reports`) es del
// superadmin de plataforma. Distinto de GymTicket (soporte atleta↔gimnasio).
export interface BugReportConfig {
  web_enabled: boolean;
  mobile_enabled: boolean;
  updated_at?: string;
}

export type ReportStatus = "new" | "triaged" | "in_pr" | "resolved" | "closed" | "discarded";
export type ReportKind = "bug" | "feature" | "support" | "noise" | "duplicate";
export type ReportSeverity = "low" | "medium" | "high" | "critical";
export type ReportSurface = "web_admin" | "mobile_ios" | "mobile_android" | "other";

/** Fila de la bandeja de reportes (consola del operador). */
export interface BugReport {
  id: string;
  created_at: string;
  description: string;
  surface: ReportSurface;
  surface_display: string;
  kind: ReportKind;
  kind_display: string;
  severity: ReportSeverity;
  severity_display: string;
  status: ReportStatus;
  status_display: string;
  reporter_email: string;
  reporter_role: string;
  gym_name: string;
  app_version: string;
  build: string;
  screen: string;
  has_attachment: boolean;
  /** Solo si la bandeja pidió `with_prompt=1` (copiar sin abrir el ticket). */
  fix_prompt?: string;
}

/** Ficha completa: metadata capturada + prompt de fix listo para Claude Code. */
export interface BugReportDetail extends BugReport {
  attachment: string | null;
  os_name: string;
  os_version: string;
  device_model: string;
  user_agent: string;
  locale: string;
  timezone: string;
  stack_trace: string;
  extra: Record<string, unknown>;
  operator_notes: string;
  resolved_at: string | null;
  duplicate_of: string | null;
  fix_prompt: string;
}

// --- Contracargos (disputas de tarjeta) ---------------------------------------
// Un contracargo NO es un reembolso: el reembolso lo decide el gym y el
// contracargo se lo impone el banco del atleta. Los dos aparecen como un
// `Payment` negativo, y `Payment.is_chargeback` es lo único que los distingue en
// el historial. Los montos del expediente viajan en POSITIVO: el signo negativo
// vive en `reversal`, que es el movimiento de dinero.

export type ChargebackStatus = "open" | "submitted" | "won" | "lost";

export type Chargeback = components["schemas"]["Chargeback"];

// --- Inventario: kardex, mermas y ajustes -------------------------------------

/** Tipos del ledger de inventario (`InventoryMovement.type`). */
export type MovementType = "purchase" | "sale" | "adjustment" | "loss" | "return";

/**
 * Resultado del conteo físico. El panel manda lo CONTADO y el backend calcula la
 * diferencia contra el stock del momento; `movement` es `null` cuando el conteo
 * cuadró (no hay asiento que hacer).
 */
export type InventoryCountResult = components["schemas"]["InventoryCountResult"];

// --- Anuncios del gym ---------------------------------------------------------

/** Anuncio publicado al feed del gimnasio (editable y dado de baja en blando). */
export type GymAnnouncement = components["schemas"]["GymAnnouncement"];
