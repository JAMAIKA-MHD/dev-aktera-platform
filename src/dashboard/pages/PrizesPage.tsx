import { RewardLibraryHub } from "../../components/rewards/RewardLibraryHub";
import { useDashboard } from "../DashboardContext";

// /prizes: the Reward Library's entry, one card per library (Local, and the partners to come).
export default function PrizesPage() {
  const { prizes } = useDashboard();
  return <RewardLibraryHub prizes={prizes} />;
}
