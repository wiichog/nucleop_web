import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "./client";
import {
  AltaGimnasio,
  AuditLog,
  Dashboard,
  PendingSummary,
  GymClass,
  GymCheckin,
  GymAdmin,
  GymCreado,
  GymStaffAdmin,
  InvitationInput,
  JoinRequest,
  Membership,
  MembershipDetail,
  Paginated,
  Payment,
  Plan,
  PlanOffer,
  FeedItem,
  AthleteOfMonth,
  ErpProduct,
  ProductOrder,
  ErpMovement,
  ErpSale,
  ErpExpense,
  ErpPnl,
  ErpBranch,
  GymClub,
  Coach,
  CoachPayout,
  CoachRequest,
  ServiceType,
  ClassSchedule,
  DropinProduct,
  Wod,
  WodResult,
  BugReportConfig,
  ClubAnnouncement,
  ClubProfileEditable,
  ErpPurchaseOrder,
  ErpSupplier,
  ExpenseCategoryInput,
  GymStatement,
  InventoryValuation,
  Payout,
  PlatformStatements,
  ProductOrderStatus,
  PurchaseOrderStatus,
  ReturnStatus,
  ShippingInfo,
} from "./types";

export interface Role {
  role: string;
  gym_id: string | null;
  club_id: string | null;
}

interface Me {
  email: string;
  is_superuser: boolean;
  must_change_password?: boolean;
  roles: Role[];
}

// Trae la lista COMPLETA siguiendo la paginación por cursor del backend (DRF
// pagina a 25). Sin esto, las tablas con +25 filas se truncaban a la 1ra página
// y el orden/búsqueda del cliente solo operaba sobre esas 25.
async function getList<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (let guard = 0; guard < 50; guard++) {
    const sep: string = url.includes("?") ? "&" : "?";
    const reqUrl: string = cursor ? `${url}${sep}cursor=${encodeURIComponent(cursor)}` : url;
    const resp = await api.get<T[] | Paginated<T>>(reqUrl);
    const data: T[] | Paginated<T> = resp.data;
    if (Array.isArray(data)) return data;
    out.push(...data.results);
    const next: string | null = data.next;
    if (!next) break;
    const m: RegExpMatchArray | null = next.match(/[?&]cursor=([^&]+)/);
    cursor = m ? decodeURIComponent(m[1]) : null;
    if (!cursor) break;
  }
  return out;
}

/**
 * Invalida el resumen de pendientes del gym (badge del menú lateral + campana).
 * Toda acción que RESUELVE un pendiente (aprobar solicitud, moderar un post,
 * cobrar a un moroso, entregar un pedido, publicar el WOD…) tiene que llamarla:
 * si no, el contador se queda mintiendo hasta el refetch automático de 60 s y el
 * admin vuelve a entrar a una bandeja ya vacía.
 */
function invalidarPendientes(qc: QueryClient, gymId: string) {
  qc.invalidateQueries({ queryKey: ["pending-summary", gymId] });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const { data } = await api.post("/auth/login", creds);
      tokenStore.set(data.access, data.refresh);
      return data;
    },
  });
}

export function useSocialLogin() {
  return useMutation({
    mutationFn: async (payload: { provider: "google" | "facebook"; token: string }) => {
      const { data } = await api.post("/auth/social", payload);
      tokenStore.set(data.access, data.refresh);
      return data;
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<Me>("/me")).data,
    enabled: !!tokenStore.access,
  });
}

export function useDashboard(gymId: string, from?: string, to?: string) {
  const q = from && to ? `?from=${from}&to=${to}` : "";
  return useQuery({
    queryKey: ["dashboard", gymId, from ?? "", to ?? ""],
    queryFn: async () => (await api.get<Dashboard>(`/gym/${gymId}/dashboard${q}`)).data,
    enabled: !!gymId,
  });
}

/**
 * Resumen de pendientes del gym (badge de notificaciones + dashboard).
 * Se refresca solo cada 60s para mantener el badge vivo sin saturar la API.
 */
export function usePendingSummary(gymId: string) {
  return useQuery({
    queryKey: ["pending-summary", gymId],
    queryFn: async () =>
      (await api.get<PendingSummary>(`/gym/${gymId}/pending-summary`)).data,
    enabled: !!gymId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function usePasswordChange() {
  return useMutation({
    mutationFn: async (body: { current_password?: string; new_password: string }) =>
      (await api.post("/auth/password-change", body)).data,
  });
}

export function useAtRisk(gymId: string) {
  return useQuery({
    queryKey: ["at-risk", gymId],
    queryFn: () => getList<Membership>(`/gym/${gymId}/retention/at-risk`),
    enabled: !!gymId,
  });
}

export function useOverdue(gymId: string) {
  return useQuery({
    queryKey: ["overdue", gymId],
    queryFn: () => getList<Membership>(`/gym/${gymId}/overdue`),
    enabled: !!gymId,
  });
}

export function useMemberships(gymId: string) {
  return useQuery({
    queryKey: ["memberships", gymId],
    queryFn: () => getList<Membership>(`/gym/${gymId}/memberships`),
    enabled: !!gymId,
  });
}

export function usePlans(gymId: string) {
  return useQuery({
    queryKey: ["plans", gymId],
    queryFn: () => getList<Plan>(`/gym/${gymId}/plans`),
    enabled: !!gymId,
  });
}

export function useGymPayments(gymId: string) {
  return useQuery({
    queryKey: ["payments", gymId],
    queryFn: () => getList<Payment>(`/gym/${gymId}/payments`),
    enabled: !!gymId,
  });
}

export function useRegisterManualPayment(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      membership_id: string;
      amount: string;
      method: "cash" | "bank_transfer";
      proof_file?: File;
    }) => {
      const form = new FormData();
      form.append("membership_id", body.membership_id);
      form.append("amount", body.amount);
      form.append("method", body.method);
      if (body.proof_file) form.append("proof_file", body.proof_file);
      return (await api.post<Payment>(`/gym/${gymId}/payments/manual`, form)).data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["payments", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      qc.invalidateQueries({ queryKey: ["overdue", gymId] });
      // Un pago manual activa la membresía y saca al atleta de morosos: la ficha,
      // el riesgo, el dashboard y el badge tienen que reflejarlo al instante.
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId, vars.membership_id] });
      qc.invalidateQueries({ queryKey: ["at-risk", gymId] });
      qc.invalidateQueries({ queryKey: ["dashboard", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useRefundPayment(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, amount }: { paymentId: string; amount: string }) =>
      (await api.post<Payment>(`/gym/${gymId}/payments/${paymentId}/refund`, { amount })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", gymId] });
      qc.invalidateQueries({ queryKey: ["audit", gymId] });
      // El reembolso es un registro NUEVO (histórico inmutable): la ficha del
      // atleta y el dashboard lo tienen que ver sin recargar la página.
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      qc.invalidateQueries({ queryKey: ["dashboard", gymId] });
    },
  });
}

export function usePasswordResetRequest() {
  return useMutation({
    mutationFn: async (email: string) =>
      (await api.post("/auth/password-reset", { email: email.trim().toLowerCase() })).data,
  });
}

export function usePasswordResetConfirm() {
  return useMutation({
    mutationFn: async (body: { uid: string; token: string; password: string }) =>
      (await api.post("/auth/password-reset/confirm", body)).data,
  });
}

export function useMembershipDetail(gymId: string, membershipId: string) {
  return useQuery({
    queryKey: ["membership-detail", gymId, membershipId],
    queryFn: async () =>
      (await api.get<MembershipDetail>(`/gym/${gymId}/memberships/${membershipId}`)).data,
    enabled: !!gymId && !!membershipId,
  });
}

export function useJoinRequests(gymId: string) {
  return useQuery({
    queryKey: ["join-requests", gymId],
    queryFn: () => getList<JoinRequest>(`/gym/${gymId}/join-requests`),
    enabled: !!gymId,
  });
}

export function useInviteAthlete(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InvitationInput) =>
      (await api.post<JoinRequest>(`/gym/${gymId}/invitations`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests", gymId] }),
  });
}

