import type { PreviewScreen } from "../store";
import { useStudio } from "../StudioContext";

// The screen tabs (plan §9.3), in the middle of the preview bar: the one place that picks the screen shown in the
// preview and edited in Content. A dot marks where a demo game is when another tab is open.

const SCREENS: readonly { id: PreviewScreen; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "register", label: "Register" },
  { id: "play", label: "Play" },
  { id: "win", label: "Win" },
  { id: "lose", label: "Lose" },
  { id: "status", label: "Status" },
];

export function ScreenTabs() {
  const screen = useStudio((state) => state.ui.screen);
  const mode = useStudio((state) => state.ui.mode);
  const liveScreen = useStudio((state) => state.liveScreen);
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
            {mode === "demo" && liveScreen === id && !selected && (
              <span
                className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-500"
                aria-label="(current)"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
