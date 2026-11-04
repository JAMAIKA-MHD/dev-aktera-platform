// Step 2, Choose Your Brand: how the duels follow one another (the mode) and how many items
// play (rounds or products). Saved as choice_mode / choice_count; the player page holds to
// them, and the Player Studio only sets what each item shows (labels, pictures, question).
import { ChevronRight, Crown, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import {
  CHOICE_COUNTS,
  CHOICE_MODE_IDS,
  CHOICE_MODE_INFO,
  choiceCountFor,
  choicePicks,
  type WizardConfig,
} from "../wizard/mechanicsRegistry";
import {
  GroupLabel,
  hintClass,
  OptionCard,
  rowClass,
  SegmentedChoice,
  StepPanel,
} from "./wizardFields";

type ChoiceMode = WizardConfig["choiceMode"];

const LETTERS = "ABCDEFGH";

// A small drawing of each mode, in the brand tone of the dashboard.
function ModeDiagram({ mode }: { mode: ChoiceMode }) {
  const card = "fill-current opacity-80";
  const line = "fill-none stroke-current";
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-cx-sm bg-cx-brand-soft text-cx-brand-text"
    >
      <svg viewBox="0 0 40 32" className="w-8">
        {mode === "duels" && (
          <>
            <rect x="2" y="4" width="14" height="9" rx="2" className={card} />
            <rect x="24" y="4" width="14" height="9" rx="2" className={card} />
            <rect x="2" y="19" width="14" height="9" rx="2" className={card} />
            <rect x="24" y="19" width="14" height="9" rx="2" className={card} />
            <circle cx="20" cy="8.5" r="1.6" className="fill-current" />
            <circle cx="20" cy="23.5" r="1.6" className="fill-current" />
          </>
        )}
        {mode === "bracket" && (
          <>
            {[2, 10, 17, 25].map((y) => (
              <rect
                key={y}
                x="2"
                y={y}
                width="8"
                height="5"
                rx="1.5"
                className={card}
              />
            ))}
            <path
              d="M10 4.5h3v8h-3M10 19.5h3v8h-3M13 8.5h5M13 23.5h5M24 8.5h3v15h-3M27 16h3"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={line}
            />
            <rect x="18" y="6" width="6" height="5" rx="1.5" className={card} />
            <rect
              x="18"
              y="21"
              width="6"
              height="5"
              rx="1.5"
              className={card}
            />
            <circle cx="34" cy="16" r="4" className="fill-current" />
          </>
        )}
        {mode === "ladder" && (
          <>
            <rect x="2" y="21" width="9" height="7" rx="2" className={card} />
            <rect
              x="15"
              y="12.5"
              width="9"
              height="7"
              rx="2"
              className={card}
            />
            <rect x="28" y="4" width="9" height="7" rx="2" className={card} />
            <path
              d="M11 24.5h2v-8.5h2M24 16h2v-8.5h2"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={line}
            />
          </>
        )}
      </svg>
    </span>
  );
}

// One step of the game, after an arrow from the one before.
function Step({
  children,
  first = false,
  champion = false,
}: {
  children: ReactNode;
  first?: boolean;
  champion?: boolean;
}) {
  return (
    <li className="flex items-center gap-1.5">
      {!first && (
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-cx-ink-subtle"
        />
      )}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-cx-sm border px-2 py-1 text-xs font-semibold leading-4",
          champion
            ? "border-cx-brand bg-cx-brand-soft text-cx-brand-text"
            : "border-cx-border bg-cx-surface text-cx-ink",
        )}
      >
        {champion && <Crown aria-hidden className="size-3.5" />}
        {children}
      </span>
    </li>
  );
}

