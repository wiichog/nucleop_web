import type { components } from "./schema";

export type Membership = components["schemas"]["MembershipAdmin"];
export type Payment = components["schemas"]["Payment"];
export type Plan = components["schemas"]["Plan"];
export type JoinRequest = components["schemas"]["JoinRequest"];
export type GymClass = components["schemas"]["GymClass"];

export interface Paginated<T> {
  results: T[];
  next: string | null;
  previous: string | null;
}

export function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
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
