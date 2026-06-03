import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useMe, Role } from "../api/hooks";
import { tokenStore } from "../api/client";

interface AuthValue {
  loading: boolean;
  authenticated: boolean;
  email: string;
  roles: Role[];
  isSuperuser: boolean;
  primaryGymId: string | null;
  gymIds: string[];
  clubIds: string[];
  primaryClubId: string | null;
  setPrimaryGymId: (gymId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue>({
  loading: true,
  authenticated: false,
  email: "",
  roles: [],
  isSuperuser: false,
  primaryGymId: null,
  gymIds: [],
  clubIds: [],
  primaryClubId: null,
  setPrimaryGymId: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const roles: Role[] = data?.roles ?? [];
  const gymIds = [...new Set(roles.flatMap((role) => (role.gym_id ? [role.gym_id] : [])))];
  const clubIds = [...new Set(roles.flatMap((role) => (role.club_id ? [role.club_id] : [])))];
  const [primaryGymId, setPrimaryGymId] = useState<string | null>(null);
  const [primaryClubId, setPrimaryClubId] = useState<string | null>(null);

  useEffect(() => {
    if (!primaryGymId || !gymIds.includes(primaryGymId)) {
      setPrimaryGymId(gymIds[0] ?? null);
    }
  }, [gymIds, primaryGymId]);

  useEffect(() => {
    if (!primaryClubId || !clubIds.includes(primaryClubId)) {
      setPrimaryClubId(clubIds[0] ?? null);
    }
  }, [clubIds, primaryClubId]);

  const value: AuthValue = {
    loading: isLoading && !!tokenStore.access,
    authenticated: !!tokenStore.access,
    email: data?.email ?? "",
    roles,
    isSuperuser: data?.is_superuser ?? false,
    primaryGymId,
    gymIds,
    clubIds,
    primaryClubId,
    setPrimaryGymId,
    logout: () => {
      tokenStore.clear();
      window.location.href = "/login";
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