export function useDecideJoinRequest(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      decision,
      comment,
    }: {
      requestId: string;
      decision: "approve" | "reject" | "offer_trial" | "request_info";
      comment?: string;
    }) =>
      (
        await api.post<JoinRequest>(`/gym/${gymId}/join-requests/${requestId}/decide`, {
          decision,
          comment,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useResetAthletePassword(gymId: string) {
  return useMutation({
    mutationFn: async (membershipId: string) =>
      (await api.post(`/gym/${gymId}/memberships/${membershipId}/reset-password`, {})).data,
  });
}

export function useSendReminder(gymId: string) {
  return useMutation({
    mutationFn: async ({
      membershipId,
      message,
      channel = "push",
    }: {
      membershipId: string;
      message?: string;
      channel?: "push" | "email" | "both";
    }) =>
      (await api.post(`/gym/${gymId}/memberships/${membershipId}/reminder`, { message, channel }))
        .data,
  });
}

export function useEditAthleteProfile(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membershipId,
      ...body
    }: {
      membershipId: string;
      first_name?: string;
      last_name?: string;
      birth_date?: string | null;
      emergency_contact?: Record<string, unknown> | null;
    }) => (await api.patch(`/gym/${gymId}/memberships/${membershipId}/athlete`, body)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId, vars.membershipId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
    },
  });
}

export function useAssignPlan(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membershipId,
      planId,
      customFee,
      offerId,
    }: {
      membershipId: string;
      planId: string;
      customFee?: string;
      offerId?: string;
    }) =>
      (
        await api.post<Membership>(`/gym/${gymId}/memberships/${membershipId}/assign-plan`, {
          plan_id: planId,
          custom_fee: customFee || null,
          offer_id: offerId || null,
        })
      ).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["join-requests", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      // Asignar plan ACTIVA la membresía (decisión del dueño): la ficha abierta, la
      // morosidad y el badge de solicitudes quedaban desfasados.
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId, vars.membershipId] });
      qc.invalidateQueries({ queryKey: ["overdue", gymId] });
      qc.invalidateQueries({ queryKey: ["at-risk", gymId] });
      qc.invalidateQueries({ queryKey: ["dashboard", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

/**
 * Renovación automática y método de cobro preferido de UNA membresía.
 *
 * Viaja por `assign-plan`, que es el único endpoint de escritura de la relación,
 * y se manda a propósito SIN `plan_id`: mandarlo re-activaría una membresía
 * pausada o vencida (ver AssignPlanView), y aquí solo se corrige la preferencia
 * de cobro. La página compara la respuesta con lo pedido antes de cantar éxito.
 */
export function useUpdateMembershipBilling(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membershipId,
      ...body
    }: {
      membershipId: string;
      auto_renew?: boolean;
      payment_method_pref?: "card" | "cash" | "bank_transfer";
    }) =>
      (await api.post<Membership>(`/gym/${gymId}/memberships/${membershipId}/assign-plan`, body))
        .data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId, vars.membershipId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
    },
  });
}

/** Invalida todo lo que depende del ESTADO de una membresía (ficha, listas, badges). */
function invalidarMembresia(qc: QueryClient, gymId: string, membershipId?: string) {
  qc.invalidateQueries({ queryKey: ["memberships", gymId] });
  qc.invalidateQueries({
    queryKey: membershipId
      ? ["membership-detail", gymId, membershipId]
      : ["membership-detail", gymId],
  });
  qc.invalidateQueries({ queryKey: ["overdue", gymId] });
  qc.invalidateQueries({ queryKey: ["at-risk", gymId] });
  qc.invalidateQueries({ queryKey: ["dashboard", gymId] });
  invalidarPendientes(qc, gymId);
}

/**
 * Congela la membresía (viaje, lesión). Al reanudar, el vencimiento se corre los
 * días que duró la pausa: el atleta no pierde lo que ya pagó. La transición pasa
 * por `transicionar()` en el backend, nunca se toca el estado a mano.
 *
 * 400 `pause_invalid` si la fecha de retorno no es futura o la transición no es
 * válida; 404 si la membresía no es de ESTE gym; 403 si no es gym_admin de él.
 */
export function usePauseMembership(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membershipId,
      reason,
      return_date,
    }: {
      membershipId: string;
      /** Nota interna del gym (≤200). NO viaja al atleta. */
      reason?: string;
      /** "YYYY-MM-DD" futura, o null si no se sabe cuándo vuelve. */
      return_date?: string | null;
    }) =>
      (
        await api.post<Membership>(`/gym/${gymId}/memberships/${membershipId}/pause`, {
          reason: reason ?? "",
          return_date: return_date ?? null,
        })
      ).data,
    onSuccess: (_d, vars) => invalidarMembresia(qc, gymId, vars.membershipId),
  });
}

/** Reanuda una membresía pausada. 400 `resume_invalid` si no estaba pausada. */
export function useResumeMembership(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membershipId: string) =>
      (await api.post<Membership>(`/gym/${gymId}/memberships/${membershipId}/resume`, {})).data,
    onSuccess: (_d, membershipId) => invalidarMembresia(qc, gymId, membershipId),
  });
}

// --- Cobranza: estado de cuenta del gym y depósitos de la plataforma ---

/**
 * Estado de cuenta del gym con Nucleo (`?period=YYYY-MM`; por defecto el mes en
 * curso). Solo cuenta el dinero que pasó por la PASARELA: los pagos manuales ya
 * los cobró el gym. 400 `period_invalid` si el periodo no es YYYY-MM.
 */
export function useGymStatement(gymId: string, period?: string) {
  const q = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["billing-statement", gymId, period ?? "actual"],
    queryFn: async () =>
      (await api.get<GymStatement>(`/gym/${gymId}/billing/statement${q}`)).data,
    enabled: !!gymId,
  });
}

/** Liquidación de TODOS los gyms del periodo + lo que ganó Nucleo (superadmin). */
export function usePlatformStatements(period: string | undefined, enabled: boolean) {
  const q = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["platform-statements", period ?? "actual"],
    queryFn: async () =>
      (await api.get<PlatformStatements>(`/platform/billing/statements${q}`)).data,
    enabled,
  });
}

/** Depósitos de la red (superadmin). Ambos filtros son opcionales. Sin paginar. */
export function usePlatformPayouts(
  filtro: { period?: string; gymId?: string },
  enabled: boolean,
) {
  const qs = new URLSearchParams();
  if (filtro.period) qs.set("period", filtro.period);
  if (filtro.gymId) qs.set("gym_id", filtro.gymId);
  const query = qs.toString();
  return useQuery({
    queryKey: ["platform-payouts", filtro.period ?? "", filtro.gymId ?? ""],
    queryFn: async () =>
      (await api.get<Payout[]>(`/platform/billing/payouts${query ? `?${query}` : ""}`)).data,
    enabled,
  });
}

/**
 * Genera (o refresca) el payout de un gym para un periodo. Es IDEMPOTENTE: el
 * mismo gym+periodo devuelve el mismo registro actualizado, no crea otro.
 * 400 `payout_invalid`.
 */
export function useGeneratePlatformPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { gym_id: string; period: string }) =>
      (await api.post<Payout>("/platform/billing/payouts", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-payouts"] });
      // El statement del gym y el de la red muestran el payout del periodo.
      qc.invalidateQueries({ queryKey: ["platform-statements"] });
      qc.invalidateQueries({ queryKey: ["billing-statement"] });
    },
  });
}

/**
 * Marca el depósito como ejecutado. `reference` (la referencia bancaria) es
 * OBLIGATORIA: sin ella no hay rastro de que el dinero salió.
 * 400 `payout_invalid` si falta o si ya estaba depositado.
 */
export function usePayPlatformPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      payoutId,
      reference,
      executed_at,
      notes,
    }: {
      payoutId: string;
      reference: string;
      executed_at?: string;
      notes?: string;
    }) =>
      (
        await api.post<Payout>(`/platform/billing/payouts/${payoutId}/pay`, {
          reference,
          executed_at,
          notes,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-payouts"] });
      qc.invalidateQueries({ queryKey: ["platform-statements"] });
      qc.invalidateQueries({ queryKey: ["billing-statement"] });
    },
  });
}

