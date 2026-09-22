import { useRef } from "react";
import { resolveText } from "../../domain/locale";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { FallbackTeaser } from "../games/FallbackTeaser";
import { useTeaserActivity } from "../games/useTeaserActivity";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { press, type ScreenProps } from "./screenProps";

// Welcome screen (plan §8.5): the brand, the title, the teaser of the game in slot 5, the
// jackpot and prize chips, and one button. Touching the teaser starts the journey like the
// CTA (START → registration and consent), never a game (plan §8.7, rule 2). The texts and
// the CTA default to the ones of the game (T1.7).
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
      cta={{ onPrimary: press(flow, flow.start, "primary") }}
    >
      {/* Until the games of phase 5, every game shows the fallback teaser (T5.1). */}
      <div ref={teaser} className="grid min-h-0" data-xp-edit="game.teaser">
        <FallbackTeaser
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
      </div>
    </ExperienceFrame>
  );
}
