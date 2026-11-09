import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  buildChoicePlan,
  choiceProgress,
  type ChoicePlan,
  type ChoiceSide,
} from "../../../domain/chooseBrand";
import { DEFAULT_CHOICE_ROUND_SECONDS } from "../../../domain/campaign";
import { resolveText } from "../../../domain/locale";
import type { ChoicePick } from "../../../domain/participation";
import {
  CHOICE_CHAMPION,
  CHOICE_PROMPT,
  CHOICE_STAGE_LABELS,
  CHOICE_TIME_UP,
} from "../../../presets/contentDefaults";
import { useGameTheme } from "../../../theme/GameTheme";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import { useElementSize } from "../../layout/useElementSize";
import type { GameEngineProps } from "../types";
import { ChoiceCard, type ChoiceState } from "./ChoiceCard";
import { ChoiceClock } from "./ChoiceClock";

// Pick Your Favorite, "winner stays". Duel after duel, two cards: the player taps the one they
// prefer; it stays where it is and the next product comes in on the other side. The last one
// standing is the player's champion (domain/chooseBrand.ts draws the duels). No side is right
// or wrong — the picks are a preference the brand reads later, sent with the participation
// once the last duel is played. Whether that wins, and what, is the server's draw alone (N1):
// nothing here looks at an outcome before the reveal.
//
// Each duel has its own clock (the campaign's, set in the Wizard). When it runs out, the
// product already on screen stays and the game moves on: nobody chose it, so no pick is
// recorded for that duel, and a game without a single pick has no champion to report.

const HOLD_MS = 650; // the picked card is seen before the next duel comes in
const HOLD_STILL_MS = 250;
const TIMEOUT_HOLD_MS = 950; // long enough to read that the time ran out
const TIMEOUT_HOLD_STILL_MS = 600;
const REVEAL_MS = 500;
const LABEL_MAX = 80; // what select-prize keeps of a label
const TICK_MS = 100;
const LOW_MS = 3000; // the last three seconds of a duel warn, and tick on a lively theme

// The cards keep a 3:4 shape and grow as big as the duel area allows, beside the badge (the
// duel's clock: wide enough for its ring and its 3, 2, 1).
function cardWidth(width: number, height: number) {
  const vs = Math.min(84, Math.max(48, width * 0.14));
  const gap = Math.max(6, width * 0.02);
  return {
    vs,
    gap,
    card: Math.max(0, Math.min((width - vs - gap * 2) / 2, height * 0.75)),
  };
}

// A new list or a new order is a new game: in the Studio's preview, while the brand edits it.
// A label or a picture edited keeps the game where it is.
const planKey = (plan: ChoicePlan) =>
  plan.order.map((item) => item.id).join(",");

export function ChooseBrandEngine(props: GameEngineProps) {
  const settings = props.settings.chooseBrand;
  // How many products play is the campaign's (Wizard); the design sets the rest.
  const rules = props.campaign.rules.choice;
  // One order per player when the brand shuffles the products, the same one all game long.
  const [seed] = useState(() => Math.floor(Math.random() * 0x100000000));
  const plan = useMemo(
    () => buildChoicePlan(settings, seed, rules),
    [settings, seed, rules],
  );
  return <ChooseBrandGame key={planKey(plan)} {...props} plan={plan} />;
}

