import type { CSSProperties } from "react";
import type { AssetRef, IconName } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { tint } from "../../../theme/recipes";

// The target, drawn once and shared by the engine and the pregame teaser (plan §8.7): the
// brand's own icon or image, on a halo. Its position is given in percentages of the playing
// field, so a resize moves it with the field instead of dropping it outside (plan §8.6).

export interface HitTargetProps {
  icon: IconName;
  image: AssetRef;
  x: number; // 0 to 100, across the field
  y: number; // 0 to 100, down the field
  style?: CSSProperties;
}

export function HitTarget({ icon, image, x, y, style }: HitTargetProps) {
  const Icon = ICON_COMPONENTS[icon];
  return (
    <span
      data-xp-hit-target
      className="pointer-events-none absolute grid size-[max(44px,min(22cqmin,5rem))] place-items-center rounded-full border"
      style={{
        insetInlineStart: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle at 50% 30%, ${tint("--xp-primary", 70)}, ${tint("--xp-primary", 25)} 72%)`,
        borderColor: tint("--xp-primary", 55),
        boxShadow: `0 0 1.5rem ${tint("--xp-primary", 45)}`,
        ...style,
      }}
    >
      {/* A stored image is resolved by the services (AssetStorage); what a mechanic can
          draw on its own is a URL it already has, and the brand's icon otherwise. */}
      {image && "url" in image ? (
        <img
          src={image.url}
          alt=""
          className="size-[70%] rounded-full object-cover"
        />
      ) : (
        <Icon
          aria-hidden
          className="size-[52%]"
          strokeWidth={2}
          style={{ color: "var(--xp-on-primary)" }}
        />
      )}
    </span>
  );
}
