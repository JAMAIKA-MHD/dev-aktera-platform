import {
  CalendarX,
  Clover,
  Gift,
  LoaderCircle,
  UserCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import {
  resolveText,
  type Locale,
  type LocalizedText,
} from "../../domain/locale";
import {
  PARTICIPATION_ERROR_MESSAGES,
  type ParticipationErrorCode,
} from "../../domain/participation";
import type {
  ExperienceConfig,
  ScreenContent,
  ScreenKey,
} from "../../domain/types";
import { STATUS_TEXT } from "../../presets/contentDefaults";
import { tint } from "../../theme/recipes";
import { ExperienceFrame, type CtaActions } from "../frame/ExperienceFrame";
import type { ExperienceFlow } from "../useExperienceFlow";
import { ScreenMedallion } from "./ScreenMedallion";
import { textContent } from "./textContent";

// Interim screens of the journey, until the real ones exist: welcome and registration
// (T4.2), waiting and status (T4.3), win and loss (T4.4), games (phase 5). Each one already
// has its frame, its content and its CTA wired to the flow (B4), and an exit (B9); slot 5
// says what will fill it. No game animates the outcome yet: the reveal completes at once.

export interface FrameChrome {
  logoUrl: string | null;
  statusBadge: string | null; // "Demo" while the gateway is not live (B6)
  live: boolean;
}

interface View {
  key: ScreenKey | null; // screen content edited in the Studio, if any
  content: ScreenContent;
  body: ReactNode;
  cta: CtaActions | null;
}

const STATUS: Record<
  "duplicate" | "closed" | "error",
  { icon: LucideIcon; title: LocalizedText; code: ParticipationErrorCode }
> = {
  duplicate: {
    icon: UserCheck,
    title: STATUS_TEXT.duplicateTitle,
    code: "ALREADY_PARTICIPATED",
  },
  closed: {
    icon: CalendarX,
    title: STATUS_TEXT.closedTitle,
    code: "CAMPAIGN_CLOSED",
  },
  error: { icon: WifiOff, title: STATUS_TEXT.errorTitle, code: "NETWORK" },
};

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

export function PendingScreen({
  flow,
  config,
  locale,
  chrome,
}: {
  flow: ExperienceFlow;
  config: ExperienceConfig;
  locale: Locale;
  chrome: FrameChrome;
}) {
  const { state } = flow;
  const text = (value: LocalizedText) =>
    resolveText(value, locale, config.locales.default);
  // Every CTA of the journey reports its click, then emits its event.
  const press = (action: () => void, cta: "primary" | "secondary") => () => {
    flow.track("cta_clicked", { cta });
    action();
  };
  const restart = press(flow.restart, "primary");

  const view = ((): View => {
    const screens = config.screens;
    switch (state.screen) {
      case "welcome":
        return {
          key: "welcome",
          content: screens.welcome,
          body: <StandIn what="Game teaser" task="T4.2, then phase 5" />,
          cta: { onPrimary: press(flow.start, "primary") },
        };
      case "register":
        return {
          key: "register",
          content: screens.register,
          body: (
            <StandIn what="Registration form" task="T4.2">
              {state.error && (
                <p dir="auto" role="alert" className="text-sm font-semibold">
                  {text(PARTICIPATION_ERROR_MESSAGES[state.error.code])}
                </p>
              )}
            </StandIn>
          ),
          cta: {
            onPrimary: press(flow.submit, "primary"),
            disabled: !flow.canSubmit,
          },
        };
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
              ? { onPrimary: press(flow.startDraw, "primary") }
              : null,
        };
      case "resolving":
        return {
          key: "play",
          content: screens.play,
          body: (
            <ScreenMedallion icon={LoaderCircle} waiting>
              <p dir="auto" role="status" className="text-sm font-semibold">
                {text(STATUS_TEXT.resolving)}
              </p>
            </ScreenMedallion>
          ),
          cta: null, // the draw is in flight: nothing to press
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
      case "duplicate":
      case "closed":
      case "error": {
        const status = STATUS[state.screen];
        const retryable = state.screen === "error";
        return {
          key: null,
          content: textContent({
            title: status.title,
            subtitle:
              PARTICIPATION_ERROR_MESSAGES[state.error?.code ?? status.code],
            primaryCta: retryable ? STATUS_TEXT.retry : STATUS_TEXT.back,
            secondaryCta: retryable ? STATUS_TEXT.back : undefined,
          }),
          body: <ScreenMedallion icon={status.icon} />,
          cta: retryable
            ? {
                onPrimary: press(flow.retry, "primary"),
                onSecondary: press(flow.restart, "secondary"),
              }
            : { onPrimary: restart },
        };
      }
    }
  })();

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={view.content}
      editPath={view.key ? `screens.${view.key}` : null}
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      showSections={state.screen === "welcome"}
      cta={view.cta}
    >
      {view.body}
    </ExperienceFrame>
  );
}
