import { useNavigate } from "react-router-dom";

import { CampaignsList } from "../../components/CampaignsList";
import { useDashboard } from "../DashboardContext";
import { PATHS } from "../paths";
import { useCampaignStatusToggle } from "../useCampaignStatusToggle";

export default function CampaignsPage() {
  const navigate = useNavigate();
  const {
    campaigns,
    campLoading,
    campError,
    refetchCampaigns,
    archiveCampaign,
    deleteCampaign,
  } = useDashboard();
  const { toggleStatus, publishedDialog } = useCampaignStatusToggle();
  return (
    <>
      <CampaignsList
        campaigns={campaigns}
        loading={campLoading}
        error={campError}
        onRetry={() => void refetchCampaigns()}
        onQuickStart={(gameType) =>
          navigate(PATHS.create, { state: { gameType } })
        }
        onSelectCampaign={(id) => navigate(PATHS.campaign(id))}
        onEditCampaign={(camp) => navigate(PATHS.edit(camp.id))}
        onCustomizePlayerScreen={(camp) => navigate(PATHS.studioFor(camp.id))}
        onRelaunch={(camp) => navigate(PATHS.relaunch(camp.id))}
        onToggleStatus={(id) => void toggleStatus(id)}
        onArchive={archiveCampaign}
        onDelete={deleteCampaign}
        onOpenAnalytics={(id) => navigate(PATHS.analyticsFor(id))}
        onOpenWizard={() => navigate(PATHS.create)}
      />
      {publishedDialog}
    </>
  );
}
