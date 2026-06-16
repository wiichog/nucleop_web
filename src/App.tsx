import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "./landing/LandingPage";
import { PrivacyPage } from "./landing/PrivacyPage";
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
