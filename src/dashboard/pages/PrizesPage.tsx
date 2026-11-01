import { RewardLibraryHub } from "../../components/rewards/RewardLibraryHub";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard } from "../DashboardContext";

// /prizes: the Reward Library's entry, one card per library (Local, and the partners to come).
export default function PrizesPage() {
  const { prizes, prizeLoading, prizeError, refetchPrizes, orgId } =
    useDashboard();
  const { profile } = useAuth();
  return (
    <RewardLibraryHub
      prizes={prizes}
      loading={prizeLoading}
      error={prizeError}
      onRetry={() => void refetchPrizes()}
      organizationId={orgId}
      canManage={profile !== null && profile.role !== "viewer"}
    />
  );
}
