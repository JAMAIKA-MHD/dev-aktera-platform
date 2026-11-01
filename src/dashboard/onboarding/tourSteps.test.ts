import { describe, expect, it } from "vitest";

import { LAST_STEP, TOUR_STEPS, placeCard, tourStepAt } from "./tourSteps";

const CARD = { width: 360, height: 200 };
const SCREEN = { width: 1440, height: 900 };

describe("the tour's steps", () => {
  it("has a welcome, then one card per step", () => {
    expect(tourStepAt(0)).toBeNull();
    expect(tourStepAt(1)?.id).toBe("overview");
    expect(tourStepAt(LAST_STEP)?.id).toBe("launch");
  });

  it("targets data-tour names only, never class names", () => {
    for (const step of TOUR_STEPS) {
      for (const target of step.targets) {
        expect(target).toMatch(/^[a-z-]+$/);
      }
    }
  });
});

describe("placeCard", () => {
  const entry = { top: 300, left: 20, width: 220, height: 48 };

  it("uses the preferred side when it fits", () => {
    const place = placeCard(entry, CARD, SCREEN, "right");
    expect(place.side).toBe("right");
    expect(place.left).toBe(entry.left + entry.width + 14);
  });

  it("moves to the other side when the preferred one has no room", () => {
    const atTheEnd = { top: 300, left: 1200, width: 220, height: 48 };
    expect(placeCard(atTheEnd, CARD, SCREEN, "right").side).toBe("left");
  });

  it("stays inside the screen near an edge", () => {
    const low = { top: 840, left: 20, width: 220, height: 48 };
    const place = placeCard(low, CARD, SCREEN, "right");
    expect(place.top + CARD.height).toBeLessThanOrEqual(SCREEN.height - 12);
  });

  it("docks to the bottom when no side has room", () => {
    const phone = { width: 320, height: 480 };
    const wide = { top: 120, left: 0, width: 320, height: 240 };
    const place = placeCard(wide, CARD, phone, "right");
    expect(place.side).toBeNull();
    expect(place.top).toBeGreaterThanOrEqual(12);
  });
});
