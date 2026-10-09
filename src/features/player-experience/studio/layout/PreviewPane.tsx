import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { LOCALES, type Locale } from "../../domain/locale";
import type { ScriptedScenario } from "../../services/createLocalServices";
import { BreakpointRuler, TIERS, tierOf } from "../preview/BreakpointRuler";
import { useCustomDevices } from "../preview/customDevices";
import { CustomDevicesDialog } from "../preview/CustomDevicesDialog";
import {
  loadPreviewBarOpen,
  savePreviewBarOpen,
} from "../preview/previewBarPrefs";
import { DeviceToolbar } from "../preview/DeviceToolbar";
import { findDevice } from "../preview/devices";
import { PreviewViewport } from "../preview/PreviewViewport";
import { ScreenTabs, screenLabel } from "./ScreenTabs";
import { useStudio } from "../StudioContext";

// The preview bar (plan §9.3): which language, the screen tabs, and the device bar (T6.9), in one
// bar that folds into a one-line summary (screen, language, size, tier, zoom, device) to give the
// preview its height back. The preview is a still picture of the screen picked: nothing a player
// does works in it, and a click on a text or a block opens the field that edits it. The journey
// is played in the window opened by the "Preview" button of the top bar. Picking a screen or a
// status message draws the screen again; switching language does not, the screen simply redraws
// in it.

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

  // Draw again on screen, mode and status message; the first render is not a redraw. (The key
  // is the frame's own "start again" signal; no button of the Studio sends it.)
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

  // The bar: open, or folded to its summary, remembered. The zoom on show comes from the
  // viewport, which computes it ("fit" depends on the room).
  const [barOpen, setBarOpen] = useState(loadPreviewBarOpen);
  const toggleBar = () => {
    const next = !barOpen;
    setBarOpen(next);
    savePreviewBarOpen(next);
  };
  const [zoom, setZoom] = useState(1);
  const summaryId = useId();
  const device = findDevice(ui.viewport.deviceId, custom.devices);
  const tier = TIERS.find((item) => item.id === tierOf(ui.viewport));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-card-border bg-card-bg-subtle px-3 py-1.5 sm:px-4 short:py-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBar}
            aria-label="Preview controls"
            aria-describedby={summaryId}
            aria-expanded={barOpen}
            aria-controls="studio-preview-controls"
            title={barOpen ? "Fold the preview bar" : "Show the preview bar"}
            className="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 text-left text-[11px] font-semibold text-brand-text-muted transition-colors hover:bg-card-hover hover:text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <ChevronDown
              className={`size-4 shrink-0 transition-transform ${barOpen ? "" : "-rotate-90"}`}
              aria-hidden
            />
            {/* What the preview shows: the screen and the language, then the device, its size,
                the layout tier and the zoom. */}
            <span
              id={summaryId}
              className="flex min-w-0 flex-1 items-center gap-2 tabular-nums"
              aria-live="polite"
            >
              <span className="text-brand-text">{screenLabel(ui.screen)}</span>
              <span aria-hidden>·</span>
              <span className="uppercase">{ui.locale}</span>
              <span aria-hidden>·</span>
              <span>
                {ui.viewport.width} × {ui.viewport.height}
              </span>
              <span aria-hidden>·</span>
              <span>{tier?.label}</span>
              <span aria-hidden>·</span>
              <span>{Math.round(zoom * 100)} %</span>
              <span aria-hidden>·</span>
              <span className="truncate">{device?.label ?? "Responsive"}</span>
            </span>
          </button>
        </div>
        {barOpen && (
          <div id="studio-preview-controls" className="space-y-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="radiogroup"
                aria-label="Language"
                className="flex gap-0.5 rounded-xl bg-card-bg p-1 ring-1 ring-card-border"
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
              {/* The screen tabs; on a narrow bar they take a line of their own. */}
              <div className="flex min-w-max flex-1 justify-center">
                <ScreenTabs />
              </div>
            </div>
            <DeviceToolbar
              customDevices={custom.devices}
              onEditCustom={() => setEditingDevices(true)}
            />
            <BreakpointRuler />
          </div>
        )}
      </div>
      <PreviewViewport
        customDevices={custom.devices}
        restartKey={restartKey}
        onZoomChange={setZoom}
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
