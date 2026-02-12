import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PosPage from "./pages/PosPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

const SESSION_KEY = "smartpos_session";

const loadSession = () => {
  try {
    const rawSession = window.localStorage.getItem(SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    return null;
  }
};

function App() {
  const [session, setSession] = React.useState(() => loadSession());
  const isAuthenticated = Boolean(session?.token);

  const handleLogin = (authPayload) => {
    setSession(authPayload);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(authPayload));
  };

  const handleLogout = () => {
    setSession(null);
    window.localStorage.removeItem(SESSION_KEY);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />}
      />

      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AppShell user={session.user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="pos" element={<PosPage user={session?.user} />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage user={session?.user} />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
