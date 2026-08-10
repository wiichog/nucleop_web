import { JSX } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAuth } from "./lib/auth";
import { mantineTheme } from "./lib/mantineTheme";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AthletesPage } from "./pages/AthletesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PlansPage } from "./pages/PlansPage";
import { RequestsPage } from "./pages/RequestsPage";
import { ClassesPage } from "./pages/ClassesPage";
import { CoachesPage } from "./pages/CoachesPage";
import { CoachPayrollPage } from "./pages/CoachPayrollPage";
import { AuditPage } from "./pages/AuditPage";
import { PasswordResetConfirmPage } from "./pages/PasswordResetConfirmPage";
import { PlatformAppealsPage } from "./pages/PlatformAppealsPage";
import { PlatformChargebacksPage } from "./pages/PlatformChargebacksPage";
import { PlatformGymsPage } from "./pages/PlatformGymsPage";
import { PlatformReportsPage } from "./pages/PlatformReportsPage";
import { CommunityPage } from "./pages/CommunityPage";
import { TicketsPage } from "./pages/TicketsPage";
import { ClubAdminPage } from "./pages/ClubAdminPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PosPage } from "./pages/PosPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { BusinessReportPage } from "./pages/BusinessReportPage";
import { ClubsPage } from "./pages/ClubsPage";
import { ClubContentPage } from "./pages/ClubContentPage";
import { ProfilePage } from "./pages/ProfilePage";
import { GymProfilePage } from "./pages/GymProfilePage";
// Mantine + datatable solo en este chunk (no en la landing pública).
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.css";
// Aurora va AL FINAL a propósito: redefine variables y materiales de Mantine y
// necesita ganar el desempate de orden en el CSS resultante.
import "./lib/aurora.css";

function Protected({ children }: { children: JSX.Element }) {
  const { authenticated, loading } = useAuth();
  if (loading)
    return (
      <Center mih="100vh">
        <Loader color="flame" />
      </Center>
    );
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Todo el panel de administración (login + /panel/*), con su MantineProvider y CSS.
 * Se carga de forma diferida (React.lazy) desde App, así la landing no descarga Mantine.
 * Las rutas son relativas porque este árbol cuelga del `path="/*"` de App.
 */
export default function AdminShell() {
  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark" forceColorScheme="dark">
      <Notifications position="top-right" />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="password-reset" element={<PasswordResetConfirmPage />} />
        <Route
          path="panel"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          {/* Retención y morosidad se consolidó en Atletas (filtros por pago/riesgo). */}
          <Route path="retencion" element={<Navigate to="/panel/atletas" replace />} />
          <Route path="perfil" element={<ProfilePage />} />
          {/* La ficha del gimnasio (lo que el atleta ve). Distinta de "perfil",
              que es la cuenta de quien entró al panel. */}
          <Route path="gimnasio" element={<GymProfilePage />} />
          <Route path="atletas" element={<AthletesPage />} />
          <Route path="pagos" element={<PaymentsPage />} />
          <Route path="planes" element={<PlansPage />} />
          {/* "servicios" fusionado en Clases (catálogo) + Planes (cobro/activación). */}
          <Route path="servicios" element={<Navigate to="/panel/planes" replace />} />
          <Route path="solicitudes" element={<RequestsPage />} />
          <Route path="clases" element={<ClassesPage />} />
          <Route path="coaches" element={<CoachesPage />} />
          <Route path="coaches-pagos" element={<CoachPayrollPage />} />
          <Route path="comunidad" element={<CommunityPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="clubes" element={<ClubsPage />} />
          {/* Moderación de lo que se escribe DENTRO de los clubes. La ruta NO
              cuelga de /panel/clubes a propósito: el `isActive` del rail usa
              `startsWith`, y anidarla dejaría los dos ítems del menú encendidos. */}
          <Route path="contenido-clubes" element={<ClubContentPage />} />
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="gastos" element={<ExpensesPage />} />
          <Route path="reportes" element={<BusinessReportPage />} />
          {/* Sucursales eliminadas: cada sucursal se maneja como un gimnasio aparte. */}
          <Route path="sucursales" element={<Navigate to="/panel" replace />} />
          <Route path="club" element={<ClubAdminPage />} />
          <Route path="actividad" element={<AuditPage />} />
          <Route path="auditoria" element={<AuditPage />} />
          <Route path="plataforma/gyms" element={<PlatformGymsPage />} />
          <Route path="plataforma/apelaciones" element={<PlatformAppealsPage />} />
          <Route path="plataforma/contracargos" element={<PlatformChargebacksPage />} />
          <Route path="plataforma/reportes" element={<PlatformReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MantineProvider>
  );
}
