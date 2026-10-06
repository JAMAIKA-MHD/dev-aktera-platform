import type { LayoutIssue } from "../../runtime/layout/layoutAudit";
import type { ViewportState } from "../store";
import { deviceSafeArea, deviceSize, type Device } from "./devices";
import type { Insets, Size } from "./viewportMath";

// "Check all sizes" (plan §9.3, tasks.md T6.10): every device of the catalog, in portrait and
// in landscape (laptops only as they are), measured one after the other. The measure itself
// is given by the caller (a hidden iframe in the Studio, a fake in tests): this is the loop,
// its progress and its cancellation.

export interface SizeToCheck {
  key: string; // "iphone-12:landscape"
  device: Device;
  orientation: ViewportState["orientation"];
  size: Size;
  safeArea: Insets;
}

export interface SizeResult extends SizeToCheck {
  issues: LayoutIssue[];
  error?: string; // the size could not be measured (timeout)
}

export function sizesToCheck(devices: readonly Device[]): SizeToCheck[] {
  const sizes: SizeToCheck[] = [];
  for (const device of devices) {
    const orientations: ViewportState["orientation"][] =
      device.group === "laptop" ? ["landscape"] : ["portrait", "landscape"];
    for (const orientation of orientations) {
      sizes.push({
        key: `${device.id}:${orientation}`,
        device,
        orientation,
        size: deviceSize(device, orientation),
        safeArea: deviceSafeArea(device, orientation),
      });
    }
  }
  return sizes;
}

export async function checkSizes(
  sizes: readonly SizeToCheck[],
  measure: (size: SizeToCheck) => Promise<LayoutIssue[]>,
  options: {
    onProgress?: (done: number, result: SizeResult) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ results: SizeResult[]; cancelled: boolean }> {
  const results: SizeResult[] = [];
  for (const size of sizes) {
    if (options.signal?.aborted) return { results, cancelled: true };
    let result: SizeResult;
    try {
      result = { ...size, issues: await measure(size) };
    } catch (error) {
      result = {
        ...size,
        issues: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
    if (options.signal?.aborted) return { results, cancelled: true };
    results.push(result);
    options.onProgress?.(results.length, result);
  }
  return { results, cancelled: false };
}
