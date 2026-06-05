import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store/auth";
import { useAuth } from "./hooks/useAuth";
import AppShell from "./components/layout/AppShell";
import Home from "./pages/Home";
import ClosetDetail from "./pages/ClosetDetail";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

function AuthBootstrap() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser.data) {
      setUser(currentUser.data);
    }
  }, [currentUser.data, setUser]);

  if (user && currentUser.isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ws-muted)",
          fontFamily: "var(--ws-mono)",
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase"
        }}
      >
        Loading wardrobe...
      </div>
    );
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <Routes>
      <Route element={<AuthBootstrap />}>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {user ? (
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/closets/:id" element={<ClosetDetail />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<Landing />} />
            {/* deep-linked protected route still bounces to login */}
            <Route path="/closets/:id" element={<Navigate to="/login" replace />} />
          </>
        )}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
