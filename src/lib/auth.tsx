import { createContext, useContext, ReactNode } from "react";
import { useMe, Role } from "../api/hooks";
import { tokenStore } from "../api/client";

interface AuthValue {
  loading: boolean;
  authenticated: boolean;
  roles: Role[];
  /** Primer gym donde el usuario tiene rol (ámbito por defecto del panel). */
  primaryGymId: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthValue>({
  loading: true,
  authenticated: false,
  roles: [],
  primaryGymId: null,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const roles: Role[] = data?.roles ?? [];
  const primaryGymId = roles.find((r) => r.gym_id)?.gym_id ?? null;

  const value: AuthValue = {
    loading: isLoading && !!tokenStore.access,
    authenticated: !!tokenStore.access,
    roles,
    primaryGymId,
    logout: () => {
      tokenStore.clear();
      window.location.href = "/login";
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
