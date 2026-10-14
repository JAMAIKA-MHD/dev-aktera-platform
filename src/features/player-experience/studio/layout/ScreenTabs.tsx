import type { PreviewScreen } from "../store";
import { useStudio } from "../StudioContext";

// The screen tabs (plan §9.3), in the preview bar: they pick the screen shown in the preview and
// edited in Sections (the menu of the Sections panel picks the same one).

const SCREENS: readonly { id: PreviewScreen; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "register", label: "Register" },
  { id: "play", label: "Play" },
  { id: "win", label: "Win" },
  { id: "lose", label: "Lose" },
  { id: "status", label: "Status" },
];

export const screenLabel = (screen: PreviewScreen): string =>
  SCREENS.find((item) => item.id === screen)?.label ?? screen;

export function ScreenTabs() {
  const screen = useStudio((state) => state.ui.screen);
  const setScreen = useStudio((state) => state.setScreen);

  return (
    <div
      role="tablist"
      aria-label="Screen"
      className="flex flex-wrap justify-center gap-0.5 rounded-xl bg-card-bg-subtle p-1 ring-1 ring-card-border"
    >
      {SCREENS.map(({ id, label }) => {
        const selected = screen === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setScreen(id)}
            className={`relative min-h-9 rounded-lg px-3 text-xs font-bold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-500 ${
              selected
                ? "bg-card-bg text-brand-text shadow-sm ring-1 ring-card-border"
                : "text-brand-text-muted hover:text-brand-text"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