function ChooseBrandGame({
  plan,
  campaign,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps & { plan: ChoicePlan }) {
  const fallback = config.locales.default;
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);
  const short = (value: Parameters<typeof resolveText>[0]) =>
    text(value).trim().slice(0, LABEL_MAX);

  const [sides, setSides] = useState<ChoiceSide[]>([]);
  const [picked, setPicked] = useState<ChoiceSide | null>(null);
  const [picks, setPicks] = useState<ChoicePick[]>([]);
  const [done, setDone] = useState(false);
  // The duel being settled ran out of time: the side kept was nobody's pick.
  const [timedOut, setTimedOut] = useState(false);
  const locked = useRef(false);
  const roundMs =
    (campaign.rules.choice?.roundSeconds ?? DEFAULT_CHOICE_ROUND_SECONDS) *
    1000;
  const [left, setLeft] = useState(roundMs);
  const lively =
    useGameTheme().manifest?.motion.games === "lively" && !reducedMotion;

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

  const { duel, champion } = choiceProgress(plan, sides);
  const playing = phase === "interacting" && !done && duel !== null;

  // A keyboard player keeps the focus on the duel from one to the next: the new duel's cards
  // replace the old ones, and the focus would otherwise fall to the page.
  const refocus = useRef(false);
  const [duelRef, size] = useElementSize<HTMLDivElement>();
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    duelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [sides.length, duelRef]);

  // A duel ends on a side: the player's pick, or the side that stays when the time runs out.
  const settle = (side: ChoiceSide, chosen: boolean) => {
    if (!playing || !duel || locked.current) return;
    locked.current = true;
    refocus.current = Boolean(
      duelRef.current?.contains(document.activeElement),
    );
    setPicked(side);
    setTimedOut(!chosen);
    const product = duel[side];
    const nextPicks: ChoicePick[] = chosen
      ? [
          ...picks,
          {
            roundId: duel.id,
            side,
            label: short(product.label),
            optionId: product.id,
          },
        ]
      : picks;
    const nextSides = [...sides, side];
    if (chosen) {
      runtimeAudio.play("click");
      vibrate("tap");
      setPicks(nextPicks);
    } else if (lively) {
      vibrate("lose");
    }
    later(
      () => {
        const after = choiceProgress(plan, nextSides);
        setSides(nextSides);
        setPicked(null);
        setTimedOut(false);
        if (after.duel) {
          locked.current = false;
          return;
        }
        setDone(true);
        // The last product picked is the one left standing, whatever ran out after it.
        const crowned = after.champion ?? product;
        send.current({
          kind: "choices",
          picks: nextPicks,
          champion:
            nextPicks.length > 0
              ? { optionId: crowned.id, label: short(crowned.label) }
              : null,
        });
      },
      chosen
        ? reducedMotion
          ? HOLD_STILL_MS
          : HOLD_MS
        : reducedMotion
          ? TIMEOUT_HOLD_STILL_MS
          : TIMEOUT_HOLD_MS,
    );
  };
  const pick = (side: ChoiceSide) => settle(side, true);

  // The clock of one duel, read off the wall clock so a slowed-down tab neither steals nor
  // gives time. It restarts with each duel and stops as soon as a side is settled.
  const expire = useRef(() => {});
  expire.current = () => settle(sides[sides.length - 1] ?? "left", false);
  const running = playing && picked === null;
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    setLeft(roundMs);
    let ticked = Math.ceil(roundMs / 1000);
    const timer = setInterval(() => {
      const remaining = roundMs - (Date.now() - started);
      const second = Math.ceil(remaining / 1000);
      if (lively && remaining > 0 && remaining <= LOW_MS && second < ticked) {
        ticked = second;
        runtimeAudio.play("countdown");
        vibrate("tick");
      }
      if (remaining > 0) {
        setLeft(remaining);
        return;
      }
      clearInterval(timer);
      setLeft(0);
      expire.current();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running, roundMs, sides.length, lively]);

  // ← and → pick a side too, the way they are drawn (the duel is always left to right).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") pick("left");
    else if (event.key === "ArrowRight") pick("right");
    else return;
    event.preventDefault();
  };

  const measured = size.width > 0 && size.height > 0;
  const { card, vs, gap } = cardWidth(size.width, size.height);
  // A side kept because the time ran out stays as it was: no check, nobody picked it.
  const stateOf = (side: ChoiceSide): ChoiceState =>
    picked === null
      ? "idle"
      : picked !== side
        ? "dropped"
        : timedOut
          ? "idle"
          : "picked";
  const prompt =
    (duel && text(duel.prompt)) || text(plan.prompt) || text(CHOICE_PROMPT);
  const cta = text(config.screens.play.primaryCta);
  const step = Math.min(sides.length + 1, plan.total);

  // "Duel · 2/4", then "Final".
  const stage = duel
    ? `${text(CHOICE_STAGE_LABELS[duel.stage])}${
        duel.stage !== "final" ? ` · ${duel.stageIndex}/${duel.stageCount}` : ""
      }`
    : null;
  // The champion keeps the tone of the side it won the final on.
  const championSide = sides[sides.length - 1] ?? "left";
  const showClock = phase === "interacting" && !done && duel !== null;
  const championWidth = measured
    ? Math.min(size.width * 0.6, size.height * 0.72)
    : undefined;

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-[clamp(0.35rem,2cqmin,0.75rem)]"
      data-xp-game="choose_brand"
      data-xp-phase={phase}
      data-xp-still={reducedMotion ? "" : undefined}
    >
      {/* The duels: one step each, the current one lit. The time left is on the badge
          between the cards, where the player looks. */}
      <div>
        <div
          className="flex min-w-0 items-center gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={plan.total}
          aria-valuenow={step}
          aria-label={`${step} / ${plan.total}`}
        >
          <span className="flex flex-1 gap-1">
            {Array.from({ length: plan.total }, (_, index) => (
              <span
                key={index}
                className="xp-choice-step"
                data-xp-step={
                  index < sides.length + (picked === null ? 0 : 1)
                    ? "done"
                    : index === sides.length && !done
                      ? "now"
                      : undefined
                }
              />
            ))}
          </span>
          <span className="xp-choice-count text-xs font-extrabold tabular-nums">
            {step} / {plan.total}
          </span>
        </div>
      </div>

      <div className="grid justify-items-center gap-1 text-center">
        {stage && !done && (
          <span key={`stage-${duel?.id}`} className="xp-choice-stage">
            {stage}
          </span>
        )}
        {done ? (
          <p
            key="thanks"
            dir="auto"
            className="xp-choice-prompt"
            aria-live="polite"
          >
            {text(CHOICE_CHAMPION)}
          </p>
        ) : timedOut ? (
          <p
            key="time-up"
            dir="auto"
            className="xp-choice-prompt"
            data-xp-timeout
            aria-live="polite"
          >
            {text(CHOICE_TIME_UP)}
          </p>
        ) : (
          <p
            key={duel?.id}
            dir="auto"
            data-xp-clamp
            className="xp-choice-prompt line-clamp-2"
            aria-live="polite"
          >
            {prompt}
          </p>
        )}
      </div>

      <div
        ref={duelRef}
        className="grid min-h-0 min-w-0 place-items-center overflow-hidden p-[clamp(0.25rem,2cqmin,0.75rem)]"
        style={{ opacity: phase === "interacting" || done ? 1 : 0.6 }}
      >
        {done && champion ? (
          // The one product left, crowned, while the server answers.
          <div
            className="xp-choice-champion"
            style={{ width: championWidth, aspectRatio: "3 / 4" }}
          >
            <ChoiceCard
              option={champion}
              label={text(champion.label)}
              side={championSide}
              state="idle"
              crown
            />
          </div>
        ) : duel ? (
          // Always drawn left to right, whatever the page's direction: the product picked
          // keeps its side, so the sides must not swap.
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
              const product = duel[side];
              const label = text(product.label);
              return (
                <button
                  // The product picked keeps its card: only the newcomer comes in.
                  key={`${product.id}-${side}`}
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
                    option={product}
                    label={label}
                    side={side}
                    state={stateOf(side)}
                  />
                </button>
              );
            })}
            <span
              key={`vs-${duel.id}`}
              className="grid place-items-center"
              style={{ gridColumn: 2, gridRow: 1 }}
            >
              <ChoiceClock
                size={vs}
                timedOut={timedOut}
                clock={
                  showClock
                    ? { leftMs: left, totalMs: roundMs, low: left <= LOW_MS }
                    : null
                }
              />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
