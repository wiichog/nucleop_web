import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "./client";
import {
  AuditLog,
  Dashboard,
  GymClass,
  GymCheckin,
  GymAdmin,
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
  ErpMovement,
  ErpSale,
  ErpExpense,
  ErpPnl,
  ErpBranch,
  GymClub,
  unwrapList,
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

async function getList<T>(url: string) {
  const { data } = await api.get<T[] | Paginated<T>>(url);
  return unwrapList(data);
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      qc.invalidateQueries({ queryKey: ["overdue", gymId] });
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
    mutationFn: async ({ membershipId, message }: { membershipId: string; message?: string }) =>
      (await api.post(`/gym/${gymId}/memberships/${membershipId}/reminder`, { message })).data,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
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

export function useGymClasses(gymId: string) {
  return useQuery({
    queryKey: ["gym-classes", gymId],
    queryFn: () => getList<GymClass>(`/gym/${gymId}/classes`),
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
    }) => (await api.post(`/gym/${gymId}/classes/recurring`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-classes", gymId] }),
  });
}

export function useGymClubs(gymId: string) {
  return useQuery({
    queryKey: ["gym-clubs", gymId],
    queryFn: () => getList<GymClub>(`/gym/${gymId}/clubs`),
    enabled: !!gymId,
  });
}

export function useDecideClub(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clubId, decision }: { clubId: string; decision: "approve" | "reject" }) =>
      (await api.post(`/gym/${gymId}/clubs/${clubId}/decide`, { decision })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-clubs", gymId] }),
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

export function useReceptionCheckin(gymId: string, classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membershipId: string) =>
      (
        await api.post<GymCheckin>(`/gym/${gymId}/classes/${classId}/checkins`, {
          membership_id: membershipId,
        })
      ).data,
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

export function useCreatePlatformGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; location_text: string }) =>
      (await api.post<GymAdmin>("/platform/gyms", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-gyms"] }),
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
    mutationFn: async (body: { title: string; body: string; class_type?: string }) =>
      (await api.post(`/gym/${gymId}/announcements`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-feed", gymId] }),
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
    }) => (await api.post<ErpProduct>(`/gym/${gymId}/erp/products`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erp-products", gymId] }),
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
    },
  });
}

export function useErpExpenses(gymId: string) {
  return useQuery({
    queryKey: ["erp-expenses", gymId],
    queryFn: () => getList<ErpExpense>(`/gym/${gymId}/erp/expenses`),
    enabled: !!gymId,
  });
}

export function useCreateErpExpense(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      category: string;
      amount: string;
      description?: string;
      incurred_on: string;
    }) => (await api.post<ErpExpense>(`/gym/${gymId}/erp/expenses`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["erp-expenses", gymId] });
      qc.invalidateQueries({ queryKey: ["erp-pnl", gymId] });
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-tickets", gymId] }),
  });
}

export function useTicketStatus(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) =>
      (await api.patch(`/gym/${gymId}/tickets/${ticketId}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-tickets", gymId] }),
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
    },
  });
}
