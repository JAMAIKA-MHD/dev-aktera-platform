import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { buildDefaultChoiceRounds } from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import type { ChoicePick } from "../../../domain/participation";
import type { ChoiceRound } from "../../../domain/types";
import { CHOICE_PROMPT, CHOICE_THANKS } from "../../../presets/contentDefaults";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import { useElementSize } from "../../layout/useElementSize";
import type { GameEngineProps } from "../types";
import { ChoiceCard, type ChoiceSide, type ChoiceState } from "./ChoiceCard";

// Choose Your Brand. Round after round, two cards: the player taps the one they prefer. No
// side is right or wrong — the picks are a preference the brand reads later, sent with the
// participation once the last round is played. Whether that wins, and what, is the server's
// draw alone (N1): nothing here looks at an outcome before the reveal.

const HOLD_MS = 650; // the picked card is seen before the next round comes in
const HOLD_STILL_MS = 250;
const REVEAL_MS = 500;
const LABEL_MAX = 80; // what select-prize keeps of a label

// The cards keep a 3:4 shape and grow as big as the duel area allows, beside the badge.
function cardWidth(width: number, height: number) {
  const vs = Math.min(64, Math.max(32, width * 0.09));
  const gap = Math.max(6, width * 0.02);
  return {
    vs,
    gap,
    card: Math.max(0, Math.min((width - vs - gap * 2) / 2, height * 0.75)),
  };
}

export function ChooseBrandEngine({
  settings,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const fallback = config.locales.default;
  const [fallbackRounds] = useState(buildDefaultChoiceRounds);
  const rounds: ChoiceRound[] = settings.chooseBrand?.rounds?.length
    ? settings.chooseBrand.rounds
    : fallbackRounds;

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<ChoiceSide | null>(null);
  const [picks, setPicks] = useState<ChoicePick[]>([]);
  const [done, setDone] = useState(false);
  const locked = useRef(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((run: () => void, ms: number) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const send = useRef(onInteractionComplete);
  useEffect(() => {
    send.current = onInteractionComplete;
  });
  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });

  // The picks are shown for a moment; the result belongs to the screens after.
  useEffect(() => {
    if (phase !== "revealing") return;
    const timer = setTimeout(
      () => revealComplete.current(),
      reducedMotion ? 0 : REVEAL_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, reducedMotion]);

  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);
  const round = rounds[Math.min(index, rounds.length - 1)];
  const playing = phase === "interacting" && !done;

  // A keyboard player keeps the focus on the duel from one round to the next: the new
  // round's cards replace the old ones, and the focus would otherwise fall to the page.
  const refocus = useRef(false);
  const [duelRef, size] = useElementSize<HTMLDivElement>();
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    duelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [index, duelRef]);

  const pick = (side: ChoiceSide) => {
    if (!playing || locked.current) return;
    locked.current = true;
    refocus.current = Boolean(
      duelRef.current?.contains(document.activeElement),
    );
    setPicked(side);
    runtimeAudio.play("click");
    vibrate("tap");
    const next: ChoicePick[] = [
      ...picks,
      {
        roundId: round.id,
        side,
        label: text(round[side].label).trim().slice(0, LABEL_MAX),
      },
    ];
    setPicks(next);
    later(
      () => {
        if (index + 1 >= rounds.length) {
          setDone(true);
          send.current({ kind: "choices", picks: next });
          return;
        }
        setIndex(index + 1);
        setPicked(null);
        locked.current = false;
      },
      reducedMotion ? HOLD_STILL_MS : HOLD_MS,
    );
  };

  // ← and → pick a side too, the way they are drawn (the duel is always left to right).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") pick("left");
    else if (event.key === "ArrowRight") pick("right");
    else return;
    event.preventDefault();
  };

  const measured = size.width > 0 && size.height > 0;
  const { card, vs, gap } = cardWidth(size.width, size.height);
  const stateOf = (side: ChoiceSide): ChoiceState =>
    picked === null ? "idle" : picked === side ? "picked" : "dropped";
  const prompt = text(round.prompt) || text(CHOICE_PROMPT);
  const cta = text(config.screens.play.primaryCta);

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-[clamp(0.35rem,2cqmin,0.75rem)]"
      data-xp-game="choose_brand"
      data-xp-phase={phase}
      data-xp-still={reducedMotion ? "" : undefined}
    >
      {/* The rounds: one step each, the current one lit. */}
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={rounds.length}
        aria-valuenow={Math.min(index + 1, rounds.length)}
        aria-label={`${Math.min(index + 1, rounds.length)} / ${rounds.length}`}
      >
        <span className="flex flex-1 gap-1">
          {rounds.map((item, step) => (
            <span
              key={item.id}
              className="xp-choice-step"
              data-xp-step={
                step < picks.length
                  ? "done"
                  : step === index && !done
                    ? "now"
                    : undefined
              }
            />
          ))}
        </span>
        <span className="xp-choice-count text-xs font-extrabold tabular-nums">
          {Math.min(index + 1, rounds.length)} / {rounds.length}
        </span>
      </div>

      {done ? (
        <p
          key="thanks"
          dir="auto"
          className="xp-choice-prompt text-center"
          aria-live="polite"
        >
          {text(CHOICE_THANKS)}
        </p>
      ) : (
        <p
          key={round.id}
          dir="auto"
          data-xp-clamp
          className="xp-choice-prompt line-clamp-2 text-center"
          aria-live="polite"
        >
          {prompt}
        </p>
      )}

      <div
        ref={duelRef}
        className="grid min-h-0 min-w-0 place-items-center overflow-hidden p-[clamp(0.25rem,2cqmin,0.75rem)]"
        style={{ opacity: phase === "interacting" || done ? 1 : 0.6 }}
      >
        {done ? (
          // What the player chose, round after round, while the server answers.
          <ul className="xp-choice-summary" aria-label={prompt}>
            {picks.map((choice, step) => {
              const chosen = rounds[step];
              if (!chosen) return null;
              return (
                <li
                  key={choice.roundId}
                  style={{ animationDelay: `${step * 70}ms` }}
                >
                  <ChoiceCard
                    option={chosen[choice.side]}
                    label=""
                    side={choice.side}
                    state="idle"
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          // Always drawn left to right, whatever the page's direction: the brand set its
          // pictures as a left one and a right one.
          <div
            dir="ltr"
            onKeyDown={onKeyDown}
            className="grid items-center"
            style={{
              gridTemplateColumns: measured
                ? `${card}px ${vs}px ${card}px`
                : "minmax(0,1fr) auto minmax(0,1fr)",
              gap,
            }}
          >
            {(["left", "right"] as const).map((side) => {
              const label = text(round[side].label);
              return (
                <button
                  key={`${round.id}-${side}`}
                  type="button"
                  disabled={!playing || picked !== null}
                  aria-pressed={picked === side}
                  aria-label={`${cta} · ${label || side}`}
                  onClick={() => pick(side)}
                  className="xp-choice-pick min-h-[44px] min-w-[44px] cursor-pointer rounded-[var(--xp-choice-radius,var(--xp-radius-lg))] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]"
                  style={{
                    gridColumn: side === "left" ? 1 : 3,
                    gridRow: 1,
                    width: measured ? card : "100%",
                    aspectRatio: "3 / 4",
                  }}
                >
                  <ChoiceCard
                    option={round[side]}
                    label={label}
                    side={side}
                    state={stateOf(side)}
                  />
                </button>
              );
            })}
            <span
              key={`vs-${round.id}`}
              aria-hidden
              className="xp-choice-vs"
              style={{ gridColumn: 2, gridRow: 1, width: vs }}
            >
              VS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
