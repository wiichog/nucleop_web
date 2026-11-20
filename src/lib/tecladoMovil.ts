/**
 * El teclado del celular y el panel.
 *
 * En iOS Safari (y en Chrome de Android desde la 108) abrir el teclado NO encoge
 * la página: solo encoge el *viewport visual* (lo que de verdad se ve). Todo lo
 * que va `position: fixed` y mide `100dvh` —los modales y drawers de Mantine—
 * sigue midiendo la pantalla completa, así que la mitad de abajo de un modal
 * queda DETRÁS del teclado y el campo que se está escribiendo se tapa.
 *
 * Este módulo publica el viewport visual como variables CSS que `aurora.css`
 * usa para dimensionar modales y drawers:
 *  - `--nucleo-vvh`     alto visible (sin teclado), en px
 *  - `--nucleo-vv-top`  cuánto bajó el viewport visual (iOS lo desplaza)
 *  - `html[data-teclado]` mientras el teclado está abierto
 *
 * Y cuando el teclado termina de abrir, trae a la vista el campo enfocado si
 * quedó tapado.
 *
 * Con zoom de pellizco (`scale` ≠ 1) no se publica nada: el viewport visual
 * entonces es la lupa del usuario, no el hueco que deja el teclado, y pegarle
 * los modales lo volvería inmanejable.
 */

/** Diferencia mínima (px) entre el viewport y lo visible para decir «hay teclado». */
export const UMBRAL_TECLADO = 120;

export function esEditable(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image", "hidden"].includes(
      el.type,
    );
  }
  return false;
}

/** ¿El teclado está abierto? `layout` = alto del viewport de layout (sin teclado). */
export function hayTeclado(layout: number, visible: number, scale: number): boolean {
  return Math.abs(scale - 1) < 0.01 && layout - visible > UMBRAL_TECLADO;
}

/**
 * ¿Hace falta mover el campo? Sí si su borde de abajo quedó debajo de lo visible
 * o su borde de arriba quedó bajo el header pegajoso / fuera de la vista.
 */
export function campoTapado(
  rect: { top: number; bottom: number },
  vvTop: number,
  vvHeight: number,
  margen = 12,
): boolean {
  return rect.bottom > vvTop + vvHeight - margen || rect.top < vvTop + margen;
}

/**
 * Instala los listeners. Devuelve la función que los quita (para `useEffect`).
 * Sin `visualViewport` (navegadores viejos, jsdom) no hace nada.
 */
export function instalarTecladoMovil(win: Window = window): () => void {
  const vv = win.visualViewport;
  if (!vv) return () => {};
  const root = win.document.documentElement;
  let frame = 0;
  let tecladoAntes = false;

  const traerCampoALaVista = () => {
    const el = win.document.activeElement;
    if (!esEditable(el)) return;
    const r = el.getBoundingClientRect();
    // getBoundingClientRect es relativo al viewport de layout; el visible
    // empieza en offsetTop.
    if (campoTapado(r, vv.offsetTop, vv.height)) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    }
  };

  const publicar = () => {
    frame = 0;
    const layout = root.clientHeight;
    const zoom = Math.abs(vv.scale - 1) >= 0.01;
    if (zoom) {
      root.style.removeProperty("--nucleo-vvh");
      root.style.removeProperty("--nucleo-vv-top");
      root.removeAttribute("data-teclado");
      tecladoAntes = false;
      return;
    }
    root.style.setProperty("--nucleo-vvh", `${Math.round(vv.height)}px`);
    root.style.setProperty("--nucleo-vv-top", `${Math.round(vv.offsetTop)}px`);
    const teclado = hayTeclado(layout, vv.height, vv.scale);
    if (teclado) root.setAttribute("data-teclado", "");
    else root.removeAttribute("data-teclado");
    // Al abrirse (o al cambiar de alto, p. ej. la barra de sugerencias de iOS)
    // el campo pudo quedar debajo del teclado.
    if (teclado) traerCampoALaVista();
    tecladoAntes = teclado;
  };

  const programar = () => {
    if (!frame) frame = win.requestAnimationFrame(publicar);
  };

  // Cambiar de un campo a otro con el teclado ya abierto no dispara `resize`:
  // se revisa a mano al enfocar.
  const alEnfocar = () => {
    if (tecladoAntes) win.setTimeout(traerCampoALaVista, 60);
  };

  vv.addEventListener("resize", programar);
  vv.addEventListener("scroll", programar);
  win.document.addEventListener("focusin", alEnfocar);
  publicar();

  return () => {
    vv.removeEventListener("resize", programar);
    vv.removeEventListener("scroll", programar);
    win.document.removeEventListener("focusin", alEnfocar);
    if (frame) win.cancelAnimationFrame(frame);
    root.style.removeProperty("--nucleo-vvh");
    root.style.removeProperty("--nucleo-vv-top");
    root.removeAttribute("data-teclado");
  };
}
