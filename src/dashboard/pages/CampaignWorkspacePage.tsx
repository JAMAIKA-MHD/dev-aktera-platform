import { Navigate, useNavigate, useParams } from "react-router-dom";

import { CampaignWorkspace } from "../../components/CampaignWorkspace";
import { useDashboard } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { PATHS } from "../paths";

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
      onEditCampaign={(camp) => navigate(PATHS.edit(camp.id))}
      onCustomizePlayerScreen={(camp) => navigate(PATHS.studioFor(camp.id))}
      onRelaunch={(camp) => navigate(PATHS.relaunch(camp.id))}
      onToggleStatus={toggleCampaignStatus}
      onOpenAnalytics={(id) => navigate(PATHS.analyticsFor(id))}
    />
  );
}
