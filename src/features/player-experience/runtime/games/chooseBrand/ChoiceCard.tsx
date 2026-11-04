import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChoiceOption } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { useAssetSrc } from "../useAssetSrc";

// One side of a Choose Your Brand round, drawn once and shared by the engine and the teaser:
// the brand's picture (else its icon on a soft halo) above its label. Its look is the
// template's (games.choice in theme.json → --xp-choice-*, styled in games.css), else the
// classic one in the brand's colors. The left side takes the primary tone, the right one the
// secondary, so the two read as two different things even on icons.

export type ChoiceState = "idle" | "picked" | "dropped";
export type ChoiceSide = "left" | "right";

export interface ChoiceCardProps {
  option: ChoiceOption;
  label: string; // already resolved in the player's language
  side: ChoiceSide;
  state: ChoiceState;
  style?: CSSProperties;
}

export function ChoiceCard({
  option,
  label,
  side,
  state,
  style,
}: ChoiceCardProps) {
  const src = useAssetSrc(option.image);
  const Icon = ICON_COMPONENTS[option.icon];
  return (
    <span
      data-xp-choice={state}
      data-xp-side={side}
      data-xp-picture={src ? "" : undefined}
      className="xp-choice-card"
      style={
        {
          "--xp-choice-tone":
            side === "left" ? "var(--xp-primary)" : "var(--xp-secondary)",
          ...style,
        } as CSSProperties
      }
    >
      <span className="xp-choice-media" aria-hidden>
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
        ) : (
          <Icon className="xp-choice-icon" strokeWidth={2} />
        )}
      </span>
      {label && (
        <span dir="auto" data-xp-clamp className="xp-choice-label">
          {label}
        </span>
      )}
      {state === "picked" && (
        <span className="xp-choice-badge" aria-hidden>
          <Check className="size-[64%]" strokeWidth={3.2} />
        </span>
      )}
    </span>
  );
}
