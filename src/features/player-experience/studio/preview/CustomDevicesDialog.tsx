import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "../fields/Field";
import type { CustomDeviceInput, useCustomDevices } from "./customDevices";
import type { DeviceGroup } from "./devices";

// "Edit custom devices…": the brand's own sizes, added, renamed or removed, like the custom
// devices of the browser's DevTools. A modal dialog: focus inside, Escape closes it.

type Custom = ReturnType<typeof useCustomDevices>;

const GROUPS: readonly { value: DeviceGroup; label: string }[] = [
  { value: "phone", label: "Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "laptop", label: "Laptop" },
];

const EMPTY: CustomDeviceInput = {
  label: "",
  width: 384,
  height: 854,
  group: "phone",
};

export function CustomDevicesDialog({
  custom,
  onClose,
}: {
  custom: Custom;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CustomDeviceInput>(EMPTY);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const number = (value: string) => Number(value) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Custom devices"
        className="w-full max-w-md space-y-4 rounded-3xl border border-card-border bg-card-bg p-5 text-brand-text shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black">Custom devices</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-xl text-brand-text-muted transition hover:bg-card-hover"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {custom.devices.length === 0 ? (
          <p className="text-sm text-brand-text-muted">
            None yet. Add the phones your customers use most.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {custom.devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center gap-2 rounded-xl border border-card-border px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate font-semibold">
                  {device.label}
                </span>
                <span className="tabular-nums text-brand-text-muted">
                  {device.width}×{device.height}
                </span>
                <button
                  type="button"
                  onClick={() => custom.remove(device.id)}
                  aria-label={`Remove ${device.label}`}
                  className="flex size-9 items-center justify-center rounded-lg text-brand-text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-3 rounded-2xl bg-card-bg-subtle p-3"
          onSubmit={(event) => {
            event.preventDefault();
            custom.add(draft);
            setDraft(EMPTY);
          }}
        >
          <input
            ref={first}
            aria-label="Device name"
            placeholder="My Samsung"
            value={draft.label}
            maxLength={40}
            onChange={(event) =>
              setDraft({ ...draft, label: event.target.value })
            }
            className={inputClass}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              aria-label="Device width"
              type="number"
              value={draft.width}
              onChange={(event) =>
                setDraft({ ...draft, width: number(event.target.value) })
              }
              className={`${inputClass} tabular-nums`}
            />
            <input
              aria-label="Device height"
              type="number"
              value={draft.height}
              onChange={(event) =>
                setDraft({ ...draft, height: number(event.target.value) })
              }
              className={`${inputClass} tabular-nums`}
            />
            <select
              aria-label="Device type"
              value={draft.group}
              onChange={(event) =>
                setDraft({ ...draft, group: event.target.value as DeviceGroup })
              }
              className={`${inputClass} cursor-pointer`}
            >
              {GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-500 active:scale-[0.99]"
          >
            <Plus className="size-4" aria-hidden />
            Add device
          </button>
          <p className="text-xs text-brand-text-muted">
            Sizes in CSS pixels, 280–2560 × 320–1600. Saved in this browser.
          </p>
        </form>
      </div>
    </div>
  );
}
