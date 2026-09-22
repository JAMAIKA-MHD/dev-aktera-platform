import { useEffect, useMemo, useRef } from "react";
import type { CampaignSnapshot } from "../domain/campaign";
import { outcomeTimingFor, type FlowScreen } from "../domain/flow";
import type { Locale } from "../domain/locale";
import type { ExperienceConfig } from "../domain/types";
import type { ExperienceServices, GatewayMode } from "../services/ports";
import { useExperienceServices } from "../services/ServicesProvider";
import { ensureFontStylesheet } from "../theme/fonts";
import { ThemeScope } from "../theme/ThemeScope";
import { GatewayRefusedScreen } from "./screens/GatewayRefusedScreen";
import { PendingScreen } from "./screens/PendingScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import type { FrameChrome, ScreenProps } from "./screens/screenProps";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { useExperienceFlow, type DrawSource } from "./useExperienceFlow";

// Root of the player runtime (plan §8.1): one render mode, the full document. The Studio and
// the app simulator show it in the /xp-frame iframe, at the exact size of the device; the
// public route will render it directly. It reads its services from ServicesProvider.
//
//   <ServicesProvider services={services}>
//     <PlayerExperience config={…} campaign={…} locale="fr"
//       allowedGatewayModes={["live"]} />
//   </ServicesProvider>

export interface PlayerExperienceProps {
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  locale: Locale;
  // Gateways this page accepts: ["live"] on the public route, ["demo", "scripted"] in the
  // Studio. Any other one shows an explicit error instead of the game (plan §7.4).
  allowedGatewayModes: readonly GatewayMode[];
  initialScreen?: FlowScreen; // forced by the Studio preview; ignored with the live gateway
  onFlowEvent?: (screen: FlowScreen) => void; // each screen shown, e.g. the Studio's tabs
  source?: DrawSource;
}

export const DEMO_BADGE = "Demo";

export function PlayerExperience(props: PlayerExperienceProps) {
  const { config, campaign, locale, allowedGatewayModes } = props;
  const services = useExperienceServices();
  const { assets } = services;
  const mode = services.participation.mode;
  const imageUrl = useMemo(
    () => assets.resolveUrl(config.theme.background.image),
    [assets, config.theme.background.image],
  );
  const logoUrl = useMemo(
    () => assets.resolveUrl(config.brand.logo),
    [assets, config.brand.logo],
  );
  useEffect(() => {
    ensureFontStylesheet(document, config.theme.font);
  }, [config.theme.font]);

  const chrome: FrameChrome = {
    logoUrl,
    statusBadge: mode === "live" ? null : DEMO_BADGE,
    live: campaign.status === "active",
  };
  // A new game or a forced screen starts a new journey. Texts, theme, language and size
  // never do: the state lives in the reducer, not in the layout.
  const journey = [
    campaign.id,
    campaign.gameType,
    outcomeTimingFor(campaign),
    props.initialScreen ?? "welcome",
  ].join("|");

  return (
    <ThemeScope
      theme={config.theme}
      locale={locale}
      imageUrl={imageUrl}
      className="xp-runtime flex flex-col"
    >
      {allowedGatewayModes.includes(mode) ? (
        <Journey key={journey} {...props} services={services} chrome={chrome} />
      ) : (
        <GatewayRefusedScreen
          config={config}
          locale={locale}
          mode={mode}
          allowed={allowedGatewayModes}
          logoUrl={logoUrl}
          statusBadge={chrome.statusBadge}
        />
      )}
    </ThemeScope>
  );
}

function Journey({
  config,
  campaign,
  locale,
  initialScreen,
  onFlowEvent,
  source,
  services,
  chrome,
}: PlayerExperienceProps & {
  services: ExperienceServices;
  chrome: FrameChrome;
}) {
  const flow = useExperienceFlow({
    config,
    campaign,
    services,
    locale,
    initialScreen,
    source,
  });
  const screen = flow.state.screen;
  const report = useRef(onFlowEvent);
  useEffect(() => {
    report.current = onFlowEvent;
  });
  useEffect(() => {
    report.current?.(screen);
  }, [screen]);
  const props: ScreenProps = { flow, config, campaign, locale, chrome };
  if (screen === "welcome") return <WelcomeScreen {...props} />;
  if (screen === "register") return <RegisterScreen {...props} />;
  return <PendingScreen {...props} />;
}
