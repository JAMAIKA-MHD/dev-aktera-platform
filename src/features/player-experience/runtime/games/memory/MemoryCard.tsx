import type { CSSProperties } from "react";
import type { AssetRef, IconName } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { tint } from "../../../theme/recipes";
import { useAssetSrc } from "../useAssetSrc";

// One memory card, drawn once and shared by the engine and the pregame teaser: a face-down
// side (the brand's image or icon on its colors) and a face-up side (one of the board's icons
// on a tone of the theme). The flip is a 3D turn; with reduced motion it is instant.

export type CardState = "down" | "up" | "matched";

const TONES = ["--xp-primary", "--xp-secondary", "--xp-accent"] as const;
export const toneOf = (index: number) => TONES[index % TONES.length];

export interface MemoryCardProps {
  state: CardState;
  face: IconName;
  toneIndex: number;
  backIcon: IconName;
  backImage: AssetRef;
  reducedMotion: boolean;
  style?: CSSProperties;
}

export function MemoryCard({
  state,
  face,
  toneIndex,
  backIcon,
  backImage,
  reducedMotion,
  style,
}: MemoryCardProps) {
  const Face = ICON_COMPONENTS[face];
  const Back = ICON_COMPONENTS[backIcon];
  const backSrc = useAssetSrc(backImage);
  const tone = toneOf(toneIndex);
  const up = state !== "down";
  const side: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "var(--xp-radius-md)",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };
  return (
    <span
      data-xp-card={state}
      data-xp-face={face}
      className="relative block size-full"
      style={{ perspective: "40rem", ...style }}
    >
      <span
        className="absolute inset-0 block"
        style={{
          transformStyle: "preserve-3d",
          transform: up ? "rotateY(180deg)" : "none",
          transition: reducedMotion ? "none" : "transform 320ms ease-out",
        }}
      >
        <span
          style={{
            ...side,
            background: `linear-gradient(145deg, ${tint("--xp-primary", 80)}, ${tint("--xp-secondary", 70)})`,
            border: `1px solid ${tint("--xp-primary", 55)}`,
            boxShadow: `0 0.4rem 1rem -0.4rem ${tint("--xp-primary", 55)}`,
          }}
        >
          {backSrc ? (
            <img
              src={backSrc}
              alt=""
              className="size-[62%] rounded-[var(--xp-radius-sm)] object-cover"
            />
          ) : (
            <Back
              aria-hidden
              className="size-[48%]"
              strokeWidth={2}
              style={{ color: "var(--xp-on-primary)" }}
            />
          )}
        </span>
        <span
          style={{
            ...side,
            transform: "rotateY(180deg)",
            backgroundColor: tint(tone, state === "matched" ? 30 : 16),
            border: `2px solid ${tint(tone, state === "matched" ? 90 : 55)}`,
            boxShadow:
              state === "matched" ? `0 0 1rem ${tint(tone, 50)}` : "none",
          }}
        >
          <Face
            aria-hidden
            className="size-[52%]"
            strokeWidth={2.2}
            style={{ color: `var(${tone})` }}
          />
        </span>
      </span>
    </span>
  );
}
