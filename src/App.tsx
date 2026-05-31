import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AthletesPage } from "./pages/AthletesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PlansPage } from "./pages/PlansPage";

function Protected({ children }: { children: JSX.Element }) {
  const { authenticated, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Cargando…</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/atletas" element={<AthletesPage />} />
        <Route path="/pagos" element={<PaymentsPage />} />
        <Route path="/planes" element={<PlansPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
