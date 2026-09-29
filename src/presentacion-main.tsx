import React from "react";
import ReactDOM from "react-dom/client";

import { initAnalytics, trackPageview } from "./lib/analytics";
import Presentacion from "./presentacion/Presentacion";

/* Entrada suelta de `presentacion/index.html`: solo la presentación, sin router,
   sin sesión y sin el CSS del panel. Es la que lleva las etiquetas de la vista
   previa (título y og:image) en el HTML que lee WhatsApp. */

initAnalytics();
trackPageview("/presentacion");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Presentacion />
  </React.StrictMode>,
);
