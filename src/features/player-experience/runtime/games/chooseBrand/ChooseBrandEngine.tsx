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
import { resolveText } from "../../../domain/locale";
import type { ChoiceChampion, ChoicePick } from "../../../domain/participation";
import {
  CHOICE_CHAMPION,
  CHOICE_PROMPT,
  CHOICE_STAGE_LABELS,
  CHOICE_THANKS,
} from "../../../presets/contentDefaults";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import { useElementSize } from "../../layout/useElementSize";
import type { GameEngineProps } from "../types";
import { ChoiceCard, type ChoiceState } from "./ChoiceCard";

// Choose Your Brand. Duel after duel, two cards: the player taps the one they prefer. In the
// "duels" mode the brand set every pair; in a tournament (bracket, ladder) the product picked
// goes on to the next duel, and the last one standing is the player's champion
// (domain/chooseBrand.ts draws the duels). No side is right or wrong — the picks are a
// preference the brand reads later, sent with the participation once the last duel is
// played. Whether that wins, and what, is the server's draw alone (N1): nothing here looks at
// an outcome before the reveal.

const HOLD_MS = 650; // the picked card is seen before the next duel comes in
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

// A new list, a new order or another mode is a new game: in the Studio's preview, while the
// brand edits it. A label or a picture edited keeps the game where it is.
function planKey(plan: ChoicePlan) {
  const items = plan.mode === "duels" ? plan.rounds : plan.order;
  return `${plan.mode}:${items.map((item) => item.id).join(",")}`;
}

export function ChooseBrandEngine(props: GameEngineProps) {
  const settings = props.settings.chooseBrand;
  // The mode and the number of items are the campaign's (Wizard); the design sets the rest.
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

  const { duel, champion } = choiceProgress(plan, sides);
  const playing = phase === "interacting" && !done && duel !== null;
  const tournament = plan.mode !== "duels";

  // A keyboard player keeps the focus on the duel from one to the next: the new duel's cards
  // replace the old ones, and the focus would otherwise fall to the page.
  const refocus = useRef(false);
  const [duelRef, size] = useElementSize<HTMLDivElement>();
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    duelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [sides.length, duelRef]);

  const pick = (side: ChoiceSide) => {
    if (!playing || !duel || locked.current) return;
    locked.current = true;
    refocus.current = Boolean(
      duelRef.current?.contains(document.activeElement),
    );
    setPicked(side);
    runtimeAudio.play("click");
    vibrate("tap");
    const slot = duel[side];
    const nextPicks: ChoicePick[] = [
      ...picks,
      {
        roundId: duel.id,
        side,
        label: short(slot.option.label),
        optionId: slot.contenderId,
      },
    ];
    const nextSides = [...sides, side];
    setPicks(nextPicks);
    later(
      () => {
        const after = choiceProgress(plan, nextSides);
        setSides(nextSides);
        setPicked(null);
        if (after.duel) {
          locked.current = false;
          return;
        }
        setDone(true);
        const crowned: ChoiceChampion | null = after.champion
          ? { optionId: after.champion.id, label: short(after.champion.label) }
          : null;
        send.current({
          kind: "choices",
          mode: plan.mode,
          picks: nextPicks,
          champion: tournament ? crowned : null,
        });
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
  const prompt =
    (duel && text(duel.prompt)) || text(plan.prompt) || text(CHOICE_PROMPT);
  const cta = text(config.screens.play.primaryCta);
  const step = Math.min(sides.length + 1, plan.total);

  // "Quarter-final · 2/4", "Semi-final · 1/2", "Final"; nothing for fixed duels.
  const stage =
    duel && duel.stage !== "duel"
      ? `${text(CHOICE_STAGE_LABELS[duel.stage])}${
          duel.stage !== "final" && duel.stageCount > 1
            ? ` · ${duel.stageIndex}/${duel.stageCount}`
            : ""
        }`
      : null;
  // The champion keeps the tone of the side it won the final on.
  const championSide = picks[picks.length - 1]?.side ?? "left";
  const championWidth = measured
    ? Math.min(size.width * 0.6, size.height * 0.72)
    : undefined;

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-[clamp(0.35rem,2cqmin,0.75rem)]"
      data-xp-game="choose_brand"
      data-xp-choice-mode={plan.mode}
      data-xp-phase={phase}
      data-xp-still={reducedMotion ? "" : undefined}
    >
      {/* The duels: one step each, the current one lit. */}
      <div
        className="flex items-center gap-2"
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
                index < picks.length
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
            {text(tournament ? CHOICE_CHAMPION : CHOICE_THANKS)}
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
        {done && tournament && champion ? (
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
        ) : done ? (
          // What the player chose, duel after duel, while the server answers.
          <ul className="xp-choice-summary" aria-label={prompt}>
            {picks.map((choice, index) => {
              const chosen = plan.rounds[index];
              if (!chosen) return null;
              return (
                <li
                  key={choice.roundId}
                  style={{ animationDelay: `${index * 70}ms` }}
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
        ) : duel ? (
          // Always drawn left to right, whatever the page's direction: the brand set its
          // pictures as a left one and a right one, and a tournament keeps its sides.
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
              const slot = duel[side];
              const label = text(slot.option.label);
              return (
                <button
                  // In "winner stays", the product picked keeps its card: only the newcomer
                  // comes in. Everywhere else, each duel brings two new cards.
                  key={
                    plan.mode === "ladder"
                      ? `${slot.contenderId}-${side}`
                      : `${duel.id}-${side}`
                  }
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
                    option={slot.option}
                    label={label}
                    side={side}
                    state={stateOf(side)}
                  />
                </button>
              );
            })}
            <span
              key={`vs-${duel.id}`}
              aria-hidden
              className="xp-choice-vs"
              style={{ gridColumn: 2, gridRow: 1, width: vs }}
            >
              VS
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