export function useCreatePlan(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      price: string;
      duration_days: number;
      class_limit?: number | null;
      special_classes_access?: boolean;
      open_gym_access?: boolean;
      benefits?: Record<string, unknown> | null;
      noshow_penalty?: Record<string, unknown> | null;
      service_types?: string[];
    }) => (await api.post<Plan>(`/gym/${gymId}/plans`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", gymId] }),
  });
}

export function usePlanOffers(gymId: string) {
  return useQuery({
    queryKey: ["plan-offers", gymId],
    queryFn: () => getList<PlanOffer>(`/gym/${gymId}/plans/offers`),
    enabled: !!gymId,
  });
}

export function useUpdatePlan(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Plan> }) =>
      (await api.patch<Plan>(`/gym/${gymId}/plans/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", gymId] }),
  });
}

export function useDeletePlan(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/gym/${gymId}/plans/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", gymId] }),
  });
}

export function useCreatePlanOffer(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      offer_type: "percent" | "free_months";
      value: string;
      plan?: string | null;
      valid_from?: string | null;
      valid_to?: string | null;
    }) => (await api.post<PlanOffer>(`/gym/${gymId}/plans/offers`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-offers", gymId] }),
  });
}

export function useTogglePlanOffer(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId, is_active }: { offerId: string; is_active: boolean }) =>
      (await api.patch<PlanOffer>(`/gym/${gymId}/plans/offers/${offerId}`, { is_active })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-offers", gymId] }),
  });
}

export function useDeletePlanOffer(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) =>
      (await api.delete(`/gym/${gymId}/plans/offers/${offerId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-offers", gymId] }),
  });
}

export function useGymClasses(gymId: string) {
  return useQuery({
    queryKey: ["gym-classes", gymId],
    queryFn: () => getList<GymClass>(`/gym/${gymId}/classes`),
    enabled: !!gymId,
  });
}

/** Clases pasadas del gym (últimos 60 días, hasta ayer) para la pestaña "Pasado". */
export function useGymPastClasses(gymId: string) {
  const iso = (d: Date) => d.toLocaleDateString("en-CA");
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - 60);
  return useQuery({
    // Bajo el prefijo ["gym-classes", gymId] para que las mutaciones de clases
    // (cancelar/eliminar/editar) también refresquen esta lista.
    queryKey: ["gym-classes", gymId, "past", iso(ayer)],
    queryFn: () => getList<GymClass>(`/gym/${gymId}/classes?from=${iso(desde)}&to=${iso(ayer)}`),
    enabled: !!gymId,
  });
}

export function useCreateRecurringClasses(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      class_type: string;
      start_time: string;
      duration_min: number;
      capacity: number;
      weekdays: number[];
      from_date: string;
      to_date?: string;
      open_ended?: boolean;
      coach_id?: string | null;
      branch_id?: string | null;
      assignment_lead_min?: number;
    }) => (await api.post(`/gym/${gymId}/classes/recurring`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

export function useUpdateClass(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      body,
    }: {
      classId: string;
      body: Partial<{
        coach: string | null;
        assignment_lead_min: number;
        pay_extra: boolean;
        extra_amount: string | number;
        branch: string | null;
      }>;
    }) => (await api.patch(`/gym/${gymId}/classes/${classId}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

export function useCancelClass(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (classId: string) =>
      (await api.post(`/gym/${gymId}/classes/${classId}/cancel`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

export function useDeleteClass(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (classId: string) =>
      (await api.delete(`/gym/${gymId}/classes/${classId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

// --- Servicios / tipos de clase (catálogo) ---
export function useServiceTypes(gymId: string) {
  return useQuery({
    queryKey: ["service-types", gymId],
    queryFn: () => getList<ServiceType>(`/gym/${gymId}/service-types`),
    enabled: !!gymId,
  });
}

export function useCreateServiceType(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ServiceType>) =>
      (await api.post<ServiceType>(`/gym/${gymId}/service-types`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-types", gymId] }),
  });
}

export function useUpdateServiceType(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ServiceType> }) =>
      (await api.patch<ServiceType>(`/gym/${gymId}/service-types/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-types", gymId] }),
  });
}

/** Sube/reemplaza la foto de portada de un servicio (PATCH multipart). */
export function useUploadServiceTypePhoto(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("photo", file);
      return (
        await api.patch<ServiceType>(`/gym/${gymId}/service-types/${id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-types", gymId] }),
  });
}

export function useDeleteServiceType(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/gym/${gymId}/service-types/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-types", gymId] }),
  });
}

// --- Drop-ins / pases (gestionados por cada gym desde su panel) ---
export function useGymDropinProducts(gymId: string) {
  return useQuery({
    queryKey: ["dropin-products", gymId],
    queryFn: () => getList<DropinProduct>(`/gym/${gymId}/dropin-products`),
    enabled: !!gymId,
  });
}

export function useCreateDropinProduct(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<DropinProduct>) =>
      (await api.post<DropinProduct>(`/gym/${gymId}/dropin-products`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dropin-products", gymId] }),
  });
}

export function useUpdateDropinProduct(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<DropinProduct> }) =>
      (await api.patch<DropinProduct>(`/gym/${gymId}/dropin-products/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dropin-products", gymId] }),
  });
}

export function useDeactivateDropinProduct(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/gym/${gymId}/dropin-products/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dropin-products", gymId] }),
  });
}

// --- Horario semanal (plantillas) ---
export function useSchedules(gymId: string) {
  return useQuery({
    queryKey: ["schedules", gymId],
    queryFn: () => getList<ClassSchedule>(`/gym/${gymId}/schedules`),
    enabled: !!gymId,
  });
}

export function useCreateSchedule(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ClassSchedule>) =>
      (await api.post<ClassSchedule>(`/gym/${gymId}/schedules`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-classes", gymId] });
    },
  });
}

export function useUpdateSchedule(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ClassSchedule> }) =>
      (await api.patch<ClassSchedule>(`/gym/${gymId}/schedules/${id}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-classes", gymId] });
    },
  });
}

export function useDeleteSchedule(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/gym/${gymId}/schedules/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-classes", gymId] });
    },
  });
}

export function useMaterializeSchedules(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post<{ materialized: number }>(`/gym/${gymId}/schedules/materialize`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

// --- WOD y board ---
export function useWods(gymId: string, date?: string) {
  const q = date ? `?date=${date}` : "";
  return useQuery({
    queryKey: ["wods", gymId, date ?? ""],
    queryFn: () => getList<Wod>(`/gym/${gymId}/wods${q}`),
    enabled: !!gymId,
  });
}

export function useCreateWod(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Wod>) =>
      (await api.post<Wod>(`/gym/${gymId}/wods`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wods", gymId] });
      // El pendiente "clases sin rutina (próx. 48h)" baja al publicar el WOD.
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useUpdateWod(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Wod> }) =>
      (await api.patch<Wod>(`/gym/${gymId}/wods/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wods", gymId] }),
  });
}

export function useDeleteWod(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/gym/${gymId}/wods/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wods", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useWodBoard(gymId: string, wodId: string, classId?: string) {
  const q = classId ? `?class_id=${classId}` : "";
  return useQuery({
    queryKey: ["wod-board", gymId, wodId, classId ?? ""],
    queryFn: async () =>
      (await api.get<WodResult[]>(`/gym/${gymId}/wods/${wodId}/results${q}`)).data,
    enabled: !!gymId && !!wodId,
  });
}

export function useAddWodResult(gymId: string, wodId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      athlete_id: string;
      raw_score: string;
      scaling: string;
      gym_class_id?: string | null;
      notes?: string;
    }) => (await api.post<WodResult>(`/gym/${gymId}/wods/${wodId}/results`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wod-board", gymId, wodId] }),
  });
}

// --- Coaches y liquidaciones ---
export function useGymCoaches(gymId: string) {
  return useQuery({
    queryKey: ["gym-coaches", gymId],
    queryFn: () => getList<Coach>(`/gym/${gymId}/coaches`),
    enabled: !!gymId,
  });
}

export function useUpdateCoach(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      staffId,
      body,
    }: {
      staffId: string;
      body: Partial<{
        pay_type: "per_class" | "fixed";
        per_class_rate: string | number;
        fixed_amount: string | number;
        is_active: boolean;
        offers_pt: boolean;
        pt_price: string | number;
        pt_commission_pct: string | number;
      }>;
    }) => (await api.patch(`/gym/${gymId}/coaches/${staffId}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-coaches", gymId] }),
  });
}

export function useCoachPayouts(gymId: string) {
  return useQuery({
    queryKey: ["coach-payouts", gymId],
    queryFn: () => getList<CoachPayout>(`/gym/${gymId}/coach-payouts`),
    enabled: !!gymId,
  });
}

export function useGeneratePayout(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { period_start: string; period_end: string; coach_id?: string | null }) =>
      (await api.post<CoachPayout[]>(`/gym/${gymId}/coach-payouts/generate`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-payouts", gymId] }),
  });
}

export function usePayPayout(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payoutId: string) =>
      (await api.post(`/gym/${gymId}/coach-payouts/${payoutId}/pay`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-payouts", gymId] }),
  });
}

