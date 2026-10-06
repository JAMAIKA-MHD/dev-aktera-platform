import { describe, expect, it } from "vitest";
import { ENVELOPE } from "../runtime/layout/breakpoints";
import devices from "./devices.json";

// The device catalog (plan §9.3) is data, read by the Studio and by the responsive sweep.
// Sizes are CSS pixels; laptops give the visible area of the browser, not the screen.

describe("device catalog", () => {
  it("lists the phones, tablets and laptops of the plan, each once", () => {
    const ids = devices.map((device) => device.id);
    expect(new Set(ids).size).toBe(ids.length);
    const count = (group: string) =>
      devices.filter((device) => device.group === group).length;
    expect([count("phone"), count("tablet"), count("laptop")]).toEqual([
      10, 5, 6,
    ]);
    // The entry-level Android phone, very common in Algeria, and the lower edge.
    expect(devices.find((device) => device.id === "android-360")).toMatchObject(
      {
        width: 360,
        height: 800,
      },
    );
    expect(devices.find((device) => device.id === "galaxy-fold")).toMatchObject(
      {
        width: ENVELOPE.minWidth,
      },
    );
  });

  it("stays inside the supported envelope, and says which rotation leaves it", () => {
    const inside = (width: number, height: number) =>
      width >= ENVELOPE.minWidth &&
      width <= ENVELOPE.maxWidth &&
      height >= ENVELOPE.minHeight &&
      height <= ENVELOPE.maxHeight;
    expect(devices.filter((d) => !inside(d.width, d.height))).toEqual([]);
    // Phones and tablets are also tried in landscape (a laptop does not rotate). Only the
    // folded Fold leaves the envelope then (280 px high): outside it, the page may scroll
    // vertically, never sideways (plan §8.3), and the sweep checks exactly that.
    const rotatedOutside = devices
      .filter((d) => d.group !== "laptop" && !inside(d.height, d.width))
      .map((d) => d.id);
    expect(rotatedOutside).toEqual(["galaxy-fold"]);
  });

  it("describes each device fully: density, touch and portrait safe areas", () => {
    for (const device of devices) {
      expect(["phone", "tablet", "laptop"], device.id).toContain(device.group);
      expect(device.label.trim(), device.id).not.toBe("");
      expect(device.dpr, device.id).toBeGreaterThanOrEqual(1);
      expect(device.touch, device.id).toBe(device.group !== "laptop");
      // Phones and tablets are listed in portrait, laptops in landscape.
      expect(device.height > device.width, device.id).toBe(
        device.group !== "laptop",
      );
      const { top, right, bottom, left } = device.safeArea;
      expect([top, right, bottom, left].every((inset) => inset >= 0)).toBe(
        true,
      );
    }
  });
});
