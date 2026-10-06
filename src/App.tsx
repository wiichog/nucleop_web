import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AndroidTestersPage } from "./landing/AndroidTestersPage";
import { DeleteAccountPage } from "./landing/DeleteAccountPage";
import { LandingPage } from "./landing/LandingPage";
import { PrivacyPage } from "./landing/PrivacyPage";
import { TermsPage } from "./landing/TermsPage";
import { initAnalytics, trackPageview } from "./lib/analytics";

// El panel (Mantine + todas las páginas) se carga solo al salir de la landing.
const AdminShell = lazy(() => import("./AdminShell"));
// La presentación comercial viaja en su propio chunk: quien la abre desde
// WhatsApp no descarga el panel.
const PresentacionPage = lazy(() => import("./presentacion/PresentacionPage"));
const ManualMarcaPage = lazy(() => import("./manual/ManualMarcaPage"));

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-nucleo-flame" />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);
  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* Política de privacidad pública (requisito de App Store y Google Play). */}
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      {/* Términos de servicio: Meta los exige como URL propia para publicar la app
          (apuntarlos a un dominio ajeno es rechazo en App Review). */}
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/terms" element={<TermsPage />} />
      {/* Eliminación de cuenta: Google Play la exige como URL pública propia,
          accesible sin login y distinta de la política de privacidad. */}
      <Route path="/eliminar-cuenta" element={<DeleteAccountPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />
      {/* Reclutamiento de probadores para la prueba cerrada de Google Play. Es una
          página de campaña: vive mientras dure el reclutamiento y el backend la
          apaga sola (`ANDROID_TESTERS_ENABLED`), respondiendo 503 al formulario.
          Va fuera del AdminShell porque quien la abre llega por un enlace de
          WhatsApp y no tiene sesión. */}
      <Route path="/probar-android" element={<AndroidTestersPage />} />
      {/* Presentación comercial para dueños de gimnasios: pública y `noindex`, se
          manda por WhatsApp antes de la primera llamada. Fuera del AdminShell por
          lo mismo que la de arriba. Ver src/presentacion/. */}
      <Route
        path="/presentacion"
        element={
          <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#000" }} />}>
            <PresentacionPage />
          </Suspense>
        }
      />
      {/* Manual de marca: público y `noindex`, para quien diseña piezas o redes.
          Ver src/manual/ y scripts/marca.py. */}
      <Route
        path="/manual-de-marca"
        element={
          <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#0a0a0b" }} />}>
            <ManualMarcaPage />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <AdminShell />
          </Suspense>
        }
      />
    </Routes>
  );
}
