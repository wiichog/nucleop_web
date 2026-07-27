import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from "react";
import { useMe, usePlatformGyms } from "../api/hooks";
import type { Role } from "../api/hooks";
import { cerrarSesion, tokenStore } from "../api/client";

export interface GymOption {
  id: string;
  name: string;
}

interface AuthValue {
  loading: boolean;
  authenticated: boolean;
  email: string;
  roles: Role[];
  isSuperuser: boolean;
  primaryGymId: string | null;
  gymIds: string[];
  gyms: GymOption[];
  clubIds: string[];
  primaryClubId: string | null;
  setPrimaryGymId: (gymId: string) => void;
  setPrimaryClubId: (clubId: string) => void;
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
  gyms: [],
  clubIds: [],
  primaryClubId: null,
  setPrimaryGymId: () => {},
  setPrimaryClubId: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const roles: Role[] = useMemo(() => data?.roles ?? [], [data]);
  const isSuperuser = data?.is_superuser ?? false;

  // El superadmin NO tiene un StaffRoleAssignment por gimnasio: el backend
  // (HasGymRole) lo deja entrar a CUALQUIER gym por `is_superuser`. Si el selector
  // se alimentara solo de sus roles, vería el menú completo con todas las páginas
  // vacías. Por eso su catálogo de gyms sale de /platform/gyms (soporte sin pedirle
  // la contraseña al cliente).
  const platformGyms = usePlatformGyms(isSuperuser);

  const gyms: GymOption[] = useMemo(() => {
    const catalogo = platformGyms.data ?? [];
    const nombres = new Map(catalogo.map((gym) => [gym.id, gym.name]));
    // Primero los gyms donde SÍ tiene rol (su operación diaria), después el resto.
    const ids = [
      ...roles.flatMap((role) => (role.gym_id ? [role.gym_id] : [])),
      ...catalogo.map((gym) => gym.id),
    ];
    return [...new Set(ids)].map((id) => ({
      id,
      name: nombres.get(id) ?? `Gym ${id.slice(0, 8)}`,
    }));
  }, [roles, platformGyms.data]);

  const gymIds = useMemo(() => gyms.map((gym) => gym.id), [gyms]);
  const clubIds = useMemo(
    () => [...new Set(roles.flatMap((role) => (role.club_id ? [role.club_id] : [])))],
    [roles],
  );

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
    // Mientras carga el catálogo de plataforma el superadmin aún no tiene gym
    // activo: sin esperarlo, el panel parpadea "sin gimnasio asignado".
    loading: (isLoading || (isSuperuser && platformGyms.isLoading)) && !!tokenStore.access,
    authenticated: !!tokenStore.access,
    email: data?.email ?? "",
    roles,
    isSuperuser,
    primaryGymId,
    gymIds,
    gyms,
    clubIds,
    primaryClubId,
    setPrimaryGymId,
    setPrimaryClubId,
    logout: () => {
      // Revoca el refresh en el servidor además de limpiar el navegador: borrar
      // solo el localStorage dejaba la sesión viva 14 días.
      cerrarSesion();
      window.location.href = "/login";
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
