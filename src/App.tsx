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
// El contrato de alta se carga aparte: es una ruta privada por enlace, no del panel.
const ContratoPage = lazy(() => import("./pages/ContratoPage"));

// Rutas donde NO se mide nada. En /contrato se escriben el NIT del gimnasio, el
// documento de identificación de quien firma y una cuenta bancaria: no puede haber
// terceros observando esa página, ni siquiera contando visitas.
const SIN_ANALITICA = ["/contrato"];

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-nucleo-flame" />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  const medible = !SIN_ANALITICA.some((ruta) => location.pathname.startsWith(ruta));

  useEffect(() => {
    if (medible) initAnalytics();
  }, [medible]);
  useEffect(() => {
    // Ni siquiera la ruta: el token del enlace viaja en el query string.
    if (medible) trackPageview(location.pathname + location.search);
  }, [medible, location.pathname, location.search]);

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
      {/* Contrato de alta de un gimnasio. Se llega SOLO por el enlace privado que
          se manda por correo (`?t=<token>`): no hay enlaces entrantes, está en el
          Disallow del robots.txt y la propia página inyecta `noindex`. Va fuera del
          AdminShell porque quien la abre no tiene —ni va a tener— sesión. */}
      <Route
        path="/contrato"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ContratoPage />
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
