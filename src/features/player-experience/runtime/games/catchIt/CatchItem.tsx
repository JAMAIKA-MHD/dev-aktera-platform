import type { CSSProperties } from "react";
import type { AssetRef, IconName } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { tint } from "../../../theme/recipes";
import { useAssetSrc } from "../useAssetSrc";

// The item to catch, drawn once and shared by the engine and the pregame teaser: the brand's
// own icon or image on a halo. Its horizontal position is a percentage of the field and its
// vertical one is animated in percentages too (xp-fall), so a resize moves the whole scene with
// the field instead of dropping an item outside of it.

export interface CatchItemProps {
  icon: IconName;
  image: AssetRef;
  x: number; // 0 to 100, across the field
  style?: CSSProperties;
}

export function CatchItem({ icon, image, x, style }: CatchItemProps) {
  const Icon = ICON_COMPONENTS[icon];
  const src = useAssetSrc(image);
  return (
    <span
      data-xp-catch-item
      className="pointer-events-none absolute grid size-[max(44px,min(18cqmin,4.5rem))] place-items-center rounded-full border"
      style={{
        insetInlineStart: `${x}%`,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle at 50% 30%, ${tint("--xp-secondary", 75)}, ${tint("--xp-primary", 30)} 75%)`,
        borderColor: tint("--xp-secondary", 60),
        boxShadow: `0 0 1.25rem ${tint("--xp-secondary", 45)}`,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="size-[70%] rounded-full object-cover"
        />
      ) : (
        <Icon
          aria-hidden
          className="size-[52%]"
          strokeWidth={2.2}
          style={{ color: "var(--xp-on-primary)" }}
        />
      )}
    </span>
  );
}
