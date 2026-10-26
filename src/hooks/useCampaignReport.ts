import { useCallback, useState } from "react";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { downloadDocxFile } from "../lib/exportUtils";
import { fetchCampaignAnalyticsReport } from "../services/analyticsService";

/**
 * Generates and downloads the analytics report (.docx) for a single campaign.
 */
export function useCampaignReport() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (campaignId: string) => {
    setGenerating(true);
    setError(null);
    try {
      // The document builder is loaded on demand: it is only needed here.
      const [report, { buildCampaignReportDocx, campaignReportFilename }] =
        await Promise.all([
          fetchCampaignAnalyticsReport(campaignId),
          import("../lib/campaignReportDocx"),
        ]);
      downloadDocxFile(
        await buildCampaignReportDocx(report),
        campaignReportFilename(report),
      );
    } catch (err) {
      setError(
        toFriendlyErrorMessage(
          err,
          "Failed to generate the report for this campaign.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }, []);

  return { generateReport, generating, error };
}
