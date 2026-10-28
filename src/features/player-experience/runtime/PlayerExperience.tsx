import { useEffect, useMemo, useRef, useState } from "react";
import type { CampaignSnapshot } from "../domain/campaign";
import { outcomeTimingFor, type FlowScreen } from "../domain/flow";
import type { Locale } from "../domain/locale";
import type { ExperienceConfig } from "../domain/types";
import type { ExperienceServices, GatewayMode } from "../services/ports";
import { useExperienceServices } from "../services/ServicesProvider";
import { ensureFontStylesheet, ensureTemplateFonts } from "../theme/fonts";
import { useGameTheme } from "../theme/GameTheme";
import { ThemeScope } from "../theme/ThemeScope";
import { runtimeAudio } from "./feedback/audio";
import { MUSIC_URL } from "./feedback/music";
import { GatewayRefusedScreen } from "./screens/GatewayRefusedScreen";
import { LoseScreen } from "./screens/LoseScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { PlayScreen } from "./screens/PlayScreen";
import type { FrameChrome, ScreenProps } from "./screens/screenProps";
import { StatusScreen } from "./screens/StatusScreen";
import { GameFrame } from "./shell/GameFrame";
import { TransitionLayer, useScreenTransition } from "./shell/ScreenTransition";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { WinScreen } from "./screens/WinScreen";
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
  useEffect(() => {
    ensureTemplateFonts(document, config.templateId);
  }, [config.templateId]);
  // The screen shown, for the stage: its mood and its own background follow the journey.
  const [screen, setScreen] = useState<FlowScreen>(
    props.initialScreen ?? "welcome",
  );

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
      templateId={config.templateId}
      imageUrl={imageUrl}
      className="xp-runtime flex flex-col"
    >
      <ThemeSounds />
      {/* Outside the journey: a new screen changes the stage's mood, never remounts it. */}
      <GameFrame gameType={campaign.gameType} screen={screen} />
      {allowedGatewayModes.includes(mode) ? (
        <Journey
          key={journey}
          {...props}
          services={services}
          chrome={chrome}
          onScreen={setScreen}
        />
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

// The theme's own recordings, for the whole runtime document (feedback/audio.ts), and the
// music every template loops under them: it starts with the player's first gesture, pauses
// while the page is out of sight, and stops when the page goes.
function ThemeSounds() {
  const { assets, manifest } = useGameTheme();
  useEffect(() => {
    runtimeAudio.setSoundFiles(assets?.sounds ?? {});
  }, [assets]);
  useEffect(() => {
    runtimeAudio.setChiptune(manifest?.motion.chiptune ?? false);
  }, [manifest]);
  useEffect(() => {
    const hidden = () => runtimeAudio.setHidden(document.hidden);
    hidden();
    runtimeAudio.setMusic(MUSIC_URL);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      runtimeAudio.setMusic(null);
    };
  }, []);
  return null;
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
  onScreen,
}: PlayerExperienceProps & {
  services: ExperienceServices;
  chrome: FrameChrome;
  onScreen: (screen: FlowScreen) => void;
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
  const props: ScreenProps = { flow, config, campaign, locale, chrome };
  // The change from one screen to the next, in the theme's own way (ScreenTransition): the
  // journey is already on the new screen; what is drawn follows, under the wipe's cover.
  const motion = useGameTheme().manifest?.motion;
  const reducedMotion = useReducedMotion(config.features.animations);
  const { shown, phase, holding } = useScreenTransition({
    screen,
    element: screenElement(screen, props),
    enabled: Boolean(motion) && !reducedMotion,
    wipe: Boolean(motion?.wipe),
    pipe: motion?.pipe ?? false,
  });
  const report = useRef({ onFlowEvent, onScreen });
  useEffect(() => {
    report.current = { onFlowEvent, onScreen };
  });
  useEffect(() => {
    report.current.onFlowEvent?.(screen);
  }, [screen]);
  // The stage changes with what is drawn, behind the wipe too.
  useEffect(() => {
    report.current.onScreen(shown.screen);
  }, [shown.screen]);
  return (
    <>
      <div
        className="xp-transition contents"
        data-xp-change={shown.change ?? undefined}
        // The old screen, held while it leaves (a pipe slides it down).
        data-xp-leaving={holding ?? undefined}
      >
        {shown.element}
      </div>
      <TransitionLayer
        phase={phase}
        change={holding ?? shown.change}
        serial={shown.serial}
      />
    </>
  );
}

function screenElement(screen: FlowScreen, props: ScreenProps) {
  if (screen === "welcome") return <WelcomeScreen {...props} />;
  if (screen === "register") return <RegisterScreen {...props} />;
  if (screen === "duplicate" || screen === "closed" || screen === "error") {
    return <StatusScreen {...props} />;
  }
  if (screen === "win") return <WinScreen {...props} />;
  if (screen === "lose") return <LoseScreen {...props} />;
  return <PlayScreen {...props} />;
}
