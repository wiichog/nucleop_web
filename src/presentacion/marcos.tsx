import { AtomLogo } from "../landing/AtomLogo";

/* ============================================================================
   Marcos para las pantallas de la presentación.

   Las capturas son REALES: el panel y la app de Nucleo corriendo en una demo
   local con un gimnasio de ejemplo («Box Demo») y atletas inventados. Las del
   panel se sacaron a 1440×900 sin el encabezado (que enseña el correo de la
   sesión); las de la app son las del App Store 2.0.1, recortadas al borde de la
   pantalla. Viven en public/presentacion/capturas/ con una extensión de las que
   la regla de reescritura de Amplify deja pasar (css/gif/ico/jpg/jpeg/js/png/
   txt/svg/woff/woff2/ttf/map/json/webp); cualquier otra cae al index.html.
   Si cambia una pantalla de verdad, su captura se desactualiza en silencio.
   ========================================================================== */

const CAPTURAS = "/presentacion/capturas";

export function Laptop({ captura, etiqueta }: { captura: string; etiqueta: string }) {
  return (
    <figure className="laptop" role="img" aria-label={etiqueta}>
      <div className="laptop-pantalla">
        <img src={`${CAPTURAS}/${captura}.jpg`} alt="" width={1800} height={1125} loading="lazy" decoding="async" />
      </div>
      <div className="laptop-base" aria-hidden="true" />
    </figure>
  );
}

export function Telefono({
  captura,
  etiqueta,
  className = "",
}: {
  captura: string;
  etiqueta: string;
  className?: string;
}) {
  return (
    <figure className={`telefono ${className}`} role="img" aria-label={etiqueta}>
      <div className="telefono-pantalla">
        <img src={`${CAPTURAS}/${captura}.jpg`} alt="" width={720} height={1565} loading="lazy" decoding="async" />
      </div>
    </figure>
  );
}

/** Ventana del navegador con un recorte del panel (sin marco de laptop). */
export function Ventana({
  captura,
  etiqueta,
  ancho,
  alto,
  direccion = "app.nucleo.fit/panel",
}: {
  captura: string;
  etiqueta: string;
  ancho: number;
  alto: number;
  direccion?: string;
}) {
  return (
    <figure className="ventana" role="img" aria-label={etiqueta}>
      <div className="ventana-barra" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>{direccion}</span>
      </div>
      <img src={`${CAPTURAS}/${captura}.jpg`} alt="" width={ancho} height={alto} loading="lazy" decoding="async" />
    </figure>
  );
}

/**
 * El aviso que recibe el atleta cuando cruza el umbral de riesgo. Título y texto
 * son los del backend (`notifications/services.py` y
 * `memberships/tasks.py:_mensaje_riesgo`), con el gimnasio de ejemplo.
 */
export function AvisoPush() {
  return (
    <figure className="aviso" role="img" aria-label="Aviso en el teléfono del atleta: Te extrañamos en el gym">
      <span className="aviso-icono" aria-hidden="true">
        <AtomLogo size={30} />
      </span>
      <span className="aviso-cuerpo">
        <span className="aviso-cabeza">
          <b>Nucleo Gym</b>
          <small>ahora</small>
        </span>
        <b className="aviso-titulo">💪 Te extrañamos en el gym</b>
        <span className="aviso-texto">
          Te extrañamos en Box Demo. Llevas 12 días sin entrenar: reserva tu próxima clase.
        </span>
      </span>
    </figure>
  );
}
