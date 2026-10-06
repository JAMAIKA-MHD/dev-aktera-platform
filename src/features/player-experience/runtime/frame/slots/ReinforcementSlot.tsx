import {
  Hourglass,
  Lightbulb,
  ListChecks,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { ScreenContent } from "../../../domain/types";
import { glassSurfaceStyle, tint } from "../../../theme/recipes";
import { spacedCaps } from "../text";

// Slot 6 (prototype Slot6Reinforcement): a small pill that keeps the player going, with
// the progress dots of the prototype when the game gives a progress. The text comes from
// the configuration, or live from the game (a countdown); never a French text in code.

export type ReinforcementKind = Exclude<
  ScreenContent["reinforcement"]["kind"],
  "none"
>;

export interface ReinforcementProgress {
  current: number; // 1-based step being played
  total: number;
}

const KIND_ICONS: Readonly<Record<ReinforcementKind, LucideIcon>> = {
  attempts: RotateCcw,
  timer: Hourglass,
  progress: ListChecks,
  hint: Lightbulb,
};

const MAX_DOTS = 10; // beyond, the text alone says where the player is

function ProgressDots({ current, total }: ReinforcementProgress) {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className="h-1.5 rounded-full transition-colors duration-300"
          style={{
            width: index + 1 === current ? "1.25rem" : "0.375rem",
            backgroundColor:
              index + 1 <= current
                ? "var(--xp-primary)"
                : tint("--xp-text", 22),
          }}
        />
      ))}
    </span>
  );
}

export function ReinforcementSlot({
  kind,
  text,
  progress,
  editPath,
}: {
  kind: ReinforcementKind;
  text: string;
  progress: ReinforcementProgress | null;
  editPath: string | null;
}) {
  const Icon = KIND_ICONS[kind];
  const dots =
    progress && progress.total > 1 && progress.total <= MAX_DOTS
      ? progress
      : null;
  return (
    <div
      data-xp-slot="reinforcement"
      data-xp-edit={editPath ? `${editPath}.reinforcement` : undefined}
      data-xp-rise
      style={{ "--xp-rise-order": 4 } as CSSProperties}
      className="flex flex-col items-center gap-2 split:items-start"
    >
      {dots && <ProgressDots {...dots} />}
      {text && (
        <p
          className="flex max-w-full min-w-0 items-center gap-2 rounded-full border px-3 py-1.5"
          style={glassSurfaceStyle}
        >
          <Icon
            aria-hidden
            className="size-3.5 shrink-0"
            strokeWidth={2.5}
            style={{ color: "var(--xp-primary)" }}
          />
          <span
            dir="auto"
            data-xp-clamp
            className={`truncate text-[0.72rem] font-bold text-[var(--xp-text-muted)] ${spacedCaps(text, "uppercase tracking-[0.14em]")}`}
          >
            {text}
          </span>
        </p>
      )}
    </div>
  );
}
