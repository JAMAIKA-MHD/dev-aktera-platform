import { LoaderCircle } from "lucide-react";
import { resolveText } from "../../domain/locale";
import { STATUS_TEXT } from "../../presets/contentDefaults";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { ScreenMedallion } from "./ScreenMedallion";
import type { ScreenProps } from "./screenProps";

// Shown while a draw is in flight (plan §8.5, tasks.md T4.3), on the play screen's content:
// a turning indicator and "Getting your game ready…", in the player's language. Nothing to
// press: the draw is already under way, and leaving here would drop its result (LOCKED_SCREENS,
// domain/flow.ts). No dead end (B9): the answer, whichever it is, always moves the parcours on.
export function ResolvingScreen({ config, locale, chrome }: ScreenProps) {
  const fallback = config.locales.default;
  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.play}
      editPath="screens.play"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={null}
    >
      <ScreenMedallion icon={LoaderCircle} waiting>
        <p dir="auto" role="status" className="text-sm font-semibold">
          {resolveText(STATUS_TEXT.resolving, locale, fallback)}
        </p>
      </ScreenMedallion>
    </ExperienceFrame>
  );
}
