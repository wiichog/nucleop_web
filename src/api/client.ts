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
 * wifi.
 *
 * La sesión murió cuando `/auth/refresh` responde 401: es el `TokenRefreshView`
 * de SimpleJWT, que no autentica la petición, así que su 401 solo puede decir
 * que rechazó el refresh (vencido a los 14 días, ilegible o revocado), con
 * `code: "token_not_valid"`. Antes se esperaba un 400, que ese endpoint no da
 * para un token malo (su 400 es «falta el campo refresh»): la sesión caducada
 * nunca se cerraba y el panel le decía al admin que ningún gimnasio le había
 * dado acceso. El 400 con `token_not_valid` se conserva por compatibilidad.
 * Mismo criterio que `tokenRechazado` en el app.
 */
const sesionMuerta = (error: AxiosError) => {
  const res = error.response;
  if (!res) return false; // sin respuesta = red caída, no sesión muerta
  if (res.status === 401) return true;
  const cuerpo = res.data as { code?: string } | undefined;
  return res.status === 400 && cuerpo?.code === "token_not_valid";
};

/**
 * Endpoints públicos donde un 401 NO significa "se murió la sesión": el login
 * responde 401 con una contraseña mala. Sin esta lista, quien abre /login con
 * una sesión vieja en el navegador y se equivoca de contraseña dispara un
 * refresh; si el refresh muere o el reintento vuelve a dar 401, se recarga
 * /login y se pierde el aviso de «Credenciales inválidas».
 *
 * Es la lista `RUTAS_PUBLICAS` del app: las rutas de
 * `nucleo-api/apps/accounts/urls.py` menos las dos que sí exigen sesión
 * (`/auth/password-change` y `/auth/account`), donde un 401 sí es sesión muerta.
 */
const RUTAS_PUBLICAS = new Set([
  "/auth/register",
  "/auth/claim",
  "/auth/login",
  "/auth/social",
  "/auth/refresh",
  "/auth/logout",
  "/auth/password-reset",
  "/auth/password-reset/confirm",
]);

