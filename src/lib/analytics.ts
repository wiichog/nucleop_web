// Google Analytics 4 (gtag). El Measurement ID es público (aparece en el HTML de
// cualquier sitio con GA), así que se permite un default; `VITE_GA_MEASUREMENT_ID`
// lo sobreescribe por entorno si hace falta.
const GA_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || "G-E6DCBX7B28";

// No medir desde local/preview para no ensuciar la propiedad de producción.
const isLocalHost =
  typeof window !== "undefined" && /^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname);

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

/** Inserta gtag.js una sola vez. Page views se envían manualmente (SPA). */
export function initAnalytics(): void {
  if (initialized || !GA_ID || isLocalHost || typeof window === "undefined") return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js requiere el objeto `arguments` tal cual.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

/** Envía un page_view (llamar en cada cambio de ruta del SPA). */
export function trackPageview(path: string): void {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export const analyticsEnabled = Boolean(GA_ID) && !isLocalHost;
