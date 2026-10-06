// The campaign wizard: a new campaign (/create), an edit (/create/:id/edit) or a relaunch
// pre-filled from an existing campaign (/create/:id/relaunch).
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { CampaignWizard } from "../../components/CampaignWizard";
import { useDashboard, type CampaignDraft } from "../DashboardContext";
import { PageSpinner } from "../DashboardShell";
import { PATHS } from "../paths";

export default function CreatorPage({
  mode,
}: {
  mode: "create" | "edit" | "relaunch";
}) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
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

  const save = async (draft: CampaignDraft) => {
    await persistCampaign(draft);
    await refetchCampaigns();
    await refetchPrizes();
    navigate(PATHS.campaigns);
  };

  return (
    <CampaignWizard
      key={`${mode}-${source?.id ?? "new"}`}
      prizes={prizes}
      onSave={save}
      onOpenPlayerScreenEditor={(camp: { id?: string }) =>
        navigate(camp?.id ? PATHS.studioFor(camp.id) : PATHS.studio)
      }
      onCancel={() => navigate(PATHS.campaigns)}
      relaunchDraft={mode === "relaunch" ? source : null}
      editingCampaign={mode === "edit" ? source : null}
    />
  );
}
