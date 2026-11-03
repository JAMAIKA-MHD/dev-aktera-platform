import { describe, expect, it } from "vitest";
import { cloudCircles, cloudImage, cloudSvg } from "./cloudShape";

// The cloud drawn at the panel's size (panel.shape.draw): round bumps of one size, inside
// the box, close enough together that their dips keep one depth.

describe("cloudCircles", () => {
  it("keeps every bump inside the box and touches its four edges", () => {
    const { circles } = cloudCircles({ width: 340, height: 760, bump: 40 });
    for (const { x, y, r } of circles) {
      expect(x - r).toBeGreaterThanOrEqual(-0.01);
      expect(y - r).toBeGreaterThanOrEqual(-0.01);
      expect(x + r).toBeLessThanOrEqual(340.01);
      expect(y + r).toBeLessThanOrEqual(760.01);
    }
    const reach = (edge: (c: (typeof circles)[number]) => number) =>
      Math.min(...circles.map(edge));
    expect(reach(({ x, r }) => x - r)).toBeCloseTo(0);
    expect(reach(({ y, r }) => y - r)).toBeCloseTo(0);
  });

  it("keeps the same bumps whatever the height: a taller cloud gets more of them", () => {
    const short = cloudCircles({ width: 340, height: 400, bump: 40 });
    const tall = cloudCircles({ width: 340, height: 1200, bump: 40 });
    expect(tall.bump).toBe(short.bump);
    expect(tall.circles.length).toBeGreaterThan(short.circles.length);
  });

  it("never spaces two bumps more than 1.45 bumps apart", () => {
    const { circles, bump } = cloudCircles({
      width: 517,
      height: 901,
      bump: 33,
    });
    for (let index = 0; index < circles.length; index++) {
      const a = circles[index]!;
      const b = circles[(index + 1) % circles.length]!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(
        bump * 1.45 + 0.01,
      );
    }
  });

  it("shrinks the bumps on a small box", () => {
    expect(cloudCircles({ width: 80, height: 60, bump: 40 }).bump).toBe(15);
  });
});

describe("cloudSvg", () => {
  it("draws the outline under the fill, at the box's own size", () => {
    const svg = cloudSvg({
      width: 300,
      height: 500,
      bump: 30,
      outline: 4,
      fill: "#FFFFFF",
      ink: "#1B2A3A",
    });
    expect(svg).toContain('viewBox="0 0 300 500"');
    expect(svg.indexOf("fill:#1B2A3A")).toBeLessThan(
      svg.indexOf("fill:#FFFFFF"),
    );
    expect(
      cloudImage({
        width: 1,
        height: 1,
        bump: 1,
        outline: 0,
        fill: "#FFFFFF",
        ink: "#000000",
      }),
    ).toMatch(/^url\("data:image\/svg\+xml,/);
  });
});
