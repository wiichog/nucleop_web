import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Versión de la app (de package.json) inyectada en build para el reporter de errores.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version ?? "0.0.0"),
  },
  build: {
    rollupOptions: {
      // Dos páginas: la SPA y la presentación comercial suelta, que necesita su
      // propio HTML para que la vista previa de WhatsApp lea su título y su
      // og:image (el rastreador no ejecuta JS). Ver presentacion/index.html.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        presentacion: fileURLToPath(new URL("./presentacion/index.html", import.meta.url)),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
