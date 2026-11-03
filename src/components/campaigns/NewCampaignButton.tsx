// "New campaign", as on the Overview: the button opens the wizard, its arrow opens a menu to
// start from a game type (the wizard then opens on that game).
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "../../lib/utils";
// The Overview’s own list of games, so both menus show the same short rows.
import { GAME_LIST } from "../overview/overviewData";
import type { GameType } from "./campaignMeta";
import { cxButtonClass, cxFocus, cxText } from "./campaignUi";
import { GameEmblem } from "./GameEmblem";

// The size of the Overview’s "New campaign" button (overview.css, .ov-btn and .ov-split-btn).
const OVERVIEW_SIZE =
  "h-9 gap-2 px-3 text-[13px] font-semibold [&_svg]:size-[18px] [&_svg]:stroke-[1.75]";

export function NewCampaignButton({
  label,
  onCreate,
  onPickGame,
}: {
  label: string;
  onCreate: () => void;
  onPickGame: (game: GameType) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector("button")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Escape closes the menu; the arrows move between the games.
  const onMenuKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      toggleRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll("button") ?? [])];
    const step = event.key === "ArrowDown" ? 1 : -1;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(index + step + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        onClick={onCreate}
        className={cxButtonClass({
          variant: "primary",
          className: cn(OVERVIEW_SIZE, "rounded-l-[10px] rounded-r-none"),
        })}
      >
        <Plus aria-hidden />
        {label}
      </button>
      <button
        ref={toggleRef}
        type="button"
        aria-label="Choose a game type"
        title="Choose a game type"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cxButtonClass({
          variant: "primary",
          className: cn(
            OVERVIEW_SIZE,
            "rounded-l-none rounded-r-[10px] border-l-[rgba(255,255,255,0.35)] px-2 [&_svg]:size-3.5",
          ),
        })}
      >
        <ChevronDown aria-hidden />
      </button>

      {open && (
        <div
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-30 mt-1.5 w-[280px] rounded-[14px] border border-cx-border bg-cx-surface p-1.5 shadow-cx-pop"
        >
          <p
            id="new-campaign-menu-title"
            className={cn(cxText.label, "px-2 py-1.5")}
          >
            Start from a game type
          </p>
          <div
            ref={menuRef}
            role="menu"
            aria-labelledby="new-campaign-menu-title"
          >
            {GAME_LIST.map((game) => (
              <button
                key={game.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onPickGame(game.id);
                }}
                className={cn(
                  cxFocus,
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-[120ms] hover:bg-cx-sunken",
                )}
              >
                <GameEmblem gameType={game.id} size={36} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-cx-ink">
                    {game.label}
                  </span>
                  <span className="block text-xs leading-4 text-cx-ink-subtle">
                    {game.caption}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
