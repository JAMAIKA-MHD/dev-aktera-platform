import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CompleteOrganizationSetupPage from "./pages/auth/CompleteOrganizationSetupPage";
import PlayerFlowPage from "./pages/play/PlayerFlowPage";
import { PlayerUIMaker } from "./components/player-ui-maker";
import App from "./App";

// Player Experience runtime in a document of its own (Studio preview, responsive checks).
// Loaded on demand: the dashboard bundle does not carry the runtime.
const XpFrame = lazy(() =>
  import("./features/player-experience").then((module) => ({
    default: module.FrameHost,
  })),
);

// Player Experience Studio, standalone, for development only until T7.1 mounts it in the
// dashboard (/studio). Not part of a production build.
const XpStudio = lazy(() =>
  import("./features/player-experience").then((module) => ({
    default: () => (
      <div className="h-dvh">
        <module.PlayerExperienceStudio />
      </div>
    ),
  })),
);

/** Redirects to /login when no session; shows a full-screen spinner while loading. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, authError, needsOrganizationSetup } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-red-100 rounded-3xl shadow-sm p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            We could not load your account
          </h2>
          <p className="text-sm text-slate-500">{authError}</p>
        </div>
      </div>
    );
  }

  if (needsOrganizationSetup) {
    return <CompleteOrganizationSetupPage />;
  }

  return <>{children}</>;
}

export default function AppRouter() {
  const isRegistrationEnabled =
    import.meta.env.VITE_REGISTRATION_ENABLED === "true";

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          {isRegistrationEnabled && (
            <Route path="/register" element={<RegisterPage />} />
          )}

          {/* Public player portal — wrapped in PlayerProvider for game state */}
          <Route
            path="/play/:slug"
            element={
              <PlayerProvider>
                <PlayerFlowPage />
              </PlayerProvider>
            }
          />

          {/* Player Experience frame: demo services only, no server data */}
          <Route
            path="/xp-frame"
            element={
              <Suspense fallback={null}>
                <XpFrame />
              </Suspense>
            }
          />

          {import.meta.env.DEV && (
            <Route
              path="/xp-studio"
              element={
                <Suspense fallback={null}>
                  <XpStudio />
                </Suspense>
              }
            />
          )}

          {/* Standalone Player UI Maker route */}
          <Route path="/ui-maker" element={<PlayerUIMaker />} />

          {/* Protected operator dashboard */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
