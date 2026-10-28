import { useEffect, useRef } from "react";

import cuerpo from "./manual.html?raw";
import "./manual.css";
import { armarZip } from "./zip";

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

/** Lo que baja «Descargar todos los logos». Si `scripts/marca.py` saca otro, va aquí. */
const LOGOS = [
  "logotipo-sobre-oscuro.svg",
  "logotipo-sobre-oscuro-1200.png",
  "logotipo-sobre-claro.svg",
  "logotipo-sobre-claro-1200.png",
  "isotipo-sobre-oscuro.svg",
  "isotipo-sobre-claro.svg",
  "isotipo-mono-blanco.svg",
  "isotipo-mono-negro.svg",
  "avatar-1080.png",
  "avatar-320.png",
];

async function descargarLogos() {
  const archivos = await Promise.all(
    LOGOS.map(async (nombre) => {
      const r = await fetch(`/marca/${nombre}`);
      // Un archivo que falta no da 404 siempre: la regla de Amplify puede
      // devolver el index.html con 200. Se rechaza todo lo que sea HTML.
      if (!r.ok || r.headers.get("content-type")?.includes("text/html")) {
        throw new Error(`No se pudo bajar ${nombre}`);
      }
      return { nombre: `nucleo-logos/${nombre}`, datos: new Uint8Array(await r.arrayBuffer()) };
    }),
  );
  const href = URL.createObjectURL(new Blob([armarZip(archivos)], { type: "application/zip" }));
  const enlace = document.createElement("a");
  enlace.href = href;
  enlace.download = "nucleo-logos.zip";
  enlace.click();
  // Safari cancela la descarga si el blob se revoca en el mismo tick.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

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

  // El botón vive en el HTML inyectado: se escucha por delegación.
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const div = raiz.current;
    if (!div) return;
    const alClic = async (e: MouseEvent) => {
      const boton = (e.target as Element).closest<HTMLButtonElement>("[data-descargar-logos]");
      if (!boton || boton.disabled) return;
      const estado = div.querySelector<HTMLElement>("[data-descargar-estado]");
      const textoAntes = boton.textContent;
      const estadoAntes = estado?.textContent;
      boton.disabled = true;
      boton.textContent = "Preparando…";
      try {
        await descargarLogos();
        if (estado) estado.textContent = estadoAntes ?? "";
      } catch {
        if (estado) estado.textContent = "No se pudo armar el ZIP. Baja los archivos uno por uno de la tabla.";
      } finally {
        boton.disabled = false;
        boton.textContent = textoAntes;
      }
    };
    div.addEventListener("click", alClic);
    return () => div.removeEventListener("click", alClic);
  }, []);

  return <div ref={raiz} className="mm" dangerouslySetInnerHTML={{ __html: cuerpo }} />;
}
