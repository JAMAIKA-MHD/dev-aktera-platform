import { useEffect, useRef, useState } from "react";
import { resolvePrizeDisplay } from "../../../domain/display";
import { resolveText } from "../../../domain/locale";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import type { GameEngineProps } from "../types";
import { BoxFace, type BoxState } from "./BoxFace";

// The mystery boxes (plan §8.6, tasks.md T5.4). The player picks one, and only then is the
// draw sent: the prize that comes back is the prize, whichever box was picked (N1) — the
// prototype tied the gift to the index, which meant the choice decided the outcome. Here the
// chosen box shakes while the server answers, then opens on what it was handed.

const OPEN_MS = 700;

export function BoxesEngine({
  settings,
  campaign,
  config,
  phase,
  outcome,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const count = settings.boxes?.count ?? 3;
  const icon = settings.boxes?.icon ?? "gift";
  const color = settings.boxes?.color ?? null;
  const fallback = config.locales.default;

  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });

  // The box is open; the journey moves on once it has been seen.
  useEffect(() => {
    if (phase !== "revealing") return;
    runtimeAudio.play(outcome?.isWinner ? "win" : "lose");
    const timer = setTimeout(
      () => revealComplete.current(),
      reducedMotion ? 0 : OPEN_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, reducedMotion, outcome]);

  const pick = (index: number) => {
    if (phase !== "interacting" || picked !== null) return;
    setPicked(index);
    runtimeAudio.play("click");
    vibrate("tap");
    onInteractionComplete({ kind: "boxes", selectedIndex: index });
  };

  const display = outcome?.prize
    ? resolvePrizeDisplay(outcome.prize.id, config, campaign, locale)
    : null;

  const stateOf = (index: number): BoxState => {
    if (phase === "revealing") return index === picked ? "open" : "dimmed";
    if (picked === null) return "closed";
    return index === picked ? "shaking" : "dimmed";
  };

  return (
    <div
      className="grid size-full min-h-0 place-items-center"
      data-xp-game="mystery_box"
      data-xp-phase={phase}
    >
      {/* Always on one row, sized on the slot: three boxes side by side at any width,
          and never a tap target under 44 px (D19). */}
      <div
        className="grid w-full grid-flow-col justify-center gap-[clamp(0.5rem,4cqmin,1.5rem)]"
        style={{ gridAutoColumns: "min(30cqw, 34cqh, 11rem)" }}
      >
        {Array.from({ length: count }, (_, index) => {
          const state = stateOf(index);
          const open = state === "open";
          return (
            <button
              key={index}
              type="button"
              disabled={phase !== "interacting" || picked !== null}
              onClick={() => pick(index)}
              aria-label={`${resolveText(config.screens.play.primaryCta, locale, fallback)} ${index + 1}`}
              className="min-h-[44px] min-w-[44px] cursor-pointer rounded-[var(--xp-radius-md)] transition-transform duration-200 ease-out enabled:hover:-translate-y-1 enabled:active:scale-[0.97] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]"
            >
              <BoxFace
                icon={icon}
                color={color}
                state={state}
                style={
                  state === "shaking" && !reducedMotion
                    ? { animation: "xp-wiggle 420ms ease-in-out infinite" }
                    : undefined
                }
              >
                {open && (
                  <span
                    dir="auto"
                    data-xp-clamp
                    className="line-clamp-3 text-[clamp(0.6rem,3.4cqmin,0.9rem)] leading-tight font-black wrap-anywhere"
                    style={{ color: "var(--xp-on-primary)" }}
                  >
                    {display?.label ??
                      resolveText(config.screens.lose.title, locale, fallback)}
                  </span>
                )}
              </BoxFace>
            </button>
          );
        })}
      </div>
    </div>
  );
}
