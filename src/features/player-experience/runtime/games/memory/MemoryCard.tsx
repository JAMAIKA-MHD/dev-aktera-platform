import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { AssetRef, IconName } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { useGameTheme } from "../../../theme/GameTheme";
import { useAssetSrc } from "../useAssetSrc";

// One memory card, drawn once and shared by the engine and the pregame teaser: a face-down
// side and a face-up side, turned in 3D (instant with reduced motion). Its look is the
// template's (games.memory in theme.json → --xp-memory-*, styled in games.css), else the
// classic one in the brand's colors.
//
// What each side shows, first found wins:
// - back: the brand's picture, the template's art (games.memory.art), the brand's icon;
// - face: the brand's picture of that face, the template's drawing of its icon
//   (games.memory.faceArt, or its prize art), the icon itself on a tone of the brand.

export type CardState = "down" | "up" | "matched";

const TONES = ["--xp-primary", "--xp-secondary", "--xp-accent"] as const;
export const toneOf = (index: number) => TONES[index % TONES.length];

export interface MemoryCardProps {
  state: CardState;
  face: IconName;
  faceImage: AssetRef;
  toneIndex: number;
  backIcon: IconName;
  backImage: AssetRef;
  reducedMotion: boolean;
  miss?: boolean; // a wrong pair, shown for a moment before it turns back
  style?: CSSProperties;
}

export function MemoryCard({
  state,
  face,
  faceImage,
  toneIndex,
  backIcon,
  backImage,
  reducedMotion,
  miss = false,
  style,
}: MemoryCardProps) {
  const Face = ICON_COMPONENTS[face];
  const Back = ICON_COMPONENTS[backIcon];
  const assets = useGameTheme().assets;
  const backSrc = useAssetSrc(backImage);
  const faceSrc = useAssetSrc(faceImage);
  const backArt = backSrc ? null : (assets?.memoryBack ?? null);
  const faceArt = faceSrc ? null : (assets?.memoryFaces[face] ?? null);

  return (
    <span
      data-xp-card={state}
      data-xp-face={face}
      data-xp-miss={miss && state === "up" ? "" : undefined}
      data-xp-still={reducedMotion ? "" : undefined}
      className="xp-memory-card relative block size-full"
      style={
        {
          "--xp-memory-tone": `var(${toneOf(toneIndex)})`,
          ...style,
        } as CSSProperties
      }
    >
      <span className="xp-memory-turn absolute inset-0 block">
        <span className="xp-memory-side xp-memory-back" aria-hidden>
          {backSrc ? (
            <img
              src={backSrc}
              alt=""
              draggable={false}
              className="xp-memory-photo size-[64%] object-cover"
            />
          ) : backArt ? (
            <img
              src={backArt}
              alt=""
              draggable={false}
              className="xp-memory-art size-[62%] object-contain"
            />
          ) : (
            <Back
              aria-hidden
              className="xp-memory-back-icon size-[46%]"
              strokeWidth={2.2}
            />
          )}
        </span>
        <span
          className="xp-memory-side xp-memory-face"
          data-xp-memory-picture={faceSrc ? "" : undefined}
          aria-hidden
        >
          {faceSrc ? (
            <img
              src={faceSrc}
              alt=""
              draggable={false}
              className="xp-memory-photo size-[82%] object-cover"
            />
          ) : faceArt ? (
            <img
              src={faceArt}
              alt=""
              draggable={false}
              className="xp-memory-art size-[70%] object-contain"
            />
          ) : (
            <Face
              aria-hidden
              className="xp-memory-face-icon size-[54%]"
              strokeWidth={2.2}
            />
          )}
          {state === "matched" && (
            <span className="xp-memory-badge absolute grid place-items-center rounded-full">
              <Check aria-hidden className="size-[70%]" strokeWidth={3.2} />
            </span>
          )}
        </span>
      </span>
    </span>
  );
}
