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
              tokenStore.set(r.data.access);
              return r.data.access as string;
            });
        const newAccess = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        refreshing = null;
        tokenStore.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
