import { useCallback, useEffect, useState } from "react";
import { createUuid } from "../../domain/uuid";
import type { Device, DeviceGroup } from "./devices";
import { clampToEnvelope } from "./viewportMath";

// The brand's own devices ("My Samsung", 384 × 854), like "Add custom device" in DevTools.
// Kept in this browser, next to the catalog; every access is guarded (C7).

export const CUSTOM_DEVICES_KEY = "xp:studio:devices:v1";
export const MAX_CUSTOM_DEVICES = 20;
const PREFIX = "custom-";

export interface CustomDeviceInput {
  label: string;
  width: number;
  height: number;
  group: DeviceGroup;
}

const GROUPS: readonly DeviceGroup[] = ["phone", "tablet", "laptop"];

export function makeCustomDevice(
  input: CustomDeviceInput,
  key: string = createUuid(),
): Device {
  const group = GROUPS.includes(input.group) ? input.group : "phone";
  return {
    id: `${PREFIX}${key}`,
    label: input.label.trim().slice(0, 40) || "Custom device",
    group,
    ...clampToEnvelope(input),
    dpr: 1,
    touch: group !== "laptop",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

function isStored(item: unknown): item is Device {
  if (typeof item !== "object" || item === null) return false;
  const device = item as Record<string, unknown>;
  return (
    typeof device.id === "string" &&
    device.id.startsWith(PREFIX) &&
    typeof device.label === "string" &&
    typeof device.width === "number" &&
    typeof device.height === "number"
  );
}

export function loadCustomDevices(
  storage: () => Storage = () => globalThis.localStorage,
): Device[] {
  try {
    const data: unknown = JSON.parse(
      storage().getItem(CUSTOM_DEVICES_KEY) ?? "[]",
    );
    if (!Array.isArray(data)) return [];
    // Rebuilt through makeCustomDevice: a stored value is never trusted as it is.
    return data
      .filter(isStored)
      .slice(0, MAX_CUSTOM_DEVICES)
      .map((device) =>
        makeCustomDevice(device, device.id.slice(PREFIX.length)),
      );
  } catch {
    return [];
  }
}

export function saveCustomDevices(
  devices: readonly Device[],
  storage: () => Storage = () => globalThis.localStorage,
): void {
  try {
    storage().setItem(CUSTOM_DEVICES_KEY, JSON.stringify(devices));
  } catch {
    // Not remembered, but still usable in this session.
  }
}

// The list, and the ways to change it; saved on every change.
export function useCustomDevices() {
  const [devices, setDevices] = useState<Device[]>(() => loadCustomDevices());
  useEffect(() => saveCustomDevices(devices), [devices]);
  const add = useCallback(
    (input: CustomDeviceInput) =>
      setDevices((current) =>
        current.length >= MAX_CUSTOM_DEVICES
          ? current
          : [...current, makeCustomDevice(input)],
      ),
    [],
  );
  const update = useCallback(
    (id: string, input: CustomDeviceInput) =>
      setDevices((current) =>
        current.map((device) =>
          device.id === id
            ? makeCustomDevice(input, id.slice(PREFIX.length))
            : device,
        ),
      ),
    [],
  );
  const remove = useCallback(
    (id: string) =>
      setDevices((current) => current.filter((device) => device.id !== id)),
    [],
  );
  return { devices, add, update, remove };
}
