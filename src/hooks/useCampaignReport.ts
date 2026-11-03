import { useCallback, useState } from "react";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { downloadDocxFile } from "../lib/exportUtils";
import { fetchCampaignAnalyticsReport } from "../services/analyticsService";
import type { CampaignAnalyticsReport } from "../types";

// Campaign reports fetched at the same time for the all-campaigns report.
const PARALLEL_FETCHES = 3;

/** Each campaign's report, in the order of the ids, a few requests at a time. */
async function fetchReports(
  campaignIds: string[],
): Promise<CampaignAnalyticsReport[]> {
  const reports: CampaignAnalyticsReport[] = new Array(campaignIds.length);
  let next = 0;
  const worker = async () => {
    while (next < campaignIds.length) {
      const index = next++;
      reports[index] = await fetchCampaignAnalyticsReport(campaignIds[index]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(PARALLEL_FETCHES, campaignIds.length) },
      worker,
    ),
  );
  return reports;
}

/**
 * Generates and downloads the analytics report (.docx) of a single campaign, or of every
 * campaign listed (generateAllReport).
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

  const generateAllReport = useCallback(async (campaignIds: string[]) => {
    setGenerating(true);
    setError(null);
    try {
      const [
        reports,
        { buildAllCampaignsReportDocx, allCampaignsReportFilename },
      ] = await Promise.all([
        fetchReports(campaignIds),
        import("../lib/campaignReportDocx"),
      ]);
      downloadDocxFile(
        await buildAllCampaignsReportDocx(reports),
        allCampaignsReportFilename(reports),
      );
    } catch (err) {
      setError(
        toFriendlyErrorMessage(
          err,
          "Failed to generate the report of all campaigns.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }, []);

  return { generateReport, generateAllReport, generating, error };
}
