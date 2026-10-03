// The Player Experience Studio of one campaign (/studio/:campaignId), full screen, without the
// dashboard top bar but with the same menu (a rail, opened by hover or click).
// "Edit in campaign settings" opens the campaign wizard over it.
import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { CampaignWizard } from "../../components/CampaignWizard";
import type { Campaign } from "../../types";
import { useDashboard } from "../DashboardContext";
import { DashboardSidebar } from "../DashboardSidebar";
import { PageSpinner } from "../DashboardShell";
import { PATHS, STANDALONE_STUDIO } from "../paths";
import { STUDIO_BACKEND } from "../studioBackend";

// The Studio is loaded on demand: the dashboard bundle does not carry it.
const CampaignStudio = lazy(() =>
  import("../../features/player-experience").then((module) => ({
    default: module.CampaignStudio,
  })),
);

// "Edit in campaign settings": the wizard step of each part of the rules.
const WIZARD_STEP = { rules: 2, prizes: 3, questions: 4 } as const;

export default function StudioPage() {
  const { campaignId = "" } = useParams();
  const navigate = useNavigate();
  const { campaigns, campLoading, prizes, persistCampaign, refetchCampaigns } =
    useDashboard();

  // The wizard opened over the Studio, and what to do once it closes.
  const [wizard, setWizard] = useState<{
    campaign: Campaign;
    step: 1 | 2 | 3 | 4;
  } | null>(null);
  const wizardDone = useRef<(() => void) | null>(null);

  // The promise settles once the wizard closes, after the campaign was reloaded: the Studio
  // then shows the new prizes or questions, and flags translations the change made outdated.
  const editFromStudio = useCallback(
    (id: string, section: keyof typeof WIZARD_STEP) =>
      new Promise<void>((resolve) => {
        const campaign = campaigns.find((item) => item.id === id);
        if (!campaign) return resolve();
        wizardDone.current = resolve;
        setWizard({ campaign, step: WIZARD_STEP[section] });
      }),
    [campaigns],
  );

  const closeWizard = async () => {
    setWizard(null);
    await refetchCampaigns();
    wizardDone.current?.();
    wizardDone.current = null;
  };

  const standalone = campaignId === STANDALONE_STUDIO;
  if (!standalone && !campaigns.some((item) => item.id === campaignId)) {
    // A refresh on this URL: the campaigns are still on their way.
    return campLoading ? (
      <PageSpinner className="h-dvh bg-brand-dark" />
    ) : (
      <Navigate to={PATHS.studio} replace />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex bg-brand-dark text-brand-text">
      <DashboardSidebar />
      {/* Its own stacking context: the menu, when it opens over the Studio, stays on top. */}
      <div className="relative isolate z-0 h-full min-w-0 flex-1">
        <Suspense fallback={<PageSpinner className="h-full" />}>
          <CampaignStudio
            className="h-full"
            campaigns={campaigns}
            prizeTemplates={prizes}
            campaignId={standalone ? null : campaignId}
            onEditCampaignSettings={editFromStudio}
            onRefreshCampaign={refetchCampaigns}
            onClose={() => navigate(PATHS.home)}
            backend={STUDIO_BACKEND}
          />
        </Suspense>
      </div>

      {wizard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Campaign settings"
          className="fixed inset-0 z-[110] overflow-y-auto bg-brand-dark p-4 sm:p-8"
        >
          <div className="mx-auto max-w-6xl">
            <CampaignWizard
              key={`studio-wizard-${wizard.campaign.id}-${wizard.step}`}
              prizes={prizes}
              editingCampaign={wizard.campaign}
              initialStep={wizard.step}
              onSave={async (campaign) => {
                await persistCampaign(campaign);
                await closeWizard();
              }}
              onCancel={() => void closeWizard()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