/** Ruta relativa a la API, sin baseURL, sin query y sin barra final. */
function rutaDe(url?: string): string {
  if (!url) return "";
  let ruta = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url;
  const corte = ruta.search(/[?#]/);
  if (corte >= 0) ruta = ruta.slice(0, corte);
  ruta = ruta.replace(/\/+$/, "");
  return ruta.startsWith("/") ? ruta : `/${ruta}`;
}

/** Comparación exacta (no `includes`) para que `/auth/password-change` no cuele. */
const esRutaPublica = (url?: string) => RUTAS_PUBLICAS.has(rutaDe(url));

/** La sesión ya no se puede recuperar: se borran los tokens y se va al login. */
function expulsar() {
  tokenStore.clear();
  window.location.href = "/login";
}

/**
 * Un cambio de la sesión en curso en esta pestaña: hoy, el de contraseña, que
 * cierra todas las sesiones y responde con el par nuevo. Mientras viaja, un 401 de
 * otra petición es de esperarse (su access quedó atado a la contraseña vieja), y
 * renovar o expulsar en ese momento es justo lo que sacaba al admin: el refresh
 * del login ya está en la blacklist, uno rotado renueva un access igual de muerto,
 * y el par nuevo todavía no llega. Por eso el 401 espera a que el cambio termine.
 */
let cambioDeSesion: Promise<unknown> | null = null;

/** Las rutas que SON el cambio: su propio 401 no puede esperarse a sí mismo. */
const RUTAS_QUE_CAMBIAN_LA_SESION = new Set(["/auth/password-change"]);

/** Corre `tarea` marcándola como cambio de sesión (ver `cambioDeSesion`). */
export async function mientrasCambiaLaSesion<T>(tarea: () => Promise<T>): Promise<T> {
  const enCurso = tarea();
  cambioDeSesion = enCurso;
  try {
    return await enCurso;
  } finally {
    if (cambioDeSesion === enCurso) cambioDeSesion = null;
  }
}

/** Espera el cambio de sesión en curso, si hay uno y la petición no es él. */
async function esperarCambioDeSesion(url?: string): Promise<boolean> {
  const enCurso = cambioDeSesion;
  if (!enCurso || RUTAS_QUE_CAMBIAN_LA_SESION.has(rutaDe(url))) return false;
  await enCurso.catch(() => undefined);
  return true;
}

// Refresh rotatorio: ante un 401, intenta renovar el access una vez. Se guarda con
// qué refresh salió: si mientras viaja se guarda un par más nuevo (el de un cambio
// de contraseña, o el de otra pestaña), lo que responda ya no es de esta sesión.
let refreshing: { con: string; access: Promise<string> } | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (error.response?.status !== 401 || !original || esRutaPublica(original.url)) {
      return Promise.reject(error);
    }
    if (await esperarCambioDeSesion(original.url)) {
      // El cambio lo hizo esta pestaña, con esta misma cuenta: si dejó un access
      // distinto, el reintento sale con él y no hace falta gastar un refresh.
      const nuevo = tokenStore.access;
      if (!original._retry && nuevo && original.headers.Authorization !== `Bearer ${nuevo}`) {
        original._retry = true;
        original.headers.Authorization = `Bearer ${nuevo}`;
        return api(original);
      }
    }
    // 401 con el reintento ya gastado: el access se acababa de renovar y el
    // backend igual lo rechazó. Es una cuenta desactivada (`is_active=False`) o
    // borrada: `/me` responde «El usuario está inactivo», pero `/auth/refresh`
    // sigue dando 200 porque SimpleJWT 5.3.1 no mira `is_active` al renovar. Sin
    // esta rama el panel se quedaba en /panel diciendo que ningún gimnasio le
    // había dado acceso. Mismo criterio que la rama `_retry` del app.
    if (original._retry) {
      // Solo si el token rechazado es el que sigue guardado: si otra pestaña ya
      // entró con otra cuenta (el localStorage es compartido), borrar aquí la
      // sacaría a ella por culpa de una petición de la sesión anterior.
      if (original.headers.Authorization === `Bearer ${tokenStore.access}`) expulsar();
      return Promise.reject(error);
    }
    const refresh = tokenStore.refresh;
    if (!refresh) return Promise.reject(error);
    original._retry = true;
    if (!refreshing) {
      const con = refresh;
      refreshing = {
        con,
        access: axios.post(`${BASE_URL}/auth/refresh`, { refresh: con }).then((r) => {
          // SIMPLE_JWT rota el refresh (ROTATE_REFRESH_TOKENS=True): si no se
          // guarda el NUEVO, su vencimiento nunca se renueva y la sesión del
          // dueño del gym muere a los 14 días por más que use el panel a diario.
          // Pero solo si sigue guardado el refresh con que salió: si mientras
          // viajaba llegó un par más nuevo, pisarlo lo cambiaría por uno de la
          // sesión anterior (tras un cambio de contraseña, un par muerto).
          if (tokenStore.refresh === con) tokenStore.set(r.data.access, r.data.refresh);
          return r.data.access as string;
        }),
      };
    }
    const enVuelo = refreshing;
    try {
      const newAccess = await enVuelo.access;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (fallo) {
      // Si mientras viajaba se guardó un par más nuevo (un cambio de contraseña,
      // otra pestaña), lo que falló fue la sesión de antes: expulsar borraría la
      // buena. La petición se reintenta; el interceptor de salida le pone el access
      // guardado, y si ese también da 401 decide la rama `_retry`.
      await esperarCambioDeSesion(original.url);
      if (tokenStore.refresh !== enVuelo.con && tokenStore.access) return api(original);
      // Solo se cierra la sesión si el backend dijo que el token murió. Antes
      // CUALQUIER fallo (red, 5xx, 429) borraba un refresh perfectamente válido
      // y sacaba al admin del panel perdiendo el formulario que estuviera llenando.
      if (sesionMuerta(fallo as AxiosError)) expulsar();
    } finally {
      if (refreshing === enVuelo) refreshing = null;
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
