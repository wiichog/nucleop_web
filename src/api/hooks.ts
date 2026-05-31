import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "./client";

export interface Role {
  role: string;
  gym_id: string | null;
  club_id: string | null;
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
    queryFn: async () => (await api.get("/me")).data,
    enabled: !!tokenStore.access,
  });
}

export function useDashboard(gymId: string) {
  return useQuery({
    queryKey: ["dashboard", gymId],
    queryFn: async () => (await api.get(`/gym/${gymId}/dashboard`)).data,
    enabled: !!gymId,
  });
}

export function useAtRisk(gymId: string) {
  return useQuery({
    queryKey: ["at-risk", gymId],
    queryFn: async () => (await api.get(`/gym/${gymId}/retention/at-risk`)).data,
    enabled: !!gymId,
  });
}

export function useOverdue(gymId: string) {
  return useQuery({
    queryKey: ["overdue", gymId],
    queryFn: async () => (await api.get(`/gym/${gymId}/overdue`)).data,
    enabled: !!gymId,
  });
}

export function useMemberships(gymId: string) {
  return useQuery({
    queryKey: ["memberships", gymId],
    queryFn: async () => (await api.get(`/gym/${gymId}/memberships`)).data,
    enabled: !!gymId,
  });
}

export function usePlans(gymId: string) {
  return useQuery({
    queryKey: ["plans", gymId],
    queryFn: async () => (await api.get(`/gym/${gymId}/plans`)).data,
    enabled: !!gymId,
  });
}

export function useGymPayments(gymId: string) {
  return useQuery({
    queryKey: ["payments", gymId],
    queryFn: async () => (await api.get(`/gym/${gymId}/payments`)).data,
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
      proof_url?: string;
    }) => (await api.post(`/gym/${gymId}/payments/manual`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", gymId] });
      qc.invalidateQueries({ queryKey: ["memberships", gymId] });
      qc.invalidateQueries({ queryKey: ["overdue", gymId] });
    },
  });
}
