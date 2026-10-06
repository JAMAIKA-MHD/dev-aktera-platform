// The Player Experience Studio of one campaign, full screen (/studio/:campaignId), outside the
// dashboard shell: the Studio has its own menu. It edits what players see; the rules of the
// campaign (odds, stock, answers) stay in the campaign wizard, which the Studio never opens.
import { Suspense, lazy } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useDashboard } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { PATHS, STANDALONE_STUDIO } from "../paths";
import { STUDIO_BACKEND } from "../studioBackend";

// The Studio is loaded on demand: the dashboard bundle does not carry it.
const CampaignStudio = lazy(() =>
  import("../../features/player-experience").then((module) => ({
    default: module.CampaignStudio,
  })),
);

export default function StudioPage() {
  const { campaignId = "" } = useParams();
  const navigate = useNavigate();
  const { campaigns, campLoading, prizes } = useDashboard();

  const standalone = campaignId === STANDALONE_STUDIO;
  if (!standalone && !campaigns.some((item) => item.id === campaignId)) {
    // A refresh on this URL: the campaigns are still on their way.
    return campLoading ? (
      <PageSpinner className="h-dvh bg-brand-dark" />
    ) : (
      <Navigate to={PATHS.studio} replace />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-brand-dark text-brand-text">
      <Suspense fallback={<PageSpinner className="h-full" />}>
        <CampaignStudio
          className="h-full"
          campaigns={campaigns}
          prizeTemplates={prizes}
          campaignId={standalone ? null : campaignId}
          onClose={() => navigate(PATHS.home)}
          backend={STUDIO_BACKEND}
        />
      </Suspense>
    </div>
  );
}
