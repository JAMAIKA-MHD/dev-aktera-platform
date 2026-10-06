import catalog from "../../presets/devices.json";
import type { SafeAreaInsets } from "../../runtime/layout/safeArea";
import type { ViewportState } from "../store";
import { rotate } from "./viewportMath";

// The device catalog (presets/devices.json, plan §9.3), as the Studio reads it. The same file
// feeds the responsive sweep: one list of devices for both.

export type DeviceGroup = "phone" | "tablet" | "laptop";

export interface Device {
  id: string;
  label: string;
  group: DeviceGroup;
  width: number; // CSS pixels, portrait for phones and tablets
  height: number;
  dpr: number;
  touch: boolean;
  safeArea: SafeAreaInsets; // portrait
}

export const DEVICES = catalog as readonly Device[];

// The catalog first, then the brand's own devices (customDevices.ts).
export function findDevice(
  id: string | null,
  custom: readonly Device[] = [],
): Device | null {
  if (id === null) return null;
  return (
    DEVICES.find((device) => device.id === id) ??
    custom.find((device) => device.id === id) ??
    null
  );
}

const NO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// The insets of the device as it is held (viewportMath.rotate for landscape). Laptops are
// listed in landscape already: they never rotate.
export function deviceSafeArea(
  device: Device | null,
  orientation: ViewportState["orientation"],
): SafeAreaInsets {
  if (!device) return NO_INSETS;
  if (orientation === "portrait" || device.group === "laptop") {
    return device.safeArea;
  }
  return rotate(device, device.safeArea).safeArea;
}

// The CSS size of a device as it is held.
export function deviceSize(
  device: Device,
  orientation: ViewportState["orientation"],
): { width: number; height: number } {
  const turned = orientation === "landscape" && device.group !== "laptop";
  return turned
    ? { width: device.height, height: device.width }
    : { width: device.width, height: device.height };
}
