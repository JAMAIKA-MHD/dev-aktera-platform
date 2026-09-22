import { useEffect, type ReactNode } from "react";
import { tint } from "../../theme/recipes";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { press, type ScreenProps } from "./screenProps";

// Interim screen of the journey, until the game engines exist (phase 5): the play screen's
// content, a stand-in for slot 5, and the CTA of a game drawn before its animation (wheel,
// scratch card). A game played first (quiz, boxes, Hit It) sends its own result and gets no
// CTA here. Welcome, registration, the draw's wait, the non-winning statuses and the two
// outcomes all have their own screens (T4.2, T4.3, T4.4); this one returns null for them.

// Outlined stand-in, as in the frame fixtures: what fills slot 5, and which task brings it.
function StandIn({
  what,
  task,
  children,
}: {
  what: string;
  task: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-[var(--xp-radius-lg)] border border-dashed p-3 text-center"
      style={{
        borderColor: tint("--xp-primary", 40),
        background: `radial-gradient(ellipse at 50% 45%, ${tint("--xp-primary", 16)}, transparent 70%)`,
      }}
    >
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]">
        Slot 5 · {what}
      </p>
      <p className="text-xs text-[var(--xp-text-muted)]">{task}</p>
      {children}
    </div>
  );
}

function AutoReveal({ onDone }: { onDone: () => void }) {
  useEffect(() => onDone(), [onDone]);
  return null;
}

export function PendingScreen({ flow, config, locale, chrome }: ScreenProps) {
  const { state } = flow;
  if (state.screen !== "play" && state.screen !== "revealing") return null;

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.play}
      editPath="screens.play"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      // The engine of a game played first (quiz, boxes, Hit It) sends its own result.
      cta={
        state.screen === "play" && state.timing === "before-animation"
          ? { onPrimary: press(flow, flow.startDraw, "primary") }
          : null
      }
    >
      <StandIn what="Game engine" task="Phase 5">
        {state.screen === "revealing" && (
          <AutoReveal onDone={flow.completeReveal} />
        )}
      </StandIn>
    </ExperienceFrame>
  );
}