// --- Onboarding de coaches ---
export function useInviteCoach(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; first_name?: string; last_name?: string; phone?: string }) =>
      (await api.post<CoachRequest>(`/gym/${gymId}/coach-invitations`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-requests", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-coaches", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useCoachRequests(gymId: string, status = "pending") {
  return useQuery({
    queryKey: ["coach-requests", gymId, status],
    queryFn: () => getList<CoachRequest>(`/gym/${gymId}/coach-requests?status=${status}`),
    enabled: !!gymId,
  });
}

export function useDecideCoachRequest(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "approve" | "reject" }) =>
      (await api.post(`/gym/${gymId}/coach-requests/${requestId}/${action}`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-requests", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-coaches", gymId] });
      // Aprobar/rechazar un coach baja el pendiente "coaches por aprobar".
      invalidarPendientes(qc, gymId);
      // Un coach nuevo puede cubrir clases sin coach → refresca la agenda.
      qc.invalidateQueries({ queryKey: ["gym-classes", gymId] });
    },
  });
}

export function useGymClubs(gymId: string) {
  return useQuery({
    queryKey: ["gym-clubs", gymId],
    queryFn: () => getList<GymClub>(`/gym/${gymId}/clubs`),
    enabled: !!gymId,
  });
}

/**
 * Aprueba o rechaza la solicitud de club. `note` (≤255) es OPCIONAL: si va vacía
 * el atleta igual recibe un motivo legible en `/me/club-requests`.
 */
export function useDecideClub(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clubId,
      decision,
      note,
    }: {
      clubId: string;
      decision: "approve" | "reject";
      note?: string;
    }) =>
      (await api.post<GymClub>(`/gym/${gymId}/clubs/${clubId}/decide`, { decision, note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-clubs", gymId] });
      invalidarPendientes(qc, gymId);
      // Aprobar un club puede darle el rol club_admin al solicitante: relee /me
      // para que el menú "Mi club" aparezca sin volver a iniciar sesión.
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// El admin crea un club propio (queda aprobado de una vez).
export function useCreateGymClub(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; club_type: string }) =>
      (await api.post<GymClub>(`/gym/${gymId}/clubs/create`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-clubs", gymId] });
      invalidarPendientes(qc, gymId);
      // El creador queda como admin del club: relee /me para que aparezca el
      // menú "Mi club" en cuanto el backend cree su rol club_admin.
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useCreateClass(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      class_type: string;
      starts_at: string;
      duration_min: number;
      capacity: number;
    }) => (await api.post<GymClass>(`/gym/${gymId}/classes`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

export function useClassCheckins(gymId: string, classId: string) {
  return useQuery({
    queryKey: ["class-checkins", gymId, classId],
    queryFn: async () =>
      (await api.get<GymCheckin[]>(`/gym/${gymId}/classes/${classId}/checkins`)).data,
    enabled: !!gymId && !!classId,
  });
}

export interface ClassQr {
  id: string;
  gym_name?: string;
  class_type: string;
  starts_at: string;
  qr_token: string;
}

/** QR de asistencia de una clase (para mostrarlo/enviarlo desde el panel). */
export function useClassQr(gymId: string, classId: string) {
  return useQuery({
    queryKey: ["class-qr", gymId, classId],
    queryFn: async () => (await api.get<ClassQr>(`/gym/${gymId}/classes/${classId}/qr`)).data,
    enabled: !!gymId && !!classId,
  });
}

/**
 * Credencial con la que recepción marca presente a alguien: EXACTAMENTE una.
 * `membershipId` = socio del gym; `dropinPurchaseId` = visitante con pase drop-in
 * (antes no había forma de anotarlo: el gym le cobraba y no le quedaba registro
 * de que entró). Mandar las dos, o ninguna, es 400 `checkin_invalid`. Qué pase se
 * consume lo decide el backend, nunca el panel.
 */
export type CredencialCheckin = { membershipId?: string; dropinPurchaseId?: string };

export function useReceptionCheckin(gymId: string, classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credencial: string | CredencialCheckin) => {
      const body =
        typeof credencial === "string"
          ? { membership_id: credencial }
          : credencial.dropinPurchaseId
            ? { dropin_purchase_id: credencial.dropinPurchaseId }
            : { membership_id: credencial.membershipId };
      return (await api.post<GymCheckin>(`/gym/${gymId}/classes/${classId}/checkins`, body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-checkins", gymId, classId] });
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId] });
    },
  });
}

export function useAuditLogs(gymId: string) {
  return useQuery({
    queryKey: ["audit", gymId],
    queryFn: () => getList<AuditLog>(`/gym/${gymId}/audit`),
    enabled: !!gymId,
  });
}

export function useExportAudit(gymId: string) {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get(`/gym/${gymId}/audit/export`, {
        responseType: "blob",
      });
      const href = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = href;
      link.download = "auditoria-nucleo.csv";
      link.click();
      URL.revokeObjectURL(href);
    },
  });
}

export function usePlatformGyms(enabled: boolean) {
  return useQuery({
    queryKey: ["platform-gyms"],
    queryFn: () => getList<GymAdmin>("/platform/gyms"),
    enabled,
  });
}

/**
 * Alta COMPLETA de un gimnasio: crea el gym, su suscripción SaaS, un plan
 * vendible y (si se manda correo) su `gym_admin`. Sustituyó al alta a medias
 * `POST /platform/gyms {name, location_text}`, que dejaba un gimnasio sin
 * suscripción, sin plan que vender y sin nadie que pudiera entrar a su panel.
 * La respuesta trae el gym más el resumen de lo que se creó a su alrededor.
 */
export function useCrearGimnasioCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AltaGimnasio) =>
      (await api.post<GymCreado>("/platform/gyms", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-gyms"] }),
  });
}

/**
 * Suspende o reactiva el gimnasio. `is_active` solo lo mueve PLATAFORMA: el
 * serializer lo pone read-only para cualquiera que no sea superadmin, así que un
 * PATCH del propio gym lo ignora en silencio.
 */
export function useSetGymActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gymId, is_active }: { gymId: string; is_active: boolean }) =>
      (await api.patch<GymAdmin>(`/gym/${gymId}`, { is_active })).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["platform-gyms"] });
      qc.invalidateQueries({ queryKey: ["gym-config", vars.gymId] });
    },
  });
}

/** Administradores (`gym_admin`) del gimnasio. Solo los de ESE gym. */
export function useGymAdmins(gymId: string) {
  return useQuery({
    queryKey: ["gym-admins", gymId],
    queryFn: async () => (await api.get<GymStaffAdmin[]>(`/gym/${gymId}/admins`)).data,
    enabled: !!gymId,
  });
}

