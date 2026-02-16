import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import ToastContainer from "./components/Toast";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import TeamDashboard from "./pages/team/Dashboard";
import LiveAuction from "./pages/team/LiveAuction";
import History from "./pages/team/History";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Teams from "./pages/admin/Teams";
import Items from "./pages/admin/Items";
import AuctionControl from "./pages/admin/AuctionControl";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "ADMIN" | "TEAM" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}>
        <div className="loader" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loader" style={{ margin: "4rem auto" }} />;
  if (!user) return <Navigate to="/login" />;
  if (user.role === "ADMIN") return <Navigate to="/admin" />;
  return <Navigate to="/dashboard" />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Team routes */}
        <Route path="/dashboard" element={<ProtectedRoute role="TEAM"><TeamDashboard /></ProtectedRoute>} />
        <Route path="/auction" element={<ProtectedRoute role="TEAM"><LiveAuction /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute role="TEAM"><History /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/teams" element={<ProtectedRoute role="ADMIN"><Teams /></ProtectedRoute>} />
        <Route path="/admin/items" element={<ProtectedRoute role="ADMIN"><Items /></ProtectedRoute>} />
        <Route path="/admin/auction" element={<ProtectedRoute role="ADMIN"><AuctionControl /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
