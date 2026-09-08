import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * reCAPTCHA v2 (la casilla) con renderizado explícito.
 *
 * Mismo patrón que `landing/ContactSection.tsx`: script perezoso, `render=explicit`
 * y un callback global de arranque. Lo que cambia aquí es quién lee el token: en
 * el contrato el envío ocurre al final de diez pasos, así que en vez de un estado
 * se expone un `ref` imperativo y el formulario pide el token justo al firmar.
 *
 * Si `VITE_RECAPTCHA_SITE_KEY` no está definida el widget no se dibuja y el token
 * sale vacío. Es deliberado: en dev no hay llaves, y el backend verifica con
 * `fallback_abierto=True`, así que un captcha ausente no puede bloquear una firma.
 * Perder un contrato firmado no tiene arreglo; un envío basura lo descarta una
 * persona desde la bandeja.
 */
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

/** ¿Hay captcha en este entorno? El formulario lo usa para exigirlo o no. */
export const RECAPTCHA_ACTIVO = Boolean(SITE_KEY);

type Grecaptcha = {
  render: (el: HTMLElement, opts: { sitekey: string; theme?: "dark" | "light" }) => number;
  getResponse: (id?: number) => string;
  reset: (id?: number) => void;
};

// Se lee por cast en vez de `declare global`: la landing ya declara `window.grecaptcha`
// con su propia interfaz, y una segunda declaración global del mismo nombre rompe la
// compilación aunque las dos digan exactamente lo mismo.
const conVentana = () =>
  window as unknown as { grecaptcha?: Grecaptcha; onNucleoRecaptcha?: () => void };

export type RecaptchaHandle = {
  /** Token a mandar en `recaptcha_token`. Cadena vacía si no hay captcha activo. */
  token: () => string;
  /** Limpia la casilla (tras un envío fallido, el token ya no sirve). */
  reiniciar: () => void;
};

export const Recaptcha = forwardRef<RecaptchaHandle>(function Recaptcha(_props, ref) {
  const contenedor = useRef<HTMLDivElement>(null);
  // El id del widget es también la guarda contra el doble montaje de StrictMode:
  // sin él, en dev se dibujan dos casillas y `getResponse` lee la que no es.
  const idWidget = useRef<number | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelado = false;

    const dibujar = () => {
      if (cancelado || idWidget.current !== null || !contenedor.current) return;
      const google = conVentana().grecaptcha;
      if (!google?.render) return;
      idWidget.current = google.render(contenedor.current, {
        sitekey: SITE_KEY,
        theme: "dark",
      });
    };

    if (conVentana().grecaptcha?.render) {
      dibujar();
      return () => {
        cancelado = true;
      };
    }

    conVentana().onNucleoRecaptcha = dibujar;
    if (!document.getElementById("recaptcha-script")) {
      const etiqueta = document.createElement("script");
      etiqueta.id = "recaptcha-script";
      etiqueta.src =
        "https://www.google.com/recaptcha/api.js?onload=onNucleoRecaptcha&render=explicit";
      etiqueta.async = true;
      etiqueta.defer = true;
      document.head.appendChild(etiqueta);
    }

    return () => {
      cancelado = true;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      token: () =>
        SITE_KEY
          ? (conVentana().grecaptcha?.getResponse(idWidget.current ?? undefined) ?? "")
          : "",
      reiniciar: () => {
        if (SITE_KEY && idWidget.current !== null) {
          conVentana().grecaptcha?.reset(idWidget.current);
        }
      },
    }),
    [],
  );

  if (!SITE_KEY) return null;
  return <div ref={contenedor} />;
});
