import { useEffect } from "react";

import Presentacion from "./Presentacion";

/**
 * `/presentacion` DENTRO de la SPA. Existe porque la regla de reescritura de
 * Amplify manda hoy toda ruta sin extensión (y todo .html) al index.html de la
 * SPA: sin esta ruta, el enlace caería en la landing.
 *
 * La vista previa de WhatsApp NO sale de aquí (el rastreador no ejecuta JS y lee
 * las etiquetas del index.html de la landing): sale de `presentacion/index.html`,
 * que Amplify sirve solo cuando se agregue su regla (ver ese archivo). Aquí se
 * ajusta lo que sí lee un buscador que renderiza: el título y el `noindex`.
 */
const TITULO = "Presentación de Nucleo · Software para gimnasios y boxes";

export default function PresentacionPage() {
  useEffect(() => {
    const tituloAntes = document.title;
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const robotsAntes = robots?.content;
    document.title = TITULO;
    if (robots) robots.content = "noindex, follow";
    return () => {
      document.title = tituloAntes;
      if (robots && robotsAntes) robots.content = robotsAntes;
    };
  }, []);

  return <Presentacion />;
}
