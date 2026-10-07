import { RotateCw, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useStudio } from "../StudioContext";
import { DEVICES, deviceSize, type Device, type DeviceGroup } from "./devices";
import { clampToEnvelope, ZOOM_LEVELS } from "./viewportMath";

// The device bar (plan §9.3, tasks.md T6.9), as in the browser's device mode: a device or
// "Responsive", the size (editing a device's size turns it into Responsive, as DevTools do),
// the zoom, the rotation and the device frame. Native controls only: all usable with a keyboard.

export const EDIT_CUSTOM = "__edit-custom__";
const RESPONSIVE = "";

const GROUP_LABELS: Record<DeviceGroup, string> = {
  phone: "Phones",
  tablet: "Tablets",
  laptop: "Laptops & desktops",
};

const control =
  "min-h-9 rounded-lg border border-card-border bg-card-bg px-2 text-xs font-bold text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500";

function SizeInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && draft.trim() !== "" && parsed !== value) {
      onCommit(parsed);
    } else setDraft(String(value));
  };
  return (
    <input
      aria-label={label}
      type="number"
      inputMode="numeric"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && commit()}
      className={`${control} w-[4.5rem] text-center tabular-nums`}
    />
  );
}

export function DeviceToolbar({
  customDevices,
  onEditCustom,
}: {
  customDevices: readonly Device[];
  onEditCustom: () => void;
}) {
  const viewport = useStudio((state) => state.ui.viewport);
  const setViewport = useStudio((state) => state.setViewport);
  const all = [...DEVICES, ...customDevices];
  const device = all.find((candidate) => candidate.id === viewport.deviceId);

  const pick = (id: string) => {
    if (id === EDIT_CUSTOM) return onEditCustom();
    const next = all.find((candidate) => candidate.id === id);
    if (!next) return setViewport({ deviceId: null });
    const orientation = next.group === "laptop" ? "landscape" : "portrait";
    setViewport({
      deviceId: next.id,
      orientation,
      ...deviceSize(next, orientation),
    });
  };
  const resize = (patch: { width?: number; height?: number }) =>
    setViewport({
      deviceId: null,
      ...clampToEnvelope({ ...viewport, ...patch }),
    });
  const turn = () =>
    setViewport({
      width: viewport.height,
      height: viewport.width,
      orientation:
        viewport.orientation === "portrait" ? "landscape" : "portrait",
    });

  return (
    <div
      role="toolbar"
      aria-label="Device bar"
      className="flex flex-wrap items-center gap-2"
    >
      <select
        aria-label="Device"
        value={viewport.deviceId ?? RESPONSIVE}
        onChange={(event) => pick(event.target.value)}
        className={`${control} max-w-[12rem] cursor-pointer`}
      >
        <option value={RESPONSIVE}>Responsive</option>
        {(Object.keys(GROUP_LABELS) as DeviceGroup[]).map((group) => (
          <optgroup key={group} label={GROUP_LABELS[group]}>
            {DEVICES.filter((item) => item.group === group).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {item.width}×{item.height}
              </option>
            ))}
          </optgroup>
        ))}
        <optgroup label="Custom">
          {customDevices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {item.width}×{item.height}
            </option>
          ))}
          <option value={EDIT_CUSTOM}>Edit custom devices…</option>
        </optgroup>
      </select>
      <span className="flex items-center gap-1 text-xs text-brand-text-muted">
        <SizeInput
          label="Width"
          value={viewport.width}
          onCommit={(width) => resize({ width })}
        />
        ×
        <SizeInput
          label="Height"
          value={viewport.height}
          onCommit={(height) => resize({ height })}
        />
      </span>
      <select
        aria-label="Zoom"
        value={String(viewport.zoom)}
        onChange={(event) =>
          setViewport({
            zoom:
              event.target.value === "fit" || event.target.value === "fit-width"
                ? event.target.value
                : Number(event.target.value),
          })
        }
        className={`${control} cursor-pointer`}
      >
        <option value="fit">Fit</option>
        <option value="fit-width">Fit width (scroll)</option>
        {ZOOM_LEVELS.map((level) => (
          <option key={level} value={level}>
            {Math.round(level * 100)} %
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={turn}
        disabled={device?.group === "laptop"}
        aria-label="Rotate"
        title="Rotate (portrait / landscape)"
        className={`${control} flex w-9 items-center justify-center transition hover:bg-card-hover active:scale-95 disabled:opacity-35`}
      >
        <RotateCw className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setViewport({ chrome: !viewport.chrome })}
        disabled={!device}
        aria-pressed={viewport.chrome}
        aria-label="Device frame"
        title={
          device ? "Show the device frame" : "Frames exist for listed devices"
        }
        className={`${control} flex w-9 items-center justify-center transition active:scale-95 disabled:opacity-35 ${
          viewport.chrome && device
            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
            : "hover:bg-card-hover"
        }`}
      >
        <Smartphone className="size-4" aria-hidden />
      </button>
    </div>
  );
}
