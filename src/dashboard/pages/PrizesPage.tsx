import { RewardLibrary } from "../../components/rewards/RewardLibrary";
import { useDashboard } from "../DashboardContext";

export default function PrizesPage() {
  const {
    prizes,
    campaigns,
    orgId,
    addPrize,
    updatePrize,
    deletePrize,
    refetchPrizes,
  } = useDashboard();
  return (
    <RewardLibrary
      prizes={prizes}
      campaigns={campaigns}
      organizationId={orgId}
      onAddPrize={addPrize}
      onUpdatePrize={updatePrize}
      onDeletePrize={deletePrize}
      onRefreshPrizes={refetchPrizes}
    />
  );
}
