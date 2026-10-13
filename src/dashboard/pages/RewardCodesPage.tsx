import { Navigate, useParams } from "react-router-dom";

import { RewardCodesView } from "../../components/rewards/RewardCodesView";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { PATHS } from "../paths";

// /prizes/local/:rewardId: the codes of one reward. The reward is read from the live list, so
// every change (expiry, stock) shows here at once.
export default function RewardCodesPage() {
  const { rewardId = "" } = useParams();
  const { prizes, prizeLoading, orgId, updatePrize, refetchPrizes } =
    useDashboard();
  const { profile } = useAuth();

  const reward = prizes.find((item) => item.id === rewardId);
  if (!reward) {
    // Before the rewards arrive (a refresh on this URL) there is nothing to judge yet.
    return prizeLoading ? (
      <PageSpinner />
    ) : (
      <Navigate to={PATHS.prizesLocal} replace />
    );
  }

  return (
    <RewardCodesView
      reward={reward}
      organizationId={orgId}
      canEdit={profile?.role !== "viewer"}
      onUpdatePrize={updatePrize}
      onRefreshPrizes={refetchPrizes}
    />
  );
}
