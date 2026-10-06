import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LOCALES, type Locale } from "../../domain/locale";
import type { ScriptedScenario } from "../../services/createLocalServices";
import { BreakpointRuler } from "../preview/BreakpointRuler";
import { useCustomDevices } from "../preview/customDevices";
import { CustomDevicesDialog } from "../preview/CustomDevicesDialog";
import { DeviceToolbar } from "../preview/DeviceToolbar";
import { PreviewViewport } from "../preview/PreviewViewport";
import { ScreenTabs } from "./ScreenTabs";
import { useStudio } from "../StudioContext";

// The preview bar (plan §9.3): which language, the screen tabs in the middle, and the device bar
// (T6.9). The preview is a still picture of the screen picked: nothing a player does works in it,
// and a click on a text or a block opens the field that edits it. The journey is played in the
// window opened by "Open in window". Picking a screen or a status message draws it again;
// switching language does not, the screen simply redraws in it.

// What the Status tab shows: the screens of a player who cannot play.
const STATUS_MESSAGES: { id: ScriptedScenario; label: string }[] = [
  { id: "duplicate", label: "Already played" },
  { id: "closed", label: "Campaign closed" },
  { id: "network-error", label: "Network error" },
];

const pill = (selected: boolean) =>
  `min-h-9 rounded-lg px-3 text-xs font-bold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-500 ${
    selected
      ? "bg-card-bg text-brand-text shadow-sm ring-1 ring-card-border"
      : "text-brand-text-muted hover:text-brand-text"
  }`;

export function PreviewPane() {
  const ui = useStudio((state) => state.ui);
  const enabled = useStudio((state) => state.config.locales.enabled);
  const setLocale = useStudio((state) => state.setLocale);
  const setMode = useStudio((state) => state.setMode);

  // The frame shows "network error" for any scenario that is not one of the other two.
  const statusMessage: ScriptedScenario =
    ui.scenario === "duplicate" || ui.scenario === "closed"
      ? ui.scenario
      : "network-error";

  // Draw again on screen, mode and status message; the first render is not a redraw.
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
          {ui.screen === "status" && (
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
              Message
              <select
                value={statusMessage}
                onChange={(event) =>
                  setMode("static", event.target.value as ScriptedScenario)
                }
                className="min-h-9 cursor-pointer rounded-lg border border-card-border bg-card-bg px-2 text-xs font-bold normal-case tracking-normal text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                {STATUS_MESSAGES.map((message) => (
                  <option key={message.id} value={message.id}>
                    {message.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* The screen tabs, in the middle; on a narrow bar they take a line of their own. */}
          <div className="flex min-w-max flex-1 justify-center">
            <ScreenTabs />
          </div>
          <button
            type="button"
            onClick={() => setRestartKey((key) => key + 1)}
            className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-brand-text-muted transition hover:bg-card-hover hover:text-brand-text active:scale-95"
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
      <PreviewViewport customDevices={custom.devices} restartKey={restartKey} />
      {editingDevices && (
        <CustomDevicesDialog
          custom={custom}
          onClose={() => setEditingDevices(false)}
        />
      )}
    </div>
  );
}
