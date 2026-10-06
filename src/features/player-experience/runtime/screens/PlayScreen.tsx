import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";
import type { FlowState } from "../../domain/flow";
import { resolveText } from "../../domain/locale";
import { STATUS_TEXT } from "../../presets/contentDefaults";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { registry } from "../games/registry";
import type { GamePhase } from "../games/types";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ScreenMedallion } from "./ScreenMedallion";
import { press, type ScreenProps } from "./screenProps";

// The game on stage (plan §8.5, tasks.md T5.2). One screen for the three moments a game is
// played through — the player's turn, the draw in flight, the reveal — because they are one
// moment for the player: the engine stays mounted across all three and keeps whatever it was
// doing (a wheel goes on turning while the server answers, rather than being swapped out for
// a spinner). Which moment it is, is read from the journey, never kept by the engine.
function enginePhase(state: FlowState): GamePhase {
  if (state.screen === "resolving") return "awaiting-outcome";
  if (state.screen === "revealing") return "revealing";
  // The play screen itself: a game drawn before its animation waits for a tap, one played
  // first is already in the player's hands.
  return state.timing === "after-interaction" ? "interacting" : "idle";
}

// Shown while the mechanic's own module is being fetched (registry.ts loads one game, and
// only one, T5.1): the very indicator the journey used before the engines existed (T4.3),
// rather than an empty stage (D12). On a slow connection it is the first thing seen here.
export function WaitingForEngine({
  config,
  locale,
}: Pick<ScreenProps, "config" | "locale">) {
  return (
    <ScreenMedallion icon={LoaderCircle} waiting>
      <p dir="auto" role="status" className="text-sm font-semibold">
        {resolveText(STATUS_TEXT.resolving, locale, config.locales.default)}
      </p>
    </ScreenMedallion>
  );
}

export function PlayScreen({
  flow,
  config,
  campaign,
  locale,
  chrome,
}: ScreenProps) {
  const reducedMotion = useReducedMotion(config.features.animations);
  const { state } = flow;
  const Engine = registry[campaign.gameType].Engine;
  const onStage =
    state.screen === "play" ||
    state.screen === "resolving" ||
    state.screen === "revealing";
  if (!onStage) return null;

  // Only the player's own turn offers the button; the draw and the reveal must not be left
  // (LOCKED_SCREENS, domain/flow.ts), and a game played first is ended by the game itself.
  const waiting = state.screen !== "play";
  const cta =
    !waiting && state.timing === "before-animation"
      ? { onPrimary: press(flow, flow.startDraw, "primary") }
      : null;

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.play}
      editPath="screens.play"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={cta}
    >
      <Suspense fallback={<WaitingForEngine config={config} locale={locale} />}>
        <Engine
          settings={config.game}
          campaign={campaign}
          config={config}
          phase={enginePhase(state)}
          outcome={state.outcome}
          onStart={press(flow, flow.startDraw, "game")}
          onInteractionComplete={flow.completeInteraction}
          onRevealComplete={flow.completeReveal}
          reducedMotion={reducedMotion}
          locale={locale}
        />
      </Suspense>
    </ExperienceFrame>
  );
}
