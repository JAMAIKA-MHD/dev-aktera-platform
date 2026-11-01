import { Link, useParams } from "react-router-dom";
import { BarChart3 } from "lucide-react";

import { AnalyticsCenter } from "../../components/AnalyticsCenter";
import { EmptyState, LoadingState } from "../../components/ui/EmptyState";
import { useDashboard } from "../DashboardContext";
import { PATHS } from "../paths";

// With no participant yet the page keeps its whole layout: this only sits above the cards.
function NoDataNotice({ hasCampaigns }: { hasCampaigns: boolean }) {
  return (
    <EmptyState
      icon={BarChart3}
      variant="card"
      title="No data to analyze yet"
      description="Analytics appear automatically once your first campaign receives participants."
    >
      {hasCampaigns ? (
        <Link to={PATHS.campaigns} className="es-link">
          Want to preview your campaigns?
        </Link>
      ) : (
        <Link to={PATHS.create} className="es-link">
          Want to create your first campaign?
        </Link>
      )}
    </EmptyState>
  );
}

export default function AnalyticsPage() {
  const { campaignId } = useParams();
  const { campaigns, leads, leadsLoading, leadsError } = useDashboard();

  // A failure is left to the page below, which shows its own error.
  const noData = !campaignId && !leadsError && leads.length === 0;
  if (noData && leadsLoading) {
    return <LoadingState rows={4} label="Loading analytics" />;
  }

  return (
    <AnalyticsCenter
      key={campaignId ?? "all"}
      initialCampaignId={campaignId ?? null}
      notice={
        noData ? <NoDataNotice hasCampaigns={campaigns.length > 0} /> : null
      }
    />
  );
}
