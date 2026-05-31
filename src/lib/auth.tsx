import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useMe, Role } from "../api/hooks";
import { tokenStore } from "../api/client";

interface AuthValue {
  loading: boolean;
  authenticated: boolean;
  roles: Role[];
  primaryGymId: string | null;
  gymIds: string[];
  setPrimaryGymId: (gymId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue>({
  loading: true,
  authenticated: false,
  roles: [],
  primaryGymId: null,
  gymIds: [],
  setPrimaryGymId: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const roles: Role[] = data?.roles ?? [];
  const gymIds = [...new Set(roles.flatMap((role) => (role.gym_id ? [role.gym_id] : [])))];
  const [primaryGymId, setPrimaryGymId] = useState<string | null>(null);

  useEffect(() => {
    if (!primaryGymId || !gymIds.includes(primaryGymId)) {
      setPrimaryGymId(gymIds[0] ?? null);
    }
  }, [gymIds, primaryGymId]);

  const value: AuthValue = {
    loading: isLoading && !!tokenStore.access,
    authenticated: !!tokenStore.access,
    roles,
    primaryGymId,
    gymIds,
    setPrimaryGymId,
    logout: () => {
      tokenStore.clear();
      window.location.href = "/login";
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
