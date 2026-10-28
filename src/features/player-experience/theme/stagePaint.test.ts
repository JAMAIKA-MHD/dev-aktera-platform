import { describe, expect, it } from "vitest";
import { cssPolygon, paintFor, raysGradient, svgPoints } from "./stagePaint";

const role = (value: string) =>
  value.startsWith("@") ? `var(--xp-${value.slice(1)})` : value;

describe("stage paint", () => {
  it("turns the rays into one repeating turn, the first color the widest", () => {
    const gradient = raysGradient(
      { rays: ["#111111", "#222222", "@accent"], count: 36 },
      role,
    );
    // 36 rays all round: one turn of the pattern every 10 degrees.
    expect(gradient).toBe(
      "repeating-conic-gradient(from 0deg at 50% 50%, #111111 0deg 5deg, #222222 5.2deg 8deg, var(--xp-accent) 8.2deg 10deg)",
    );
  });

  it("gives a screen its own paint, else the default one", () => {
    const base = { rays: ["#111111", "#222222"], count: 40 };
    const win = { rays: ["#333333", "#444444"], count: 40 };
    expect(paintFor(base, { win }, "win")).toBe(win);
    expect(paintFor(base, { win }, "lose")).toBe(base);
    expect(paintFor(base, {}, undefined)).toBe(base);
  });

  it("writes the frame's polygon for CSS and for SVG", () => {
    const points: [number, number][] = [
      [0, 0],
      [100, 0],
      [50, 99.5],
    ];
    expect(cssPolygon(points)).toBe("polygon(0% 0%, 100% 0%, 50% 99.5%)");
    expect(svgPoints(points)).toBe("0,0 100,0 50,99.5");
  });
});
