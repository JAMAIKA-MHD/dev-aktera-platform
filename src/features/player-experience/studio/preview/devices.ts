import catalog from "../../presets/devices.json";
import type { SafeAreaInsets } from "../../runtime/layout/safeArea";
import type { ViewportState } from "../store";

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

export function findDevice(id: string | null): Device | null {
  return DEVICES.find((device) => device.id === id) ?? null;
}

const NO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// The insets of the device as it is held. In landscape, the notch moves to the side and the
// status bar disappears; the home indicator stays at the bottom, shorter.
export function deviceSafeArea(
  device: Device | null,
  orientation: ViewportState["orientation"],
): SafeAreaInsets {
  if (!device) return NO_INSETS;
  const { top, bottom } = device.safeArea;
  if (orientation === "portrait") return device.safeArea;
  return {
    top: 0,
    right: top,
    bottom: bottom > 0 ? Math.round(bottom * 0.6) : 0,
    left: top,
  };
}
