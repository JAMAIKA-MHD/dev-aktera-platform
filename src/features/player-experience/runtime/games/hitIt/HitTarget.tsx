import type { CSSProperties } from "react";
import type { AssetRef, IconName } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { useOptionalExperienceServices } from "../../../services/ServicesProvider";
import { useGameTheme } from "../../../theme/GameTheme";
import { tint } from "../../../theme/recipes";

// The target, drawn once and shared by the engine and the pregame teaser (plan §8.7): the
// brand's own icon or image, on a halo. Its position is given in percentages of the playing
// field, so a resize moves it with the field instead of dropping it outside (plan §8.6).

export interface HitTargetProps {
  icon: IconName;
  image: AssetRef;
  x: number; // 0 to 100, across the field
  y: number; // 0 to 100, down the field
  beat?: number; // the hits so far: each new one pops the target in again
  style?: CSSProperties;
}

export function HitTarget({
  icon,
  image,
  x,
  y,
  beat = 0,
  style,
}: HitTargetProps) {
  const Icon = ICON_COMPONENTS[icon];
  // A stored image (Supabase Storage) has no URL of its own: the services resolve it. Without
  // services, only an image that already carries its URL can be drawn.
  const services = useOptionalExperienceServices();
  const themeArt = useGameTheme().assets?.hitArt ?? null;
  const src = !image
    ? null
    : services
      ? services.assets.resolveUrl(image)
      : "url" in image
        ? image.url
        : null;
  // The brand's own image first, then the template's target, then the icon on its halo.
  const art = src ? null : themeArt;
  return (
    <span
      data-xp-hit-target
      data-xp-hit-art={art ? "" : undefined}
      className="pointer-events-none absolute grid size-[max(44px,min(22cqmin,5rem))] place-items-center rounded-full border"
      style={{
        insetInlineStart: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        background: art
          ? "none"
          : `radial-gradient(circle at 50% 30%, var(--xp-hit-target, ${tint("--xp-primary", 70)}), var(--xp-hit-target-edge, ${tint("--xp-primary", 25)}) 72%)`,
        borderColor: art
          ? "transparent"
          : `var(--xp-hit-target-edge, ${tint("--xp-primary", 55)})`,
        boxShadow: art
          ? "none"
          : `0 0 1.5rem var(--xp-hit-glow, ${tint("--xp-primary", 45)})`,
        ...style,
      }}
    >
      {/* Pops in again on each hit (games.css), with the target's new place. */}
      <span key={beat} aria-hidden className="xp-hit-pop absolute inset-0" />
      {/* The brand's image when it resolves to a URL, its icon otherwise. */}
      {src ? (
        <img
          src={src}
          alt=""
          className="size-[70%] rounded-full object-cover"
        />
      ) : art ? (
        <img
          src={art}
          alt=""
          draggable={false}
          className="xp-hit-art size-full object-contain"
        />
      ) : (
        <Icon
          aria-hidden
          className="size-[52%]"
          strokeWidth={2}
          style={{ color: "var(--xp-hit-target-icon, var(--xp-on-primary))" }}
        />
      )}
    </span>
  );
}
