// The Player Studio entry: the brand's campaigns in a table, before the Studio.
import { useNavigate } from "react-router-dom";

import { StudioCampaignsPage } from "../../components/playerStudio/StudioCampaignsPage";
import { useDashboard } from "../DashboardContext";
import { PATHS } from "../paths";

export default function StudioCampaignsRoute() {
  const navigate = useNavigate();
  const { campaigns, campLoading, campError, orgId, refetchCampaigns } =
    useDashboard();
  return (
    <StudioCampaignsPage
      campaigns={campaigns}
      loading={campLoading}
      error={campError}
      organizationId={orgId}
      onOpenCampaign={(id) => navigate(PATHS.studioFor(id))}
      onCreateCampaign={() => navigate(PATHS.create)}
      onRetry={() => void refetchCampaigns()}
    />
  );
}
