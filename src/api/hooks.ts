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
  FeedItem,
  AthleteOfMonth,
  unwrapList,
} from "./types";

export interface Role {
  role: string;
  gym_id: string | null;
  club_id: string | null;
}

interface Me {
  is_superuser: boolean;
  roles: Role[];
}

async function getList<T>(url: string) {
  const { data } = await api.get<T[] | Paginated<T>>(url);
  return unwrapList(data);
}

export function useLogin() {
  return useMutation({
    mutationFn: async (creds: { phone: string; password: string }) => {
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

export function useDashboard(gymId: string) {
  return useQuery({
    queryKey: ["dashboard", gymId],
    queryFn: async () => (await api.get<Dashboard>(`/gym/${gymId}/dashboard`)).data,
    enabled: !!gymId,
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
    mutationFn: async (identifier: string) =>
      (await api.post("/auth/password-reset", { identifier })).data,
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

export function useAssignPlan(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membershipId,
      planId,
      customFee,
    }: {
      membershipId: string;
      planId: string;
      customFee?: string;
    }) =>
      (
        await api.post<Membership>(`/gym/${gymId}/memberships/${membershipId}/assign-plan`, {
          plan_id: planId,
          custom_fee: customFee || null,
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
      noshow_penalty?: Record<string, unknown> | null;
    }) => (await api.post<Plan>(`/gym/${gymId}/plans`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", gymId] }),
  });
}

export function useGymClasses(gymId: string) {
  return useQuery({
    queryKey: ["gym-classes", gymId],
    queryFn: () => getList<GymClass>(`/gym/${gymId}/classes`),
    enabled: !!gymId,
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
