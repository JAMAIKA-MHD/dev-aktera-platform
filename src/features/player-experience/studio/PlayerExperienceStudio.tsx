import { useEffect, useMemo, useState } from "react";
import type { CampaignSnapshot } from "../domain/campaign";
import { createLocalServices } from "../services/createLocalServices";
import type { ExperienceServices } from "../services/ports";
import { StudioShell } from "./layout/StudioShell";
import { loadIntoStudio } from "./loadIntoStudio";
import { createStudioStore, type StudioStore } from "./store";
import { StudioProvider, type StudioContextValue } from "./StudioContext";
import { useAutosave } from "./useAutosave";

// The Studio (plan §9): the brand edits the presentation of one campaign, and sees the real
// player screens change in a device-sized preview. Rules and prizes stay in the Wizard.

export interface StudioCampaignOption {
  id: string;
  name: string;
}

export interface PlayerExperienceStudioProps {
  // The campaign being dressed; null or absent = standalone, on the demo campaign.
  campaign?: CampaignSnapshot | null;
  // The top bar's campaign picker; hidden without options.
  campaigns?: readonly StudioCampaignOption[];
  onCampaignChange?: (campaignId: string | null) => void;
  onEditCampaignSettings?: StudioContextValue["onEditCampaignSettings"];
  services?: ExperienceServices; // default: the local services of the MVP
  className?: string;
}

export function PlayerExperienceStudio({
  campaign = null,
  services: injected,
  ...props
}: PlayerExperienceStudioProps) {
  const services = useMemo(() => injected ?? createLocalServices(), [injected]);
  // One store per campaign: switching campaigns never mixes two histories.
  return (
    <StudioSession
      key={campaign?.id ?? "standalone"}
      campaign={campaign}
      services={services}
      {...props}
    />
  );
}

function StudioSession({
  campaign,
  services,
  campaigns,
  onCampaignChange,
  onEditCampaignSettings,
  className,
}: Omit<PlayerExperienceStudioProps, "campaign" | "services"> & {
  campaign: CampaignSnapshot | null;
  services: ExperienceServices;
}) {
  const [store] = useState<StudioStore>(() => createStudioStore({ campaign }));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadIntoStudio(store, services.repository).finally(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [store, services]);

  // The same campaign, refetched (a prize renamed in the Wizard): new data, same history.
  useEffect(() => {
    if (store.getState().campaign !== campaign) {
      store.getState().setCampaign(campaign);
    }
  }, [store, campaign]);

  const autosave = useAutosave({ store, repository: services.repository });
  const value = useMemo(
    () => ({ store, services, onEditCampaignSettings }),
    [store, services, onEditCampaignSettings],
  );

  return (
    <StudioProvider value={value}>
      <StudioShell
        loading={!loaded}
        autosave={autosave}
        campaigns={campaigns}
        onCampaignChange={onCampaignChange}
        className={className}
      />
    </StudioProvider>
  );
}
