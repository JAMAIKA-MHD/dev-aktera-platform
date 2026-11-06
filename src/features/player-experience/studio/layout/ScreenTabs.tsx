import { screensFor, type PreviewScreen } from "../store";
import { useStudio } from "../StudioContext";

// The screen tabs (plan §9.3), in the preview bar: they pick the screen shown in the preview and
// edited in Sections (the menu of the Sections panel picks the same one). A draw campaign shows
// "Ballot" in place of Win and Lose: its players never win nor lose on the spot.

const LABELS: Readonly<Record<PreviewScreen, string>> = {
  welcome: "Welcome",
  register: "Register",
  play: "Play",
  win: "Win",
  lose: "Lose",
  ballot: "Ballot",
  status: "Status",
};

export const screenLabel = (screen: PreviewScreen): string =>
  LABELS[screen] ?? screen;

export function ScreenTabs() {
  const screen = useStudio((state) => state.ui.screen);
  const setScreen = useStudio((state) => state.setScreen);
  const ballot = useStudio((state) => state.campaign?.ballot === true);
  const SCREENS = screensFor(ballot).map((id) => ({ id, label: LABELS[id] }));

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
