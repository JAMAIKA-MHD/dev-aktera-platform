import { useMemo } from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import type { FlowScreen } from "../../domain/flow";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import {
  createLocalServices,
  type ScriptedScenario,
} from "../../services/createLocalServices";
import type { GatewayMode } from "../../services/ports";
import { ServicesProvider } from "../../services/ServicesProvider";
import { resolveAppStorage } from "../../services/storageUrl";
import { safeAreaStyle, type SafeAreaInsets } from "../layout/safeArea";
import { PlayerExperience } from "../PlayerExperience";

// The player journey in /xp-frame (plan §8.1): PlayerExperience on the local services, built
// for the campaign received, as the Studio preview, the separate window and the fixtures
// show it. The route is a composition root, like the public page will be: it chooses the
// services, the runtime only reads them.

export const FRAME_GATEWAYS: readonly GatewayMode[] = ["demo", "scripted"];

export interface FrameExperienceProps {
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  locale: Locale;
  safeArea?: SafeAreaInsets | null;
  gateway: "demo" | "scripted";
  scenario?: ScriptedScenario; // outcome of the scripted gateway
  initialScreen?: FlowScreen;
  allowedGatewayModes?: readonly GatewayMode[]; // a fixture checks the refusal screen
  onFlowEvent?: (screen: FlowScreen) => void;
}

// The screen of a Studio tab; "status" shows the one of the scripted scenario.
export function frameScreen(
  screen: ScreenKey | "status" | null,
  scenario?: ScriptedScenario,
): FlowScreen | undefined {
  if (screen === null) return undefined;
  if (screen !== "status") return screen;
  if (scenario === "duplicate") return "duplicate";
  if (scenario === "closed") return "closed";
  return "error";
}

export function FrameExperience({
  config,
  campaign,
  locale,
  safeArea = null,
  gateway,
  scenario,
  initialScreen,
  allowedGatewayModes = FRAME_GATEWAYS,
  onFlowEvent,
}: FrameExperienceProps) {
  // The Studio sends the campaign again with each configuration: the services only change
  // with its content. A new gateway never restarts the journey, which reads it at draw time.
  const campaignKey = JSON.stringify(campaign);
  const services = useMemo(
    () =>
      createLocalServices({
        participation: gateway,
        campaign: JSON.parse(campaignKey) as CampaignSnapshot,
        scenario,
        // Images uploaded from the Studio live in Supabase Storage (backend B4.2).
        resolveStorage: resolveAppStorage,
      }),
    [campaignKey, gateway, scenario],
  );
  return (
    <div style={safeAreaStyle(safeArea)}>
      <ServicesProvider services={services}>
        <PlayerExperience
          config={config}
          campaign={campaign}
          locale={locale}
          allowedGatewayModes={allowedGatewayModes}
          initialScreen={initialScreen}
          onFlowEvent={onFlowEvent}
        />
      </ServicesProvider>
    </div>
  );
}
