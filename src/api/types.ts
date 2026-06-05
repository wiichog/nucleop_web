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
export type Plan = components["schemas"]["Plan"];
export type JoinRequest = components["schemas"]["JoinRequest"];
export type GymClass = components["schemas"]["GymClass"];
export type GymCheckin = components["schemas"]["GymCheckin"];
export type AuditLog = components["schemas"]["AuditLog"];
export type GymAdmin = components["schemas"]["GymAdmin"];

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
  period: string;
  class_type: string;
  score: string;
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
  clases_mas_demandadas: { class_type: string; reservas: number }[];
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
  is_active: boolean;
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
  total: string;
  cogs: string;
  margin: string;
  note: string;
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
  email: string;
  pay_type: "per_class" | "fixed";
  per_class_rate: string;
  fixed_amount: string;
  is_active: boolean;
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
}

export interface ErpRevenueLine {
  line: string;
  label: string;
  revenue: string;
}

export interface ErpPnl {
  from: string;
  to: string;
  branch: string | null;
  membership_revenue: string;
  service_revenue: string;
  retail_revenue: string;
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
