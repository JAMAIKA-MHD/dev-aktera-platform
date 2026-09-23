import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowScreen } from "../../domain/flow";
import { LOCALES, type Locale } from "../../domain/locale";
import { createDemoCampaign } from "../../presets/demoCampaign";
import type { ScriptedScenario } from "../../services/createLocalServices";
import { PreviewViewport } from "../preview/PreviewViewport";
import type { PreviewFlowMode, PreviewScreen } from "../store";
import { useStudio } from "../StudioContext";

// The preview bar (plan §9.3): which screen, which language, how the journey plays. The
// device bar joins it in T6.9. Picking a screen, a mode or a scenario restarts the journey
// there; switching language does not, the screen simply redraws in it.

const SCREENS: readonly { id: PreviewScreen; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "register", label: "Register" },
  { id: "play", label: "Play" },
  { id: "win", label: "Win" },
  { id: "lose", label: "Lose" },
  { id: "status", label: "Status" },
];

const MODES: readonly { id: PreviewFlowMode; label: string; hint: string }[] = [
  {
    id: "demo",
    label: "Full flow (demo)",
    hint: "Play it like a player, with the real odds",
  },
  { id: "scripted", label: "Scripted", hint: "Choose the outcome" },
  {
    id: "static",
    label: "Static screen",
    hint: "A still screen, to work on the texts",
  },
];

// Which tab a screen of the journey belongs to, to follow a demo game as it goes.
function tabOf(screen: FlowScreen): PreviewScreen {
  if (screen === "resolving" || screen === "revealing") return "play";
  if (screen === "duplicate" || screen === "closed" || screen === "error") {
    return "status";
  }
  return screen;
}

const pill = (selected: boolean) =>
  `min-h-9 rounded-lg px-3 text-xs font-bold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-500 ${
    selected
      ? "bg-card-bg text-brand-text shadow-sm ring-1 ring-card-border"
      : "text-brand-text-muted hover:text-brand-text"
  }`;

export function PreviewPane() {
  const ui = useStudio((state) => state.ui);
  const enabled = useStudio((state) => state.config.locales.enabled);
  const campaign = useStudio((state) => state.campaign);
  const gameType = useStudio((state) => state.config.game.type);
  const setScreen = useStudio((state) => state.setScreen);
  const setLocale = useStudio((state) => state.setLocale);
  const setMode = useStudio((state) => state.setMode);

  const prizes = useMemo(
    () => (campaign ?? createDemoCampaign(gameType)).prizes,
    [campaign, gameType],
  );
  const scenarios: { id: ScriptedScenario; label: string }[] = [
    ...prizes.map((prize) => ({
      id: `win-${prize.id}` as ScriptedScenario,
      label: `Win · ${prize.name}`,
    })),
    { id: "lose", label: "Lose" },
    { id: "duplicate", label: "Already played" },
    { id: "closed", label: "Campaign closed" },
    { id: "network-error", label: "Network error" },
  ];

  // Restart on screen, mode and scenario; the first render is not a restart.
  const [restartKey, setRestartKey] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRestartKey((key) => key + 1);
  }, [ui.screen, ui.mode, ui.scenario]);

  const [live, setLive] = useState<PreviewScreen | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-card-border bg-card-bg px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Screen"
            className="flex flex-wrap gap-0.5 rounded-xl bg-card-bg-subtle p-1 ring-1 ring-card-border"
          >
            {SCREENS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={ui.screen === id}
                onClick={() => setScreen(id)}
                className={`relative ${pill(ui.screen === id)}`}
              >
                {label}
                {ui.mode === "demo" && live === id && ui.screen !== id && (
                  <span
                    className="absolute right-1 top-1 size-1.5 rounded-full bg-emerald-500"
                    aria-label="(current)"
                  />
                )}
              </button>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label="Language"
            className="ml-auto flex gap-0.5 rounded-xl bg-card-bg-subtle p-1 ring-1 ring-card-border"
          >
            {LOCALES.map((locale: Locale) => (
              <button
                key={locale}
                type="button"
                role="radio"
                aria-checked={ui.locale === locale}
                disabled={!enabled.includes(locale)}
                title={
                  enabled.includes(locale)
                    ? undefined
                    : "Not enabled for players (Content › Languages)"
                }
                onClick={() => setLocale(locale)}
                className={`${pill(ui.locale === locale)} uppercase disabled:opacity-35`}
              >
                {locale}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
            Mode
            <select
              value={ui.mode}
              onChange={(event) =>
                setMode(event.target.value as PreviewFlowMode)
              }
              title={MODES.find((mode) => mode.id === ui.mode)?.hint}
              className="min-h-9 cursor-pointer rounded-lg border border-card-border bg-card-bg px-2 text-xs font-bold normal-case tracking-normal text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          {ui.mode !== "demo" && (
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
              Outcome
              <select
                value={ui.scenario}
                onChange={(event) =>
                  setMode(ui.mode, event.target.value as ScriptedScenario)
                }
                className="min-h-9 max-w-[12rem] cursor-pointer rounded-lg border border-card-border bg-card-bg px-2 text-xs font-bold normal-case tracking-normal text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => setRestartKey((key) => key + 1)}
            className="ml-auto flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-brand-text-muted transition hover:bg-card-hover hover:text-brand-text active:scale-95"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Restart
          </button>
        </div>
      </div>
      <PreviewViewport
        restartKey={restartKey}
        onFlowScreen={(screen) => setLive(tabOf(screen))}
      />
    </div>
  );
}
