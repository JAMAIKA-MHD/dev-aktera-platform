import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { tint } from "../../theme/recipes";

// Body of slot 5 for the screens without a game: a glowing medallion in the brand color,
// like the hero of slot 2, sized on the slot (cqmin), with an optional line under it.
// A waiting screen turns an arc around it. Never a bare text on an empty background (D12).
export function ScreenMedallion({
  icon: Icon,
  waiting = false,
  children,
}: {
  icon: LucideIcon;
  waiting?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
      <div
        className="xp-pop relative grid size-[clamp(4.5rem,34cqmin,7.5rem)] place-items-center rounded-full border"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${tint("--xp-primary", 30)}, ${tint("--xp-primary", 8)} 72%)`,
          borderColor: tint("--xp-primary", 40),
          boxShadow: `inset 0 0.3rem 0.8rem ${tint("--xp-surface", 45)}, 0 0 3rem ${tint("--xp-primary", 30)}`,
        }}
      >
        {waiting && (
          <span
            aria-hidden
            className="xp-spin absolute -inset-1 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--xp-primary)" }}
          />
        )}
        <Icon
          aria-hidden
          className="size-[44%]"
          strokeWidth={1.75}
          style={{
            color: "var(--xp-primary)",
            filter: `drop-shadow(0 0.2rem 0.45rem ${tint("--xp-primary", 50)})`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
