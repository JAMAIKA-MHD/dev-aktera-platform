import type { CampaignSnapshot } from "../../domain/campaign";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import type { ExperienceFlow } from "../useExperienceFlow";

// What every screen of the journey receives from PlayerExperience.

export interface FrameChrome {
  logoUrl: string | null;
  statusBadge: string | null; // "Demo" while the gateway is not live (B6)
  live: boolean;
}

export interface ScreenProps {
  flow: ExperienceFlow;
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  locale: Locale;
  chrome: FrameChrome;
}

// Every button of the journey reports its click, then emits its event (B4).
export function press(
  flow: ExperienceFlow,
  action: () => void,
  cta: "primary" | "secondary" | "teaser" | "game",
): () => void {
  return () => {
    flow.track("cta_clicked", { cta });
    action();
  };
}
