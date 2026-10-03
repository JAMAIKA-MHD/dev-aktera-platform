import { useNavigate } from "react-router-dom";

import { CampaignsList } from "../../components/CampaignsList";
import { useDashboard } from "../DashboardContext";
import { PATHS } from "../paths";

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { campaigns, toggleCampaignStatus, archiveCampaign, deleteCampaign } =
    useDashboard();
  return (
    <CampaignsList
      campaigns={campaigns}
      onSelectCampaign={(id) => navigate(PATHS.campaign(id))}
      onEditCampaign={(camp) => navigate(PATHS.edit(camp.id))}
      onCustomizePlayerScreen={(camp) => navigate(PATHS.studioFor(camp.id))}
      onRelaunch={(camp) => navigate(PATHS.relaunch(camp.id))}
      onToggleStatus={toggleCampaignStatus}
      onArchive={archiveCampaign}
      onDelete={deleteCampaign}
      onOpenAnalytics={(id) => navigate(PATHS.analyticsFor(id))}
      onOpenWizard={() => navigate(PATHS.create)}
    />
  );
}
