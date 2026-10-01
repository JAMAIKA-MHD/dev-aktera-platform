import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowScreen } from "../../domain/flow";
import { LOCALES, type Locale } from "../../domain/locale";
import { createDemoCampaign } from "../../presets/demoCampaign";
import type { ScriptedScenario } from "../../services/createLocalServices";
import { BreakpointRuler } from "../preview/BreakpointRuler";
import { useCustomDevices } from "../preview/customDevices";
import { CustomDevicesDialog } from "../preview/CustomDevicesDialog";
import { DeviceToolbar } from "../preview/DeviceToolbar";
import { PreviewViewport } from "../preview/PreviewViewport";
import type { PreviewFlowMode, PreviewScreen } from "../store";
import { useStudio } from "../StudioContext";

// The preview bar (plan §9.3): which language, how the journey plays, and the device bar
// (T6.9); the screen tabs live in the top bar. Picking a screen, a scenario or an outcome restarts the journey
// there; switching language does not, the screen simply redraws in it.

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
  const setLiveScreen = useStudio((state) => state.setLiveScreen);
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

  const custom = useCustomDevices();
  const [editingDevices, setEditingDevices] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-card-border bg-card-bg px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Language"
            className="flex gap-0.5 rounded-xl bg-card-bg-subtle p-1 ring-1 ring-card-border"
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
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
            Scenario
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
      <div className="space-y-2 border-b border-card-border bg-card-bg-subtle px-3 py-2 sm:px-4">
        <DeviceToolbar
          customDevices={custom.devices}
          onEditCustom={() => setEditingDevices(true)}
        />
        <BreakpointRuler />
      </div>
      <PreviewViewport
        customDevices={custom.devices}
        restartKey={restartKey}
        onFlowScreen={(screen) => setLiveScreen(tabOf(screen))}
      />
      {editingDevices && (
        <CustomDevicesDialog
          custom={custom}
          onClose={() => setEditingDevices(false)}
        />
      )}
    </div>
  );
}
