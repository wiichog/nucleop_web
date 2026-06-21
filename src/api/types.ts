import type { components } from "./schema";

// Campos nuevos del backend aún no regenerados en schema.d.ts (correr `npm run gen:api`
// con el backend arriba los incorpora; mientras tanto se intersectan aquí).
export type Membership = components["schemas"]["MembershipAdmin"] & {
  plan_name?: string | null;
  athlete_photo?: string | null;
  days_to_due?: number | null;
  leave_initiated_by?: string;
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
export type Payment = components["schemas"]["Payment"];
export type Plan = components["schemas"]["Plan"] & {
  // Servicios del catálogo incluidos en la suscripción (aún no en el schema generado).
  service_types?: string[];
  service_type_names?: string[];
};
export type JoinRequest = components["schemas"]["JoinRequest"];
export type GymClass = components["schemas"]["GymClass"];
export type GymCheckin = components["schemas"]["GymCheckin"];
export type AuditLog = components["schemas"]["AuditLog"];
export type GymAdmin = components["schemas"]["GymAdmin"];

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
  is_free: boolean;
  capacity?: number | null;
  rsvp_count?: number;
  my_rsvp?: boolean;
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
}

export interface ClubChallengeSubmission {
  id: string;
  challenge: string;
  athlete: string;
  athlete_name: string;
  delta: string;
  source: string;
  status: string;
  created_at: string;
}

export interface ClubChallengeLeaderboardRow {
  id: string;
  athlete: string;
  athlete_name: string;
  progress: string;
  status: string;
  rank: number;
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
  tickets: number;
  clases_sin_wod: number;
  pedidos: number;
  clubes: number;
  morosos: number;
  total: number;
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

/** Pedido/apartado de la tienda del gym (marketplace de la app). */
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
  total: string;
  kind: "purchase" | "preorder";
  status: "pending_payment" | "reserved" | "paid" | "delivered" | "cancelled";
  payment: string | null;
  delivery_days: number;
  created_at: string;
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

export interface ErpExpense {
  id: string;
  category: string;
  amount: string;
  description: string;
  incurred_on: string;
  proof_url: string;
  created_at: string;
}

export interface GymClub {
  id: string;
  name: string;
  club_type: string;
  gym: string | null;
  gym_name: string | null;
  status: string;
  status_display: string;
  is_public: boolean;
  member_count?: number;
  created_at: string;
}

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
  created_at: string;
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

// --- Reportes de error del software (apps.bugreports) ---
// OJO: distinto de GymTicket (soporte atleta↔gym). Esto es el bug-reporting del
// software, gestionado por el superadmin en la consola de Plataforma.
export type ReportStatus = "new" | "triaged" | "in_pr" | "resolved" | "closed" | "discarded";

export interface BugReport {
  id: string;
  description: string;
  attachment: string | null;
  surface: string;
  surface_display: string;
  app_version: string;
  build: string;
  os_name: string;
  os_version: string;
  device_model: string;
  user_agent: string;
  screen: string;
  locale: string;
  timezone: string;
  stack_trace: string;
  extra: Record<string, unknown>;
  reporter: string | null;
  reporter_email: string;
  reporter_role: string;
  gym: string | null;
  gym_name: string;
  kind: string;
  kind_display: string;
  severity: string;
  severity_display: string;
  status: ReportStatus;
  status_display: string;
  duplicate_of: string | null;
  operator_notes: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BugReportConfig {
  web_enabled: boolean;
  mobile_enabled: boolean;
  updated_at?: string;
}

export interface BugReportSummary {
  total: number;
  open: number;
  by_status: { status: string; count: number }[];
  by_surface: { surface: string; count: number }[];
  by_kind: { kind: string; count: number }[];
  by_severity: { severity: string; count: number }[];
  by_app_version: { app_version: string; count: number }[];
  by_screen: { screen: string; count: number }[];
}
