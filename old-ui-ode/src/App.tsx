/**
 * App — Root component with React Router configuration.
 *
 * Route structure:
 *   Public auth routes:
 *     /login              → Login
 *     /register           → Register
 *
 *   Public play routes (wrapped in PlayerProvider):
 *     /play/:slug         → Live campaign landing
 *     /play/:slug/game    → Live quiz / wheel flow
 *     /play/:slug/result  → Live result + coupon confirmation
 *
 *   Protected dashboard routes (wrapped in ProtectedRoute + DashboardLayout):
 *     /dashboard                  → Placeholder (Accueil)
 *     /dashboard/campaigns        → Placeholder (Campagnes)
 *     /dashboard/campaigns/:id    → Placeholder (Campaign detail)
 *     /dashboard/prizes           → Placeholder (Prix)
 *     /dashboard/inventory        → Placeholder (Inventaire)
 *     /dashboard/analytics         → Analytics
 *     /dashboard/account           → Account
 *     /dashboard/billing           → Billing
 *     /dashboard/sandbox           → Interactive Player Sandbox
 *
 *   / → redirect to /dashboard
 *   * → redirect to /dashboard
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/play/Landing';
import Game from './pages/play/Game';
import Result from './pages/play/Result';
import Home from './pages/dashboard/Home';
import CampaignList from './pages/dashboard/CampaignList';
import CampaignCreator from './pages/dashboard/CampaignCreator';
import CampaignDetail from './pages/dashboard/CampaignDetail';
import PrizeTemplates from './pages/dashboard/PrizeTemplates';
import Inventory from './pages/dashboard/Inventory';
import Analytics from './pages/dashboard/Analytics';
import Account from './pages/dashboard/Account';
import Billing from './pages/dashboard/Billing';
import PlayerSandbox from './pages/dashboard/PlayerSandbox';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---------- Auth routes ---------- */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ---------- Public play routes ---------- */}
          <Route
            path="/play/:slug"
            element={
              <PlayerProvider>
                <Landing />
              </PlayerProvider>
            }
          />
          <Route
            path="/play/:slug/game"
            element={
              <PlayerProvider>
                <Game />
              </PlayerProvider>
            }
          />
          <Route
            path="/play/:slug/result"
            element={
              <PlayerProvider>
                <Result />
              </PlayerProvider>
            }
          />

          {/* ---------- Protected dashboard routes ---------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Accueil */}
            <Route index element={<Home />} />
            {/* Campagnes */}
            <Route path="campaigns" element={<CampaignList />} />
            <Route path="campaigns/new" element={<CampaignCreator />} />
            <Route path="campaigns/:id/edit" element={<CampaignCreator />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            {/* Prix */}
            <Route path="prizes" element={<PrizeTemplates />} />
            {/* Inventaire */}
            <Route path="inventory" element={<Inventory />} />
            {/* Analytiques */}
            <Route path="analytics" element={<Analytics />} />
            {/* Compte */}
            <Route path="account" element={<Account />} />
            {/* Facturation */}
            <Route path="billing" element={<Billing />} />
            <Route path="sandbox" element={<PlayerSandbox />} />
          </Route>

          {/* ---------- Fallbacks ---------- */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
