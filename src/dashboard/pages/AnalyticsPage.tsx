import { useParams } from "react-router-dom";

import { AnalyticsCenter } from "../../components/AnalyticsCenter";

export default function AnalyticsPage() {
  const { campaignId } = useParams();
  return (
    <AnalyticsCenter
      key={campaignId ?? "all"}
      initialCampaignId={campaignId ?? null}
    />
  );
}
