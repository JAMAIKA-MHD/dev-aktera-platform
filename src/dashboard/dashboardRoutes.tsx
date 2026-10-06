// The dashboard's route tree, one URL per screen. AppRouter mounts it behind the auth guard;
// tests mount it under a MemoryRouter.
//
//   DashboardProvider        shared data, loaded once
//   ├─ DashboardShell        sidebar + top bar, the page in <Outlet />
//   │   /  /campaigns  /campaigns/:id  /create  /create/:id/edit  /create/:id/relaunch
//   │   /prizes  /analytics  /analytics/:id  /billing  /account  /studio
//   └─ /studio/:campaignId   the Studio, full screen, no shell
//
// Pages are loaded on demand, so the dashboard bundle carries only what is opened.
import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route } from "react-router-dom";

import { DashboardProvider } from "./DashboardContext";
import { DashboardShell, PageSpinner } from "./DashboardShell";

const HomePage = lazy(() => import("./pages/HomePage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const CampaignWorkspacePage = lazy(
  () => import("./pages/CampaignWorkspacePage"),
);
const CreatorPage = lazy(() => import("./pages/CreatorPage"));
const PrizesPage = lazy(() => import("./pages/PrizesPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const StudioCampaignsRoute = lazy(() => import("./pages/StudioCampaignsRoute"));
const StudioPage = lazy(() => import("./pages/StudioPage"));

export const dashboardRoutes = (
  <Route
    element={
      <DashboardProvider>
        <Outlet />
      </DashboardProvider>
    }
  >
    <Route element={<DashboardShell />}>
      <Route index element={<HomePage />} />
      <Route path="campaigns" element={<CampaignsPage />} />
      <Route path="campaigns/:campaignId" element={<CampaignWorkspacePage />} />
      <Route path="create" element={<CreatorPage mode="create" />} />
      <Route
        path="create/:campaignId/edit"
        element={<CreatorPage mode="edit" />}
      />
      <Route
        path="create/:campaignId/relaunch"
        element={<CreatorPage mode="relaunch" />}
      />
      <Route path="prizes" element={<PrizesPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="analytics/:campaignId" element={<AnalyticsPage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="studio" element={<StudioCampaignsRoute />} />
    </Route>
    <Route
      path="studio/:campaignId"
      element={
        <Suspense fallback={<PageSpinner className="h-dvh bg-brand-dark" />}>
          <StudioPage />
        </Suspense>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route>
);
