import { Navigate, Route, Routes } from "react-router-dom";
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
import { AuditPage } from "./pages/AuditPage";
import { PasswordResetConfirmPage } from "./pages/PasswordResetConfirmPage";
import { PlatformGymsPage } from "./pages/PlatformGymsPage";
import { CommunityPage } from "./pages/CommunityPage";
import { ClubAdminPage } from "./pages/ClubAdminPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PosPage } from "./pages/PosPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { BusinessReportPage } from "./pages/BusinessReportPage";

function Protected({ children }: { children: JSX.Element }) {
  const { authenticated, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Cargando…</div>;
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
        <Route path="atletas" element={<AthletesPage />} />
        <Route path="pagos" element={<PaymentsPage />} />
        <Route path="planes" element={<PlansPage />} />
        <Route path="solicitudes" element={<RequestsPage />} />
        <Route path="clases" element={<ClassesPage />} />
        <Route path="comunidad" element={<CommunityPage />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="gastos" element={<ExpensesPage />} />
        <Route path="reportes" element={<BusinessReportPage />} />
        <Route path="club" element={<ClubAdminPage />} />
        <Route path="auditoria" element={<AuditPage />} />
        <Route path="plataforma/gyms" element={<PlatformGymsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
