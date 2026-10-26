import { Suspense, lazy } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { CampaignWorkspace } from "../../components/CampaignWorkspace";
import { useDashboard } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { FROM_CAMPAIGN_DETAILS, PATHS } from "../paths";
import { STUDIO_BACKEND } from "../studioBackend";

// The real runtime in a phone-sized frame, with the design saved in the Studio (demo gateway).
const CampaignSimulator = lazy(() =>
  import("../../features/player-experience").then((module) => ({
    default: module.CampaignSimulator,
  })),
);

export default function CampaignWorkspacePage() {
  const { campaignId = "" } = useParams();
  const navigate = useNavigate();
  const { campaigns, campLoading, prizes, leads, toggleCampaignStatus } =
    useDashboard();

  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    // Before the campaigns arrive (a refresh on this URL) there is nothing to judge yet.
    return campLoading ? (
      <PageSpinner />
    ) : (
      <Navigate to={PATHS.campaigns} replace />
    );
  }

  return (
    <CampaignWorkspace
      campaign={campaign}
      prizes={prizes}
      leads={leads}
      onBack={() => navigate(PATHS.campaigns)}
      onEditCampaign={(camp) =>
        navigate(PATHS.edit(camp.id), { state: FROM_CAMPAIGN_DETAILS })
      }
      onCustomizePlayerScreen={(camp) => navigate(PATHS.studioFor(camp.id))}
      onRelaunch={(camp) =>
        navigate(PATHS.relaunch(camp.id), { state: FROM_CAMPAIGN_DETAILS })
      }
      onToggleStatus={toggleCampaignStatus}
      onOpenAnalytics={(id) => navigate(PATHS.analyticsFor(id))}
      preview={
        <Suspense fallback={<PageSpinner className="flex-1" />}>
          <CampaignSimulator
            campaigns={campaigns}
            prizeTemplates={prizes}
            campaignId={campaign.id}
            backend={STUDIO_BACKEND}
            bare
          />
        </Suspense>
      }
    />
  );
}
