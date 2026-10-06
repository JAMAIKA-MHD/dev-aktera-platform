import { useState } from "react";
import { getDirection, resolveText, type Locale } from "../../../domain/locale";
import type { ExperienceConfig, IconName } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { glassSurfaceStyle, tint } from "../../../theme/recipes";
import { StatusBadge } from "../StatusBadge";
import { spacedCaps, startsOnScreenSide } from "../text";

// Slot 1 (prototype Slot1BrandHeader): logo image or icon, brand name, tagline and the
// pulsing "live" dot, on a frosted surface. A full-bleed bar on a narrow phone, a floating
// capsule in the centred column (wide) and in the start pane (split).

export interface BrandHeaderSlotProps {
  brand: ExperienceConfig["brand"];
  locale: Locale;
  fallbackLocale: Locale;
  logoUrl: string | null; // resolved by the caller (AssetStorage.resolveUrl)
  live: boolean;
  badge: string | null;
}

function BrandMark({
  logoUrl,
  icon,
}: {
  logoUrl: string | null;
  icon: IconName;
}) {
  // A logo that fails to load gives way to the icon, never to a broken image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // The name follows as text: the image is decorative for screen readers.
  if (logoUrl && logoUrl !== failedUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        onError={() => setFailedUrl(logoUrl)}
        className="h-[clamp(1.75rem,1.45rem+1.2vw,2.5rem)] w-auto max-w-[40%] shrink-0 rounded-[var(--xp-radius-sm)] object-contain"
      />
    );
  }
  const Icon = ICON_COMPONENTS[icon];
  return (
    <span
      aria-hidden
      data-testid="brand-icon"
      className="grid size-[clamp(2rem,1.7rem+1.2vw,2.5rem)] shrink-0 place-items-center"
      style={{
        background:
          "linear-gradient(135deg, var(--xp-primary-light), var(--xp-primary) 55%, var(--xp-primary-deep))",
        color: "var(--xp-on-primary)",
        borderRadius: "min(var(--xp-radius-pill), 50%)",
        boxShadow: `0 0.4rem 0.9rem -0.3rem ${tint("--xp-primary", 60)}`,
      }}
    >
      <Icon className="size-[55%]" strokeWidth={2.25} />
    </span>
  );
}

function LiveDot() {
  return (
    <span
      aria-hidden
      data-testid="live-dot"
      className="relative flex size-2.5 shrink-0"
    >
      <span
        className="xp-ping absolute inset-0 rounded-full opacity-70"
        style={{ backgroundColor: "var(--xp-primary)" }}
      />
      <span
        className="relative size-2.5 rounded-full"
        style={{
          backgroundColor: "var(--xp-primary)",
          boxShadow: `0 0 0.6rem ${tint("--xp-primary", 70)}`,
        }}
      />
    </span>
  );
}

export function BrandHeaderSlot({
  brand,
  locale,
  fallbackLocale,
  logoUrl,
  live,
  badge,
}: BrandHeaderSlotProps) {
  const name = brand.name.trim();
  const tagline = resolveText(brand.tagline, locale, fallbackLocale);
  // A Latin name on an Arabic screen still starts on the screen's side, next to the logo.
  const align = (text: string) =>
    startsOnScreenSide(text, getDirection(locale)) ? "text-start" : "text-end";
  return (
    <header
      data-xp-slot="header"
      data-xp-edit="brand"
      data-xp-rise
      className="flex items-center gap-3 border-b px-[var(--xp-gutter)] py-3 tight:py-2 wide:rounded-[var(--xp-radius-lg)] wide:border wide:px-4 split:rounded-[var(--xp-radius-lg)] split:border split:px-4"
      style={glassSurfaceStyle}
    >
      <BrandMark logoUrl={logoUrl} icon={brand.logoIcon} />
      <div className="flex min-w-0 flex-1 flex-col">
        {name && (
          <p
            dir="auto"
            data-xp-clamp
            className={`truncate text-[clamp(0.8rem,0.72rem+0.35vw,0.95rem)] font-extrabold leading-tight ${align(name)} ${spacedCaps(name, "uppercase tracking-[0.14em]")}`}
          >
            {name}
          </p>
        )}
        {tagline && (
          <p
            dir="auto"
            data-xp-clamp
            className={`truncate text-[clamp(0.7rem,0.66rem+0.2vw,0.8rem)] font-medium leading-snug text-[var(--xp-text-muted)] ${align(tagline)}`}
          >
            {tagline}
          </p>
        )}
      </div>
      {badge && <StatusBadge label={badge} />}
      {live && <LiveDot />}
    </header>
  );
}