/**
 * Invita (o reactiva) a un `gym_admin`. Idempotente por identidad: si el correo
 * ya existe reutiliza la persona en vez de duplicar el atleta.
 */
export function useInviteGymAdmin(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    }) => (await api.post<GymStaffAdmin>(`/gym/${gymId}/admins`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-admins", gymId] }),
  });
}

export function useUpdatePlatformGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gymId,
      body,
    }: {
      gymId: string;
      body: {
        saas_plan: string;
        platform_commission_pct: string;
        fixed_fee: string | null;
        is_public: boolean;
      };
    }) => (await api.patch<GymAdmin>(`/gym/${gymId}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-gyms"] }),
  });
}

/** Config editable del gym por su propio admin (ej. reservas de clases futuras). */
type GymConfig = GymAdmin;

export function useGymConfig(gymId: string) {
  return useQuery({
    queryKey: ["gym-config", gymId],
    queryFn: async () => (await api.get<GymConfig>(`/gym/${gymId}`)).data,
    enabled: !!gymId,
  });
}

/**
 * Config editable por el ADMIN DEL GYM. `platform_commission_pct`, `fixed_fee` y
 * `saas_plan` NO están aquí a propósito: son de plataforma y un PATCH del gym los
 * ignora en silencio (para eso está `useUpdatePlatformGym`).
 */
export function useUpdateGymConfig(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      allow_future_reservations?: boolean;
      /** Días sin asistir a ESTE gym para marcar "en riesgo" (1..365). */
      risk_inactivity_days?: number;
      /**
       * Días de mora tolerados antes del corte automático (1..365, def. 30).
       * Fuera de rango el backend responde 400 `{detail, code, message}`.
       */
      overdue_grace_days?: number;
    }) => (await api.patch<GymConfig>(`/gym/${gymId}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-config", gymId] });
      // El umbral de riesgo redefine quién sale en retención y en el badge.
      qc.invalidateQueries({ queryKey: ["at-risk", gymId] });
      // La gracia de morosidad redefine QUIÉN está moroso: cambia la bandeja de
      // morosos, el listado de membresías que lo pinta y el contador del badge.
      qc.invalidateQueries({ queryKey: ["overdue", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useGymFeed(gymId: string) {
  return useQuery({
    queryKey: ["gym-feed", gymId],
    queryFn: () => getList<FeedItem>(`/gym/${gymId}/feed`),
    enabled: !!gymId,
  });
}

export function useAthleteOfMonth(gymId: string) {
  return useQuery({
    queryKey: ["athlete-of-month", gymId],
    queryFn: async () => {
      try {
        const { data } = await api.get<AthleteOfMonth>(`/gym/${gymId}/athlete-of-month`);
        return data;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          (error as { response?: { status?: number } }).response?.status === 204
        ) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!gymId,
  });
}

export function useComputeAthleteOfMonth(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post<AthleteOfMonth>(`/gym/${gymId}/athlete-of-month/compute`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athlete-of-month", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-feed", gymId] });
    },
  });
}

export function useAthletesOfMonth(gymId: string) {
  return useQuery({
    queryKey: ["athletes-of-month", gymId],
    queryFn: () => getList<AthleteOfMonth>(`/gym/${gymId}/athletes-of-month`),
    enabled: !!gymId,
  });
}

/** Histórico completo de atletas del mes (todos los períodos, recientes primero). */
export function useAthletesOfMonthHistory(gymId: string) {
  return useQuery({
    queryKey: ["athletes-of-month", gymId, "history"],
    queryFn: () => getList<AthleteOfMonth>(`/gym/${gymId}/athletes-of-month?period=all`),
    enabled: !!gymId,
  });
}

export function useSetAthleteOfMonth(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { class_type: string; athlete_id: string | null }) =>
      (await api.post(`/gym/${gymId}/athletes-of-month/set`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes-of-month", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-feed", gymId] });
    },
  });
}

export function usePostAnnouncement(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      class_type?: string;
      photo?: File | null;
      video?: File | null;
    }) => {
      const form = new FormData();
      form.append("title", input.title);
      form.append("body", input.body);
      if (input.class_type) form.append("class_type", input.class_type);
      if (input.photo) form.append("photo", input.photo);
      if (input.video) form.append("video", input.video);
      return (await api.post(`/gym/${gymId}/announcements`, form)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-feed", gymId] }),
  });
}

// --- Perfil y anuncios del propio club (rol club_admin) ---

/** Ficha editable del club. `is_public`/`status` los decide el gym, no el club. */
export function useClubAdminProfile(clubId: string) {
  return useQuery({
    queryKey: ["club-admin-profile", clubId],
    queryFn: async () => (await api.get<ClubProfileEditable>(`/club/${clubId}/profile`)).data,
    enabled: !!clubId,
  });
}

export function useUpdateClubAdminProfile(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name?: string;
      club_type?: string;
      description?: string;
      photo?: File | null;
    }) => {
      if (input.photo) {
        const form = new FormData();
        if (input.name) form.append("name", input.name);
        if (input.club_type) form.append("club_type", input.club_type);
        if (input.description != null) form.append("description", input.description);
        form.append("photo", input.photo);
        return (
          await api.patch<ClubProfileEditable>(`/club/${clubId}/profile`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        ).data;
      }
      const { photo: _sin, ...body } = input;
      return (await api.patch<ClubProfileEditable>(`/club/${clubId}/profile`, body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-admin-profile", clubId] });
      // El nombre del club aparece también en el listado del gym.
      qc.invalidateQueries({ queryKey: ["gym-clubs"] });
    },
  });
}

export function useClubAdminAnnouncements(clubId: string) {
  return useQuery({
    queryKey: ["club-admin-announcements", clubId],
    queryFn: () => getList<ClubAnnouncement>(`/club/${clubId}/announcements`),
    enabled: !!clubId,
  });
}

/** Publica un anuncio del club y NOTIFICA a sus miembros. */
export function useClubAdminCreateAnnouncement(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; body: string; photo?: File | null }) => {
      const form = new FormData();
      form.append("title", input.title);
      form.append("body", input.body);
      if (input.photo) form.append("photo", input.photo);
      return (
        await api.post<ClubAnnouncement>(`/club/${clubId}/announcements`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["club-admin-announcements", clubId] }),
  });
}

