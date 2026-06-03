import type { components } from "./schema";

export type Membership = components["schemas"]["MembershipAdmin"];
export type MembershipDetail = components["schemas"]["MembershipDetailAdmin"];
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
  score: string;
  awarded_at: string;
}

export interface Dashboard {
  atletas_activos: number;
  morosos: number;
  ingresos_mes_tarjeta: string;
  ingresos_mes_manual: string;
  proximos_vencimientos: number;
}

export interface InvitationInput {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  comment?: string;
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

export interface ErpPnl {
  from: string;
  to: string;
  retail_revenue: string;
  membership_revenue: string;
  gross_revenue: string;
  cogs: string;
  gross_margin: string;
  expenses: string;
  net_profit: string;
  top_products: { name: string; units: number }[];
}
