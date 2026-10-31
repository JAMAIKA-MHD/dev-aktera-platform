// The campaign wizard: a new campaign (/create), an edit (/create/:id/edit) or a relaunch
// pre-filled from an existing campaign (/create/:id/relaunch).
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { CampaignWizard } from "../../components/CampaignWizard";
import { useDashboard, type CampaignDraft } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { FROM_CAMPAIGN_DETAILS, PATHS } from "../paths";
import CampaignsPage from "./CampaignsPage";
import CampaignWorkspacePage from "./CampaignWorkspacePage";

export default function CreatorPage({
  mode,
}: {
  mode: "create" | "edit" | "relaunch";
}) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    campaigns,
    campLoading,
    prizes,
    persistCampaign,
    refetchCampaigns,
    refetchPrizes,
  } = useDashboard();

  const source =
    mode === "create"
      ? null
      : (campaigns.find((item) => item.id === campaignId) ?? null);
  if (mode !== "create" && !source) {
    return campLoading ? (
      <PageSpinner />
    ) : (
      <Navigate to={PATHS.campaigns} replace />
    );
  }

  // Opened from a campaign's detail page, the wizard closes back onto that page.
  const detailsPath =
    source && location.state?.from === FROM_CAMPAIGN_DETAILS.from
      ? PATHS.campaign(source.id)
      : null;

  const save = async (draft: CampaignDraft) => {
    await persistCampaign(draft);
    await refetchCampaigns();
    await refetchPrizes();
    // A relaunch creates another campaign: it shows up in the list, not on the source's page.
    navigate((mode === "edit" && detailsPath) || PATHS.campaigns);
  };

  // The editor is a window over the screen it was opened from, which stays visible (and inert) behind.
  return (
    <>
      <div inert aria-hidden>
        {detailsPath ? <CampaignWorkspacePage /> : <CampaignsPage />}
      </div>
      <CampaignWizard
        key={`${mode}-${source?.id ?? "new"}`}
        prizes={prizes}
        onSave={save}
        onOpenPlayerScreenEditor={(camp: { id?: string }) =>
          navigate(camp?.id ? PATHS.studioFor(camp.id) : PATHS.studio)
        }
        onCancel={() => navigate(detailsPath ?? PATHS.campaigns)}
        relaunchDraft={mode === "relaunch" ? source : null}
        editingCampaign={mode === "edit" ? source : null}
      />
    </>
  );
}