export function useClubAdminDeleteAnnouncement(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/club/${clubId}/announcements/${id}`)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["club-admin-announcements", clubId] }),
  });
}

export function useClubAdminChallenges(clubId: string) {
  return useQuery({
    queryKey: ["club-admin-challenges", clubId],
    queryFn: () => getList<import("./types").ClubChallenge>(`/club/${clubId}/challenges`),
    enabled: !!clubId,
  });
}

export function useClubAdminCreateChallenge(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      metric: string;
      target_value: string;
      starts_at: string;
      ends_at: string;
      points_reward?: number;
    }) => (await api.post(`/club/${clubId}/challenges`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-admin-challenges", clubId] }),
  });
}

export function useClubAdminPendingSubmissions(clubId: string, challengeId?: string) {
  const q = challengeId ? `?challenge_id=${challengeId}` : "";
  return useQuery({
    queryKey: ["club-admin-submissions", clubId, challengeId ?? ""],
    queryFn: async () => {
      const { data } = await api.get<import("./types").ClubChallengeSubmission[]>(
        `/club/${clubId}/challenge-submissions${q}`,
      );
      return data;
    },
    enabled: !!clubId,
  });
}

export function useClubAdminReviewSubmission(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      action,
      note,
    }: {
      submissionId: string;
      action: "approve" | "reject";
      note?: string;
    }) =>
      (
        await api.post(`/club/${clubId}/challenge-submissions/${submissionId}/review`, {
          action,
          note,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-admin-submissions", clubId] });
      qc.invalidateQueries({ queryKey: ["club-admin-challenges", clubId] });
      qc.invalidateQueries({ queryKey: ["club-admin-challenge-board"] });
    },
  });
}

export function useClubAdminChallengeLeaderboard(clubId: string, challengeId: string) {
  return useQuery({
    queryKey: ["club-admin-challenge-board", clubId, challengeId],
    queryFn: async () => {
      const { data } = await api.get<import("./types").ClubChallengeLeaderboardRow[]>(
        `/club/${clubId}/challenges/${challengeId}/leaderboard`,
      );
      return data;
    },
    enabled: !!clubId && !!challengeId,
  });
}

export function useClubAdminActivities(clubId: string) {
  return useQuery({
    queryKey: ["club-admin-activities", clubId],
    queryFn: () => getList<import("./types").ClubActivityAdmin>(`/club/${clubId}/activities`),
    enabled: !!clubId,
  });
}

export function useClubAdminCreateActivity(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      starts_at: string;
      location?: string;
      is_free?: boolean;
      capacity?: number;
    }) => (await api.post(`/club/${clubId}/activities`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-admin-activities", clubId] }),
  });
}

export function useClubAdminRsvps(clubId: string, activityId: string) {
  return useQuery({
    queryKey: ["club-admin-rsvps", clubId, activityId],
    queryFn: () =>
      getList<import("./types").ClubActivityRsvpRow>(
        `/club/${clubId}/activities/${activityId}/rsvps`,
      ),
    enabled: !!clubId && !!activityId,
  });
}

export function useClubAdminConfirm(clubId: string, activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (athleteId: string) =>
      api.post(`/club/${clubId}/activities/${activityId}/confirm`, { athlete_id: athleteId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-admin-rsvps", clubId, activityId] });
      qc.invalidateQueries({ queryKey: ["club-admin-activities", clubId] });
    },
  });
}

// --- Sucursales (multi-sede) ---
export function useBranches(gymId: string) {
  return useQuery({
    queryKey: ["branches", gymId],
    queryFn: () => getList<ErpBranch>(`/gym/${gymId}/branches`),
    enabled: !!gymId,
  });
}

export function useCreateBranch(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; location_text?: string }) =>
      (await api.post<ErpBranch>(`/gym/${gymId}/branches`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", gymId] }),
  });
}

export function useUpdateBranch(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { name?: string; location_text?: string } }) =>
      (await api.patch<ErpBranch>(`/gym/${gymId}/branches/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", gymId] }),
  });
}

export function useDeleteBranch(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/gym/${gymId}/branches/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", gymId] }),
  });
}

// --- ERP (§18) ---
export function useErpProducts(gymId: string) {
  return useQuery({
    queryKey: ["erp-products", gymId],
    queryFn: () => getList<ErpProduct>(`/gym/${gymId}/erp/products`),
    enabled: !!gymId,
  });
}

export function useCreateErpProduct(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      category: string;
      sale_price: string;
      cost_price: string;
      reorder_level?: number;
      sku?: string;
      // Tienda de la app
      show_in_marketplace?: boolean;
      description?: string;
      sizes?: string[];
      colors?: string[];
      delivery_days?: number;
      is_upcoming?: boolean;
      launch_date?: string | null;
      // Receta (preparados/licuados): insumos a descontar al vender.
      components?: { component: string; qty: number }[];
    }) => (await api.post<ErpProduct>(`/gym/${gymId}/erp/products`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
  });
}

export function useUpdateErpProduct(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ErpProduct> }) =>
      (await api.patch<ErpProduct>(`/gym/${gymId}/erp/products/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
  });
}

export function useDeleteErpProduct(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/gym/${gymId}/erp/products/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
  });
}

/** Sube/reemplaza la foto de un producto (PATCH multipart). */
export function useUploadProductPhoto(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("photo", file);
      return (
        await api.patch<ErpProduct>(`/gym/${gymId}/erp/products/${id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
  });
}

/** Sube VARIAS imágenes a la galería de un producto (multipart, campo 'images'). */
export function useUploadProductImages(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
      const form = new FormData();
      for (const f of files) form.append("images", f);
      return (
        await api.post<ErpProduct>(`/gym/${gymId}/erp/products/${id}/images`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
  });
}

