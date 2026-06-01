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
  phone: string;
  email?: string;
  first_name: string;
  last_name: string;
  comment?: string;
}
