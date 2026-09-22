import { Clover, Gift } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import type { ScreenContent, ScreenKey } from "../../domain/types";
import { tint } from "../../theme/recipes";
import { ExperienceFrame, type CtaActions } from "../frame/ExperienceFrame";
import { ScreenMedallion } from "./ScreenMedallion";
import { press, type ScreenProps } from "./screenProps";

// Interim screens of the journey, until the real ones exist: win and loss (T4.4), games
// (phase 5). Each one already has its frame, its content and its CTA wired to the flow (B4),
// and an exit (B9); slot 5 says what will fill it. No game animates the outcome yet: the
// reveal completes at once. Welcome, registration, the draw's wait and the non-winning
// statuses have their own screens (T4.2, T4.3).

interface View {
  key: ScreenKey; // screen content edited in the Studio
  content: ScreenContent;
  body: ReactNode;
  cta: CtaActions | null;
}

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
  const restart = press(flow, flow.restart, "primary");

  const view = ((): View | null => {
    const screens = config.screens;
    switch (state.screen) {
      case "welcome":
      case "register":
      case "resolving":
      case "duplicate":
      case "closed":
      case "error":
        return null; // their own screens (T4.2, T4.3)
      case "play":
      case "revealing":
        return {
          key: "play",
          content: screens.play,
          body: (
            <StandIn what="Game engine" task="Phase 5">
              {state.screen === "revealing" && (
                <AutoReveal onDone={flow.completeReveal} />
              )}
            </StandIn>
          ),
          // The engine of a game played first (quiz, boxes, Hit It) sends its own result.
          cta:
            state.screen === "play" && state.timing === "before-animation"
              ? { onPrimary: press(flow, flow.startDraw, "primary") }
              : null,
        };
      case "win":
        return {
          key: "win",
          content: screens.win,
          body: (
            <ScreenMedallion icon={Gift}>
              <p dir="auto" className="text-lg font-extrabold">
                {state.outcome?.prize?.name}
              </p>
              {state.outcome?.couponCode && (
                <p className="font-mono text-sm tracking-[0.15em]">
                  {state.outcome.couponCode}
                </p>
              )}
            </ScreenMedallion>
          ),
          cta: { onPrimary: restart },
        };
      case "lose":
        return {
          key: "lose",
          content: screens.lose,
          body: <ScreenMedallion icon={Clover} />,
          cta: { onPrimary: restart },
        };
    }
  })();

  if (!view) return null;
  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={view.content}
      editPath={`screens.${view.key}`}
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={view.cta}
    >
      {view.body}
    </ExperienceFrame>
  );
}