/** Elimina una imagen de la galería de un producto. */
export function useDeleteProductImage(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, imageId }: { id: string; imageId: string }) =>
      (await api.delete(`/gym/${gymId}/erp/products/${id}/images/${imageId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
  });
}

// --- Pedidos de la tienda (marketplace de la app) ---

/**
 * Pedidos del gym. Sin paginación (tope 300, `-created_at`).
 * `return_status` convierte la lista en la BANDEJA DE DEVOLUCIONES.
 */
export function useGymProductOrders(
  gymId: string,
  filtro?: { status?: ProductOrderStatus; return_status?: Exclude<ReturnStatus, ""> },
) {
  const qs = new URLSearchParams();
  if (filtro?.status) qs.set("status", filtro.status);
  if (filtro?.return_status) qs.set("return_status", filtro.return_status);
  const query = qs.toString();
  return useQuery({
    queryKey: ["marketplace-orders", gymId, filtro?.status ?? "", filtro?.return_status ?? ""],
    queryFn: async () =>
      (
        await api.get<ProductOrder[]>(
          `/gym/${gymId}/marketplace-orders${query ? `?${query}` : ""}`,
        )
      ).data,
    enabled: !!gymId,
  });
}

/** Invalida todo lo que toca un pedido: bandejas, stock y badge de pendientes. */
function invalidarPedidos(qc: QueryClient, gymId: string) {
  qc.invalidateQueries({ queryKey: ["marketplace-orders", gymId] });
  qc.invalidateQueries({ queryKey: ["erp-products", gymId] });
  qc.invalidateQueries({ queryKey: ["erp-valuation", gymId] });
  invalidarPendientes(qc, gymId);
}

/**
 * Avanza el seguimiento del pedido (preparar → enviar → entregar) o lo cancela.
 * `tracking_code` acompaña al envío. 400 `order_transition_invalid` si la
 * transición no es válida (p. ej. shipped → preparing): la máquina de estados
 * vive en el backend; el panel solo la pide.
 */
export function useUpdateProductOrder(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      tracking_code,
      note,
    }: {
      id: string;
      status: "preparing" | "shipped" | "delivered" | "cancelled";
      /** Guía/rastreo del envío (≤60). */
      tracking_code?: string;
      /** Nota del hito, visible en la línea de tiempo del atleta (≤255). */
      note?: string;
    }) =>
      (
        await api.patch<ProductOrder>(`/gym/${gymId}/marketplace-orders/${id}`, {
          status,
          tracking_code,
          note,
        })
      ).data,
    onSuccess: () => invalidarPedidos(qc, gymId),
  });
}

// Devuelve un pedido pagado: reembolsa la base (sin el recargo de Nucleo), REGRESA
// EL STOCK al inventario y lo deja en "cancelled".
export function useRefundProductOrder(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) =>
      (await api.post<ProductOrder>(`/gym/${gymId}/marketplace-orders/${orderId}/refund`)).data,
    onSuccess: () => {
      invalidarPedidos(qc, gymId);
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
      qc.invalidateQueries({ queryKey: ["payments", gymId] });
    },
  });
}

/**
 * Aprueba la devolución que pidió el atleta: reembolso + stock de vuelta y el
 * pedido queda en "returned". 400 `return_invalid` si no hay una pendiente.
 */
export function useApproveOrderReturn(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (
        await api.post<ProductOrder>(`/gym/${gymId}/marketplace-orders/${id}/return/approve`, {
          reason: reason ?? "",
        })
      ).data,
    onSuccess: () => {
      invalidarPedidos(qc, gymId);
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
      qc.invalidateQueries({ queryKey: ["payments", gymId] });
    },
  });
}

/** Rechaza la devolución. El pedido CONSERVA su estado de entrega. */
export function useRejectOrderReturn(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (
        await api.post<ProductOrder>(`/gym/${gymId}/marketplace-orders/${id}/return/reject`, {
          reason: reason ?? "",
        })
      ).data,
    onSuccess: () => invalidarPedidos(qc, gymId),
  });
}

/** Condiciones de envío de la tienda (panel: cualquier rol del gym las lee). */
export function useGymShippingConfig(gymId: string) {
  return useQuery({
    queryKey: ["marketplace-shipping", gymId],
    queryFn: async () =>
      (await api.get<ShippingInfo>(`/gym/${gymId}/marketplace/shipping`)).data,
    enabled: !!gymId,
  });
}

/** Guarda las condiciones de envío (solo gym_admin; si no, 403 `forbidden`). */
export function useUpdateGymShippingConfig(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      enabled: boolean;
      cost: string;
      free_over: string | null;
      eta_days: number;
      note: string;
    }) => (await api.put<ShippingInfo>(`/gym/${gymId}/marketplace/shipping`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-shipping", gymId] }),
  });
}

export function useCreateErpMovement(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      product_id: string;
      type: "purchase" | "adjustment" | "loss";
      qty: number;
      unit_cost?: string;
      note?: string;
    }) => (await api.post<ErpMovement>(`/gym/${gymId}/erp/inventory/movements`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["erp-products", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
      // Mover el ledger de inventario cambia el valor del stock.
      qc.invalidateQueries({ queryKey: ["erp-valuation", gymId] });
    },
  });
}

export function useErpSales(gymId: string) {
  return useQuery({
    queryKey: ["erp-sales", gymId],
    queryFn: () => getList<ErpSale>(`/gym/${gymId}/erp/sales`),
    enabled: !!gymId,
  });
}

export function useCreateErpSale(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      athlete_id?: string | null;
      branch_id?: string | null;
      method: "cash" | "card" | "bank_transfer";
      note?: string;
      lines: { product_id: string; qty: number }[];
    }) => (await api.post<ErpSale>(`/gym/${gymId}/erp/sales`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["erp-sales", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-products", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
      // Mover el ledger de inventario cambia el valor del stock.
      qc.invalidateQueries({ queryKey: ["erp-valuation", gymId] });
    },
  });
}

/** Devolución (total o parcial) de una venta POS: regresa stock + reembolso. */
export function useReturnErpSale(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; items?: { product_id: string; qty: number }[] }) =>
      (
        await api.post<ErpSale>(`/gym/${gymId}/erp/sales/${vars.id}/return`, {
          items: vars.items ?? [],
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["erp-sales", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-products", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
      // Mover el ledger de inventario cambia el valor del stock.
      qc.invalidateQueries({ queryKey: ["erp-valuation", gymId] });
    },
  });
}

// --- Gastos (histórico inmutable: se anulan o se corrigen, NUNCA se editan) ---

/** Filtros del listado. `voided` sin valor = vienen todos (anulados incluidos). */
export type FiltroGastos = { voided?: boolean; category?: ExpenseCategoryInput };

export function useErpExpenses(gymId: string, filtro?: FiltroGastos) {
  const qs = new URLSearchParams();
  if (filtro?.voided != null) qs.set("voided", String(filtro.voided));
  if (filtro?.category) qs.set("category", filtro.category);
  const query = qs.toString();
  return useQuery({
    queryKey: ["erp-expenses", gymId, filtro?.voided ?? "todos", filtro?.category ?? ""],
    queryFn: () =>
      getList<ErpExpense>(`/gym/${gymId}/erp/expenses${query ? `?${query}` : ""}`),
    enabled: !!gymId,
  });
}

/** Ficha de un gasto. No hay PUT/PATCH/DELETE: son 405 a propósito. */
export function useErpExpense(gymId: string, expenseId: string) {
  return useQuery({
    queryKey: ["erp-expense", gymId, expenseId],
    queryFn: async () =>
      (await api.get<ErpExpense>(`/gym/${gymId}/erp/expenses/${expenseId}`)).data,
    enabled: !!gymId && !!expenseId,
  });
}

/** Un gasto mueve el OPEX y por tanto la utilidad: siempre refresca el P&L. */
function invalidarGastos(qc: QueryClient, gymId: string) {
  qc.invalidateQueries({ queryKey: ["erp-expenses", gymId] });
  qc.invalidateQueries({ queryKey: ["erp-expense", gymId] });
  qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
}

/** Registra un gasto. Con `proof_file` viaja multipart. `amount<=0` es 400. */
export function useCreateErpExpense(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      branch?: string | null;
      category: ExpenseCategoryInput;
      amount: string;
      description?: string;
      incurred_on: string;
      proof_url?: string;
      proof_file?: File;
    }) => {
      if (!body.proof_file) {
        const { proof_file: _sin, ...json } = body;
        return (await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses`, json)).data;
      }
      const form = new FormData();
      form.append("category", body.category);
      form.append("amount", body.amount);
      form.append("incurred_on", body.incurred_on);
      if (body.branch) form.append("branch", body.branch);
      if (body.description) form.append("description", body.description);
      if (body.proof_url) form.append("proof_url", body.proof_url);
      form.append("proof_file", body.proof_file);
      return (
        await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => invalidarGastos(qc, gymId),
  });
}

/** Anula un gasto mal capturado (no se borra: queda con motivo y fecha). */
export function useVoidErpExpense(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (
        await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses/${id}/void`, {
          reason: reason ?? "",
        })
      ).data,
    onSuccess: () => invalidarGastos(qc, gymId),
  });
}

/**
 * Corrige un gasto: anula el original y devuelve el gasto NUEVO que lo sustituye
 * (`replaces` apunta al viejo). Solo se mandan los campos que cambian; el resto
 * se hereda. 400 si el gasto ya está anulado o ya fue corregido.
 */
export function useCorrectErpExpense(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...cambios
    }: {
      id: string;
      category?: ExpenseCategoryInput;
      amount?: string;
      description?: string;
      incurred_on?: string;
      branch?: string | null;
      proof_url?: string;
      proof_file?: File;
    }) => {
      if (!cambios.proof_file) {
        const { proof_file: _sin, ...json } = cambios;
        return (await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses/${id}/correct`, json))
          .data;
      }
      const form = new FormData();
      if (cambios.category) form.append("category", cambios.category);
      if (cambios.amount) form.append("amount", cambios.amount);
      if (cambios.description != null) form.append("description", cambios.description);
      if (cambios.incurred_on) form.append("incurred_on", cambios.incurred_on);
      if (cambios.branch) form.append("branch", cambios.branch);
      if (cambios.proof_url) form.append("proof_url", cambios.proof_url);
      form.append("proof_file", cambios.proof_file);
      return (
        await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses/${id}/correct`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => invalidarGastos(qc, gymId),
  });
}

/** Adjunta el comprobante (factura/recibo) de un gasto ya registrado. */
export function useUploadExpenseProof(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("proof_file", file);
      return (
        await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses/${id}/proof`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => invalidarGastos(qc, gymId),
  });
}

// --- Proveedores ---
export function useErpSuppliers(
  gymId: string,
  filtro?: { is_active?: boolean; search?: string },
) {
  const qs = new URLSearchParams();
  if (filtro?.is_active != null) qs.set("is_active", String(filtro.is_active));
  if (filtro?.search) qs.set("search", filtro.search);
  const query = qs.toString();
  return useQuery({
    queryKey: ["erp-suppliers", gymId, filtro?.is_active ?? "", filtro?.search ?? ""],
    queryFn: () =>
      getList<ErpSupplier>(`/gym/${gymId}/erp/suppliers${query ? `?${query}` : ""}`),
    enabled: !!gymId,
  });
}

export function useCreateErpSupplier(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      contact_name?: string;
      phone?: string;
      email?: string;
      tax_id?: string;
      notes?: string;
    }) => (await api.post<ErpSupplier>(`/gym/${gymId}/erp/suppliers`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-suppliers", gymId] }),
  });
}

