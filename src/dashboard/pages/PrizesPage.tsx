import { RewardLibraryHub } from "../../components/rewards/RewardLibraryHub";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard } from "../DashboardContext";

// /prizes: the Reward Library's entry, one card per library (Local, and the partners to come).
export default function PrizesPage() {
  const { prizes, orgId } = useDashboard();
  const { profile } = useAuth();
  return (
    <RewardLibraryHub
      prizes={prizes}
      organizationId={orgId}
      canManage={profile !== null && profile.role !== "viewer"}
    />
  );
}
