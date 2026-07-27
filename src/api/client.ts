import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const ACCESS_KEY = "nucleo.access";
const REFRESH_KEY = "nucleo.refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * ¿El backend dijo que el token ya no sirve, o solo no se pudo renovar AHORA?
 *
 * Distinguirlo es lo que evita expulsar a un admin por un bache de red, un 5xx
 * durante un deploy o —sobre todo— un 429 del throttle de `/auth/refresh`, que
 * se dispara en grupo porque la cuota va por IP y todo el gimnasio comparte el
 * wifi. Solo `token_not_valid` significa que la sesión murió de verdad.
 */
const sesionMuerta = (error: AxiosError) => {
  const res = error.response;
  if (!res) return false; // sin respuesta = red caída, no sesión muerta
  const cuerpo = res.data as { code?: string } | undefined;
  return res.status === 400 && cuerpo?.code === "token_not_valid";
};

// Refresh rotatorio: ante un 401, intenta renovar el access una vez.
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (error.response?.status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing =
          refreshing ??
          axios
            .post(`${BASE_URL}/auth/refresh`, { refresh: tokenStore.refresh })
            .then((r) => {
              // SIMPLE_JWT rota el refresh (ROTATE_REFRESH_TOKENS=True): si no se
              // guarda el NUEVO, su vencimiento nunca se renueva y la sesión del
              // dueño del gym muere a los 14 días por más que use el panel a diario.
              tokenStore.set(r.data.access, r.data.refresh);
              return r.data.access as string;
            });
        const newAccess = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (fallo) {
        refreshing = null;
        // Solo se cierra la sesión si el backend dijo que el token murió. Antes
        // CUALQUIER fallo (red, 5xx, 429) borraba un refresh perfectamente válido
        // y sacaba al admin del panel perdiendo el formulario que estuviera llenando.
        if (sesionMuerta(fallo as AxiosError)) {
          tokenStore.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Cierra sesión revocando el refresh en el servidor. Borrar solo el
 * `localStorage` dejaba el token vivo 14 días: un trabajador despedido o una
 * sesión comprometida seguían renovando accesos. El endpoint es idempotente y no
 * se espera su respuesta: un fallo de red no puede atrapar a nadie en la sesión.
 */
export function cerrarSesion() {
  const refresh = tokenStore.refresh;
  tokenStore.clear();
  if (refresh) {
    void axios
      .post(`${BASE_URL}/auth/logout`, { refresh }, { timeout: 8000 })
      .catch(() => {});
  }
}