export function useUpdateErpSupplier(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ErpSupplier> }) =>
      (await api.patch<ErpSupplier>(`/gym/${gymId}/erp/suppliers/${id}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["erp-suppliers", gymId] });
      // El nombre del proveedor viaja denormalizado en cada orden de compra.
      qc.invalidateQueries({ queryKey: ["erp-purchase-orders", gymId] });
    },
  });
}

/** Baja del proveedor (soft-delete: sale del listado, sus órdenes se conservan). */
export function useDeleteErpSupplier(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/gym/${gymId}/erp/suppliers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-suppliers", gymId] }),
  });
}

// --- Órdenes de compra ---
export function useErpPurchaseOrders(
  gymId: string,
  filtro?: { status?: PurchaseOrderStatus; supplier?: string },
) {
  const qs = new URLSearchParams();
  if (filtro?.status) qs.set("status", filtro.status);
  if (filtro?.supplier) qs.set("supplier", filtro.supplier);
  const query = qs.toString();
  return useQuery({
    queryKey: ["erp-purchase-orders", gymId, filtro?.status ?? "", filtro?.supplier ?? ""],
    queryFn: () =>
      getList<ErpPurchaseOrder>(`/gym/${gymId}/erp/purchase-orders${query ? `?${query}` : ""}`),
    enabled: !!gymId,
  });
}

export function useErpPurchaseOrder(gymId: string, orderId: string) {
  return useQuery({
    queryKey: ["erp-purchase-order", gymId, orderId],
    queryFn: async () =>
      (await api.get<ErpPurchaseOrder>(`/gym/${gymId}/erp/purchase-orders/${orderId}`)).data,
    enabled: !!gymId && !!orderId,
  });
}

/** Crea la orden. Un proveedor de OTRO gym es 404 (aislamiento por gym). */
export function useCreateErpPurchaseOrder(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      supplier_id: string;
      branch_id?: string | null;
      status?: "draft" | "ordered";
      reference?: string;
      expected_on?: string;
      ordered_on?: string;
      note?: string;
      lines: { product_id: string; qty: number; unit_cost?: string }[];
    }) => (await api.post<ErpPurchaseOrder>(`/gym/${gymId}/erp/purchase-orders`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-purchase-orders", gymId] }),
  });
}

/**
 * Recibe la orden (total o parcial): CARGA EL STOCK con su costo real. `items`
 * vacío = todo lo pendiente. 400 si la orden está cerrada/anulada o si se pide
 * más de lo ordenado.
 */
export function useReceiveErpPurchaseOrder(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
      update_cost,
      note,
    }: {
      id: string;
      items?: { line_id: string; qty: number }[];
      update_cost?: boolean;
      note?: string;
    }) =>
      (
        await api.post<ErpPurchaseOrder>(`/gym/${gymId}/erp/purchase-orders/${id}/receive`, {
          items: items ?? [],
          update_cost: update_cost ?? true,
          note: note ?? "",
        })
      ).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["erp-purchase-orders", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-purchase-order", gymId, vars.id] });
      // Recibir mueve el ledger de inventario: stock, valuación y P&L.
      qc.invalidateQueries({ queryKey: ["erp-products", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-valuation", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
    },
  });
}

/** Anula la orden (o su pendiente). Lo ya recibido NO se revierte aquí. */
export function useCancelErpPurchaseOrder(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (
        await api.post<ErpPurchaseOrder>(`/gym/${gymId}/erp/purchase-orders/${id}/cancel`, {
          reason: reason ?? "",
        })
      ).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["erp-purchase-orders", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-purchase-order", gymId, vars.id] });
    },
  });
}

/** Valuación del inventario (valor, capital dormido, rotación). No paginada. */
export function useErpInventoryValuation(gymId: string, days = 90) {
  return useQuery({
    queryKey: ["erp-valuation", gymId, days],
    queryFn: async () =>
      (
        await api.get<InventoryValuation>(
          `/gym/${gymId}/erp/reports/inventory-valuation?days=${days}`,
        )
      ).data,
    enabled: !!gymId,
  });
}

export function useErpPnl(gymId: string, from: string, to: string, branch?: string) {
  const branchQ = branch ? `&branch=${branch}` : "";
  return useQuery({
    queryKey: ["erp-pnl", gymId, from, to, branch ?? ""],
    queryFn: async () =>
      (await api.get<ErpPnl>(`/gym/${gymId}/erp/reports/pnl?from=${from}&to=${to}${branchQ}`)).data,
    enabled: !!gymId && !!from && !!to,
  });
}

export function useUpsertPlatformSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gymId,
      body,
    }: {
      gymId: string;
      body: {
        saas_plan: string;
        monthly_price: string;
        status: string;
        next_billing_date: string | null;
      };
    }) => (await api.put(`/platform/gyms/${gymId}/subscription`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-gyms"] }),
  });
}

// --- Tickets, moderación de posts y handoff de salida ---
export function useGymTickets(gymId: string, status?: string) {
  return useQuery({
    queryKey: ["gym-tickets", gymId, status ?? "all"],
    queryFn: () =>
      getList<import("./types").GymTicket>(
        `/gym/${gymId}/tickets${status ? `?status=${status}` : ""}`,
      ),
    enabled: !!gymId,
  });
}

export function useTicketReply(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) =>
      (await api.post(`/gym/${gymId}/tickets/${ticketId}/messages`, { body })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-tickets", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useTicketStatus(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) =>
      (await api.patch(`/gym/${gymId}/tickets/${ticketId}`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-tickets", gymId] });
      // Cerrar un ticket baja el pendiente "reportes abiertos".
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useGymPendingPosts(gymId: string) {
  return useQuery({
    queryKey: ["gym-posts", gymId],
    queryFn: () => getList<import("./types").AthletePost>(`/gym/${gymId}/posts?status=pending`),
    enabled: !!gymId,
  });
}

export function useDecidePost(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, action }: { postId: string; action: "approve" | "reject" }) =>
      (await api.post(`/gym/${gymId}/posts/${postId}/${action}`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-posts", gymId] });
      qc.invalidateQueries({ queryKey: ["gym-feed", gymId] });
      // Moderar baja el pendiente "posts en moderación".
      invalidarPendientes(qc, gymId);
    },
  });
}

export function useGymLeaveDecision(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, action }: { membershipId: string; action: "request" | "approve" | "cancel" }) =>
      (await api.post(`/gym/${gymId}/memberships/${membershipId}/leave/${action}`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      qc.invalidateQueries({ queryKey: ["membership-detail", gymId] });
      qc.invalidateQueries({ queryKey: ["overdue", gymId] });
      qc.invalidateQueries({ queryKey: ["at-risk", gymId] });
      invalidarPendientes(qc, gymId);
    },
  });
}

// --- Servicios del gym ---
// El CRUD de servicios se fusionó en classes.ServiceType: el catálogo se crea en
// Clases (useServiceTypes/useCreateServiceType/useUpdateServiceType) y su cobro +
// activación se configuran en Planes. Los hooks de /services/manage se retiraron.

// --- Reporte de errores del software (apps.bugreports) ---
// Reporter: cualquier usuario del panel envía un reporte. Consola: el superadmin
// gestiona triage/estado/prompt de fix bajo /platform/reports. Distinto de GymTicket.
export interface ReportInput {
  description: string;
  surface: string;
  app_version?: string;
  build?: string;
  os_name?: string;
  os_version?: string;
  device_model?: string;
  user_agent?: string;
  screen?: string;
  locale?: string;
  timezone?: string;
  stack_trace?: string;
  gym?: string | null;
  attachment?: File | null;
}

/** Estado del kill-switch para la superficie (oculta el reporter si está apagado). */
export function useReportConfig() {
  return useQuery({
    queryKey: ["report-config"],
    queryFn: async () => (await api.get<BugReportConfig>("/reports/config")).data,
    enabled: !!tokenStore.access,
    staleTime: 60_000,
  });
}

/** Envía un reporte desde el admin web (multipart por el adjunto opcional). */
export function useSubmitReport() {
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      const form = new FormData();
      Object.entries(input).forEach(([key, value]) => {
        if (key === "attachment" || value === undefined || value === null || value === "") return;
        form.append(key, String(value));
      });
      if (input.attachment) form.append("attachment", input.attachment);
      return (await api.post("/reports", form)).data;
    },
  });
}

// La gestión de reportes (triage / estado / lote / prompt de fix / kill-switch) vive
// SOLO en el Django admin; el admin web únicamente REPORTA (useReportConfig + useSubmitReport).
