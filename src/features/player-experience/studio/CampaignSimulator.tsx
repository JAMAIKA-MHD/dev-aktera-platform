import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Campaign, PrizeTemplate } from "@/src/types";
import {
  buildCampaignSnapshot,
  type CampaignSnapshot,
} from "../domain/campaign";
import { createLocalServices } from "../services/createLocalServices";
import type { ExperienceServices } from "../services/ports";
import { loadIntoStudio } from "./loadIntoStudio";
import { PreviewViewport } from "./preview/PreviewViewport";
import { createStudioStore, DEFAULT_VIEWPORT } from "./store";
import { StudioProvider } from "./StudioContext";

// The dashboard's player sandbox (tasks.md T7.2): the real runtime, in its own document at the
// size of a phone (390 × 844, zoomed to fit the drawer), playing the whole journey on the demo
// gateway with what the brand saved in the Studio. Never PlayerExperience rendered in place:
// it would follow the dashboard's window instead of the device (plan, principle 10).

export interface CampaignSimulatorProps {
  campaigns: readonly Campaign[];
  prizeTemplates: readonly Pick<PrizeTemplate, "id" | "name">[];
  campaignId: string | null; // null or unknown = the default experience, on the demo campaign
  services?: ExperienceServices; // default: the local services of the MVP
}

export function CampaignSimulator({
  campaigns,
  prizeTemplates,
  campaignId,
  services: injected,
}: CampaignSimulatorProps) {
  const services = useMemo(() => injected ?? createLocalServices(), [injected]);
  const campaign = campaigns.find((item) => item.id === campaignId) ?? null;
  const snapshot = useMemo(
    () => (campaign ? buildCampaignSnapshot(campaign, prizeTemplates) : null),
    [campaign, prizeTemplates],
  );
  // A new campaign, a new journey: nothing of the previous one carries over.
  return (
    <SimulatorSession
      key={snapshot?.id ?? "default"}
      snapshot={snapshot}
      services={services}
    />
  );
}

function SimulatorSession({
  snapshot,
  services,
}: {
  snapshot: CampaignSnapshot | null;
  services: ExperienceServices;
}) {
  // The Studio's store, only for what the preview reads: always the same phone, never the
  // device remembered by the Studio, and nothing is ever saved from here.
  const [store] = useState(() =>
    createStudioStore({ campaign: snapshot, viewport: DEFAULT_VIEWPORT }),
  );
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

  // The campaign refetched while the drawer is open: same journey, new data.
  useEffect(() => {
    if (store.getState().campaign !== snapshot) {
      store.getState().setCampaign(snapshot);
    }
  }, [store, snapshot]);

  const [restartKey, setRestartKey] = useState(0);
  const value = useMemo(() => ({ store, services }), [store, services]);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <span className="size-6 animate-spin rounded-full border-2 border-card-border border-t-brand-text-muted" />
        <span className="sr-only">Loading the player experience</span>
      </div>
    );
  }
  return (
    <StudioProvider value={value}>
      <div className="flex min-h-0 flex-1 flex-col" data-xp-simulator>
        <PreviewViewport restartKey={restartKey} />
        <button
          type="button"
          onClick={() => setRestartKey((key) => key + 1)}
          className="flex min-h-10 items-center justify-center gap-1.5 border-t border-card-border bg-card-bg text-xs font-bold text-brand-text-muted transition hover:bg-card-hover hover:text-brand-text active:scale-95"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Play again
        </button>
      </div>
    </StudioProvider>
  );
}
