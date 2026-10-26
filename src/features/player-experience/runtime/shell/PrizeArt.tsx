import { useMemo, useState } from "react";
import type { AssetRef, IconName } from "../../domain/types";
import { ICON_COMPONENTS } from "../../presets/icons";
import { useOptionalExperienceServices } from "../../services/ServicesProvider";
import { useGameTheme } from "../../theme/GameTheme";
import { prizeArtUrl } from "../../theme/themeAssets";

// A prize's picture: the brand's own image of it, else the theme's prize art for its icon
// (a gift, a ticket, a coin…), else the icon itself in the theme's colors. Decorative: the
// prize's name always follows as text. It also works on its own, outside a ServicesProvider
// (the brand's image then needs one to resolve, and the theme's art is shown instead).

export function PrizeArt({
  image,
  icon,
  className,
}: {
  image: AssetRef;
  icon: IconName | null;
  className?: string;
}) {
  const storage = useOptionalExperienceServices()?.assets ?? null;
  const { assets } = useGameTheme();
  const own = useMemo(
    () => (storage ? storage.resolveUrl(image) : null),
    [storage, image],
  );
  // An image that fails to load gives way to the next picture, never to a broken one.
  const [failed, setFailed] = useState<string | null>(null);
  const url = [own, prizeArtUrl(assets, icon)].find(
    (candidate): candidate is string => !!candidate && candidate !== failed,
  );
  if (url) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        onError={() => setFailed(url)}
        className={className}
      />
    );
  }
  const Icon = ICON_COMPONENTS[icon ?? "gift"];
  return (
    <Icon
      aria-hidden
      className={className}
      color="var(--xp-primary)"
      strokeWidth={1.75}
    />
  );
}