// The game a player plays, step by step, for the mode and the count chosen.
function flowOf(mode: ChoiceMode, count: number): string[] {
  if (mode === "duels") {
    const shown = Math.min(count, 3);
    const rounds = Array.from(
      { length: shown },
      (_, i) => `${LETTERS[i * 2]} vs ${LETTERS[i * 2 + 1]}`,
    );
    return count > shown ? [...rounds, `… round ${count}`] : rounds;
  }
  if (mode === "bracket") {
    return count === 8
      ? ["Quarter-finals · 4 duels", "Semi-finals · 2 duels", "Final"]
      : ["Semi-finals · 2 duels", "Final"];
  }
  const duels = ["A vs B"];
  for (let i = 2; i < count; i++) duels.push(`Winner vs ${LETTERS[i]}`);
  return duels.length > 3
    ? [duels[0], duels[1], "…", duels[duels.length - 1]]
    : duels;
}

const HOW_IT_PLAYS: Record<ChoiceMode, string> = {
  duels:
    "Each round is a pair you set. Every player sees the same rounds in the same order, and a pick never changes the next round.",
  bracket:
    "Like a cup: products meet in pairs, the one picked goes on to the next stage, until only one is left.",
  ladder:
    "The product picked stays on screen and meets the next one, until every product has played. The last one standing wins.",
};

export function ChooseBrandModeFields({
  w,
  patch,
}: {
  w: WizardConfig;
  patch: (changes: Partial<WizardConfig>) => void;
}) {
  const mode = w.choiceMode;
  const info = CHOICE_MODE_INFO[mode];
  const picks = choicePicks(mode, w.choiceCount);
  const tournament = mode !== "duels";
  const flow = flowOf(mode, w.choiceCount);

  return (
    <StepPanel
      title="Game mode"
      description="How the duels follow one another. There is no right or wrong pick: players state a preference."
    >
      <div
        role="radiogroup"
        aria-label="Game mode"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {CHOICE_MODE_IDS.map((id) => (
          <OptionCard
            key={id}
            selected={mode === id}
            title={CHOICE_MODE_INFO[id].label}
            description={CHOICE_MODE_INFO[id].tagline}
            icon={<ModeDiagram mode={id} />}
            onSelect={() =>
              patch({
                choiceMode: id,
                // The nearest count the new mode plays: 5 rounds become 4 products, etc.
                choiceCount: choiceCountFor(id, w.choiceCount),
              })
            }
          />
        ))}
      </div>

      <div className={cn(rowClass, "grid grid-cols-1 gap-4")}>
        <div className="grid grid-cols-1 gap-2">
          <GroupLabel hint={HOW_IT_PLAYS[mode]}>How it plays</GroupLabel>
          <ol
            aria-label={`${info.label}, step by step`}
            className="flex flex-wrap items-center gap-1.5"
          >
            {flow.map((step, index) => (
              <Step key={index} first={index === 0}>
                {step}
              </Step>
            ))}
            {tournament && <Step champion>Champion</Step>}
          </ol>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <GroupLabel
            hint={
              mode === "bracket"
                ? "A tournament needs 4 or 8 products, so every duel has two."
                : `${CHOICE_COUNTS[mode][0]} to ${CHOICE_COUNTS[mode].at(-1)} ${info.unit}.`
            }
          >
            Number of {info.unit}
          </GroupLabel>
          <SegmentedChoice
            label={`Number of ${info.unit}`}
            value={String(w.choiceCount)}
            onChange={(count) => patch({ choiceCount: Number(count) })}
            options={CHOICE_COUNTS[mode].map((count) => ({
              value: String(count),
              label: String(count),
            }))}
          />
          <p className={cn(hintClass, "font-semibold text-cx-ink")}>
            {picks} {picks === 1 ? "pick" : "picks"} per player
            {tournament ? ", ending with the player's champion." : "."}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-cx-md bg-cx-brand-soft px-4 py-3 text-[13px] leading-5 text-cx-ink">
        <Info
          className="mt-0.5 size-4 shrink-0 text-cx-brand-text"
          aria-hidden
        />
        <p>
          You add the {info.unit === "rounds" ? "pairs" : "products"}, their
          pictures and the question in the Player Studio. The picks are saved
          with each entry. The reward is a draw by default; an instant win is
          always guaranteed (100% Gagnant).
        </p>
      </div>
    </StepPanel>
  );
}
