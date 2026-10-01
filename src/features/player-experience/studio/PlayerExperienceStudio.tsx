import { useEffect, useMemo, useState } from "react";
import type { CampaignSnapshot } from "../domain/campaign";
import { createLocalServices } from "../services/createLocalServices";
import type { ExperienceServices } from "../services/ports";
import { StudioShell } from "./layout/StudioShell";
import { loadIntoStudio } from "./loadIntoStudio";
import { loadViewportPrefs, saveViewportPrefs } from "./preview/viewportPrefs";
import { createStudioStore, type StudioStore } from "./store";
import { StudioProvider, type StudioContextValue } from "./StudioContext";
import { useAutosave } from "./useAutosave";

// The Studio (plan §9): the brand edits the presentation of one campaign, and sees the real
// player screens change in a device-sized preview. Rules and prizes stay in the Wizard.

export interface PlayerExperienceStudioProps {
  // The campaign being dressed; null or absent = standalone, on the demo campaign.
  campaign?: CampaignSnapshot | null;
  onEditCampaignSettings?: StudioContextValue["onEditCampaignSettings"];
  onRefreshCampaign?: () => void;
  // The campaign's draw rules (buildDemoRules), shown read-only in the Game panel.
  rules?: StudioContextValue["rules"];
  services?: ExperienceServices; // default: the local services of the MVP
  onClose?: () => void; // a "Back to dashboard" button in the top bar
  className?: string;
}

export function PlayerExperienceStudio({
  campaign = null,
  services: injected,
  ...props
}: PlayerExperienceStudioProps) {
  const services = useMemo(() => injected ?? createLocalServices(), [injected]);
  // One store per campaign: opening another campaign never mixes two histories.
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
  onEditCampaignSettings,
  onRefreshCampaign,
  rules,
  onClose,
  className,
}: Omit<PlayerExperienceStudioProps, "campaign" | "services"> & {
  campaign: CampaignSnapshot | null;
  services: ExperienceServices;
}) {
  const [store] = useState<StudioStore>(() =>
    createStudioStore({ campaign, viewport: loadViewportPrefs() }),
  );
  // The preview's device is remembered per browser, never in the experience (T6.9).
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.ui.viewport !== previous.ui.viewport) {
          saveViewportPrefs(state.ui.viewport);
        }
      }),
    [store],
  );
  const [loaded, setLoaded] = useState(false);
  // The saved design could not be read (server unreachable): nothing may be edited nor saved
  // until it is, or the defaults would be saved over it.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setLoadError(null);
    loadIntoStudio(store, services.repository).then(
      () => {
        if (active) setLoaded(true);
      },
      (error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load the saved design.",
        );
      },
    );
    return () => {
      active = false;
    };
  }, [store, services, loadAttempt]);

  // The same campaign, refetched (a prize renamed in the Wizard): new data, same history.
  useEffect(() => {
    if (store.getState().campaign !== campaign) {
      store.getState().setCampaign(campaign);
    }
  }, [store, campaign]);

  const autosave = useAutosave({
    store,
    repository: services.repository,
    enabled: loaded,
  });
  const value = useMemo(
    () => ({
      store,
      services,
      onEditCampaignSettings,
      onRefreshCampaign,
      rules,
    }),
    [store, services, onEditCampaignSettings, onRefreshCampaign, rules],
  );

  return (
    <StudioProvider value={value}>
      <StudioShell
        loading={!loaded}
        loadError={loadError}
        onRetryLoad={() => setLoadAttempt((attempt) => attempt + 1)}
        autosave={autosave}
        onClose={onClose}
        className={className}
      />
    </StudioProvider>
  );
}
