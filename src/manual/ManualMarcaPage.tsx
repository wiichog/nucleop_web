import { useEffect } from "react";

import cuerpo from "./manual.html?raw";
import "./manual.css";

/**
 * `/manual-de-marca`: el manual de marca, público y `noindex`.
 *
 * Es una ruta de la SPA y no un HTML suelto en public/ porque la regla de
 * reescritura de Amplify manda todo `.html` al index.html de la landing (ver
 * la memoria de Amplify): un `public/manual-de-marca/index.html` nunca se vería.
 *
 * El contenido es HTML estático propio (`manual.html`), sin datos del usuario,
 * por eso se inyecta tal cual. Los archivos que enlaza viven en `public/marca/`
 * y los genera `scripts/marca.py`.
 */
const TITULO = "Manual de marca · Nucleo";

export default function ManualMarcaPage() {
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

  return <div className="mm" dangerouslySetInnerHTML={{ __html: cuerpo }} />;
}
