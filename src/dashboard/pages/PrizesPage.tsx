import { PrizesManager } from "../../components/PrizesManager";
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
    <PrizesManager
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
