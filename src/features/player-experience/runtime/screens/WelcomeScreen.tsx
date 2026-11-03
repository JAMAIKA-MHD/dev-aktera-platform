import { Suspense, useRef } from "react";
import { resolveText } from "../../domain/locale";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { registry } from "../games/registry";
import { useTeaserActivity } from "../games/useTeaserActivity";
import { useGameTheme } from "../../theme/GameTheme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { press, type ScreenProps } from "./screenProps";

// Welcome screen (plan §8.5): the brand, the title, the teaser of the game in slot 5, the
// jackpot and prize chips, and one button. Touching the teaser starts the journey like the
// CTA (START → registration and consent), never a game (plan §8.7, rule 2). The texts and
// the CTA default to the ones of the game (T1.7). A template may open on its texts alone
// (theme.json layout.welcomeTeaser: false): the game is first seen on its own screen.
export function WelcomeScreen({
  flow,
  config,
  campaign,
  locale,
  chrome,
}: ScreenProps) {
  const teaser = useRef<HTMLDivElement>(null);
  const active = useTeaserActivity(teaser);
  const reducedMotion = useReducedMotion(config.features.animations);
  const content = config.screens.welcome;
  const Teaser = registry[campaign.gameType].Teaser;
  const { manifest } = useGameTheme();
  const withTeaser = manifest?.layout.welcomeTeaser ?? true;
  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={content}
      editPath="screens.welcome"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      showSections
      interaction={withTeaser}
      cta={{ onPrimary: press(flow, flow.start, "primary") }}
    >
      {/* The teaser of the campaign's own game (registry.ts, T5.1): every mechanic still
          shows the fallback until T5.2–T5.6 give it its own, one registry entry at a time. */}
      {withTeaser && (
        <div ref={teaser} className="grid min-h-0" data-xp-edit="game.teaser">
          <Suspense fallback={null}>
            <Teaser
              settings={config.game}
              campaign={campaign}
              config={config}
              locale={locale}
              reducedMotion={reducedMotion}
              active={active}
              onStart={press(flow, flow.start, "teaser")}
              startLabel={resolveText(
                content.primaryCta,
                locale,
                config.locales.default,
              )}
            />
          </Suspense>
        </div>
      )}
    </ExperienceFrame>
  );
}
