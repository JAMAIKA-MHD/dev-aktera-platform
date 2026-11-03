import { Suspense, lazy } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Palette } from "lucide-react";

import { CampaignWorkspace } from "../../components/CampaignWorkspace";
import { CxButton } from "../../components/campaigns/campaignUi";
import { useDashboard } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { FROM_CAMPAIGN_DETAILS, PATHS } from "../paths";
import { STUDIO_BACKEND } from "../studioBackend";

// The real runtime in a phone-sized frame, with the design saved in the Studio (demo gateway).
// Silent on this page, and its bar leads to the Player Studio instead of "Play again".
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
            silent
            footer={
              <div className="p-3">
                <CxButton
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate(PATHS.studioFor(campaign.id))}
                >
                  <Palette aria-hidden />
                  Customize player screens
                </CxButton>
              </div>
            }
          />
        </Suspense>
      }
    />
  );
}
