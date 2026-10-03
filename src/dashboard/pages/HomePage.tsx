import { useNavigate } from "react-router-dom";

import { DashboardHome } from "../../components/DashboardHome";
import { useDashboard } from "../DashboardContext";
import { PATHS, tabPath } from "../paths";

export default function HomePage() {
  const navigate = useNavigate();
  const { campaigns, prizes, leads } = useDashboard();
  return (
    <DashboardHome
      campaigns={campaigns}
      prizes={prizes}
      leads={leads}
      onNavigate={(tab) => navigate(tabPath(tab))}
      onSelectCampaign={(id) => navigate(PATHS.campaign(id))}
      onOpenWizard={() => navigate(PATHS.create)}
    />
  );
}
