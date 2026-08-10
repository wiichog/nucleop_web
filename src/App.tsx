import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { DeleteAccountPage } from "./landing/DeleteAccountPage";
import { LandingPage } from "./landing/LandingPage";
import { PrivacyPage } from "./landing/PrivacyPage";
import { TermsPage } from "./landing/TermsPage";
import { initAnalytics, trackPageview } from "./lib/analytics";

// El panel (Mantine + todas las páginas) se carga solo al salir de la landing.
const AdminShell = lazy(() => import("./AdminShell"));

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
