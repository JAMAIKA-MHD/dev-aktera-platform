// Step 2, Pick Your Favorite ("winner stays"): how the game plays, and how many products play.
// Saved as choice_count; the player page holds to it, and the Player Studio only sets what
// each product shows (label, picture) and the question.
import { ChevronRight, Crown, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import {
  CHOICE_COUNT_RANGE,
  CHOICE_ROUND_SECONDS_RANGE,
  choicePicks,
  type WizardConfig,
} from "../wizard/mechanicsRegistry";
import {
  GroupLabel,
  hintClass,
  RangeField,
  rowClass,
  SegmentedChoice,
  StepPanel,
} from "./wizardFields";

const LETTERS = "ABCDEFGH";
const COUNTS = Array.from(
  { length: CHOICE_COUNT_RANGE.max - CHOICE_COUNT_RANGE.min + 1 },
  (_, i) => CHOICE_COUNT_RANGE.min + i,
);

// A small drawing of the game: the product picked climbs to meet the next one.
function LadderDiagram() {
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-cx-sm bg-cx-brand-soft text-cx-brand-text"
    >
      <svg viewBox="0 0 40 32" className="w-8">
        <rect
          x="2"
          y="21"
          width="9"
          height="7"
          rx="2"
          className="fill-current opacity-80"
        />
        <rect
          x="15"
          y="12.5"
          width="9"
          height="7"
          rx="2"
          className="fill-current opacity-80"
        />
        <rect
          x="28"
          y="4"
          width="9"
          height="7"
          rx="2"
          className="fill-current opacity-80"
        />
        <path
          d="M11 24.5h2v-8.5h2M24 16h2v-8.5h2"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="fill-none stroke-current"
        />
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

// The duels of a game with `count` products: A vs B, then the winner vs C, and so on.
function flowOf(count: number): string[] {
  const duels = ["A vs B"];
  for (let i = 2; i < count; i++) duels.push(`Winner vs ${LETTERS[i]}`);
  return duels.length > 3
    ? [duels[0], duels[1], "…", duels[duels.length - 1]]
    : duels;
}

export function ChooseBrandFields({
  w,
  patch,
}: {
  w: WizardConfig;
  patch: (changes: Partial<WizardConfig>) => void;
}) {
  const picks = choicePicks(w.choiceCount);

  return (
    <StepPanel
      title="Winner stays"
      description="Players compare your products two by two. There is no right or wrong pick: they state a preference."
    >
      <div className={cn(rowClass, "grid grid-cols-1 gap-4")}>
        <div className="flex items-start gap-3">
          <LadderDiagram />
          <GroupLabel hint="The first two products meet. The one the player picks stays on screen and meets the next product, until every product has played. The last one standing is the player's champion.">
            How it plays
          </GroupLabel>
        </div>
        <ol
          aria-label="Winner stays, step by step"
          className="flex flex-wrap items-center gap-1.5"
        >
          {flowOf(w.choiceCount).map((step, index) => (
            <Step key={index} first={index === 0}>
              {step}
            </Step>
          ))}
          <Step champion>Champion</Step>
        </ol>

        <div className="grid grid-cols-1 gap-2">
          <GroupLabel
            hint={`${CHOICE_COUNT_RANGE.min} to ${CHOICE_COUNT_RANGE.max} products.`}
          >
            Number of products
          </GroupLabel>
          <SegmentedChoice
            label="Number of products"
            value={String(w.choiceCount)}
            onChange={(count) => patch({ choiceCount: Number(count) })}
            options={COUNTS.map((count) => ({
              value: String(count),
              label: String(count),
            }))}
          />
          <p className={cn(hintClass, "font-semibold text-cx-ink")}>
            {picks} {picks === 1 ? "pick" : "picks"} per player, ending with the
            player's champion.
          </p>
        </div>

        <RangeField
          label="Time per round"
          hint={`${CHOICE_ROUND_SECONDS_RANGE.min} to ${CHOICE_ROUND_SECONDS_RANGE.max} seconds, restarted for each round. When it runs out, the product already on screen stays and no pick is recorded.`}
          value={w.choiceRoundSeconds}
          min={CHOICE_ROUND_SECONDS_RANGE.min}
          max={CHOICE_ROUND_SECONDS_RANGE.max}
          unit=" s"
          onChange={(choiceRoundSeconds) => patch({ choiceRoundSeconds })}
        />
      </div>

      <div className="flex items-start gap-3 rounded-cx-md bg-cx-brand-soft px-4 py-3 text-[13px] leading-5 text-cx-ink">
        <Info
          className="mt-0.5 size-4 shrink-0 text-cx-brand-text"
          aria-hidden
        />
        <p>
          You add the products, their pictures and the question in the Player
          Studio. The picks are saved with each entry. The reward is a draw by
          default; an instant win is always guaranteed (100% Gagnant).
        </p>
      </div>
    </StepPanel>
  );
}
