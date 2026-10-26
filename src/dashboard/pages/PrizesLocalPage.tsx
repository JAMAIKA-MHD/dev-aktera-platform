import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PrizesManager } from "../../components/PrizesManager";
import { useDashboard } from "../DashboardContext";
import { PATHS } from "../paths";

// The Local Library: the brand's own rewards (digital codes and physical rewards).
export default function PrizesLocalPage() {
  const navigate = useNavigate();
  const { prizes, campaigns, addPrize, updatePrize, deletePrize } =
    useDashboard();
  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="max-w-[1800px] mx-auto">
        <Link
          to={PATHS.prizes}
          className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-xs font-bold text-brand-textMuted transition-colors hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Reward Library
        </Link>
      </nav>
      <PrizesManager
        prizes={prizes}
        campaigns={campaigns}
        onAddPrize={addPrize}
        onUpdatePrize={updatePrize}
        onDeletePrize={deletePrize}
        onOpenReward={(reward) => navigate(PATHS.rewardCodes(reward.id))}
      />
    </div>
  );
}
