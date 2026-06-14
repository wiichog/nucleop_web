import { Navigate, Route, Routes } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LandingPage } from "./landing/LandingPage";
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
import { PlatformGymsPage } from "./pages/PlatformGymsPage";
import { CommunityPage } from "./pages/CommunityPage";
import { TicketsPage } from "./pages/TicketsPage";
import { ClubAdminPage } from "./pages/ClubAdminPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PosPage } from "./pages/PosPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { BusinessReportPage } from "./pages/BusinessReportPage";
import { ClubsPage } from "./pages/ClubsPage";
import { ProfilePage } from "./pages/ProfilePage";

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password-reset" element={<PasswordResetConfirmPage />} />
      <Route
        path="/panel"
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
