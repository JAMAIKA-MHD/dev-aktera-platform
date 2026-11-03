// The panel's cloud drawn at its exact size (panel.shape.draw), instead of a picture stretched
// to it: round bumps of one size all along the edge, an outline of one width, whatever the
// texts make its height. Pure: the shell measures the panel and calls it on every resize.
//
// The bumps are circles centred on a line set `bump` inside the box, so they touch its edges
// and never leave it; the inside of that line is filled. The dip between two bumps reaches
// about a third of a bump into the box: a text further in than half a bump is always on the
// cloud.

export interface CloudInput {
  width: number; // px
  height: number;
  bump: number; // a bump's radius, px
  outline: number; // px
  fill: string; // CSS colors
  ink: string;
}

// From one bump's centre to the next, in bumps.
const SPACING = 1.45;

// A bump's radius against the room the panel leaves around its texts: a text that far in
// is past the dips (about a third of a bump) and the outline.
export const BUMP_PER_PAD = 1.8;

interface Circle {
  x: number;
  y: number;
  r: number;
}

// The bumps along one edge, from one corner to the other (both included), every other one a
// little smaller: a drawn cloud, not a gear.
function edge(
  from: [number, number],
  to: [number, number],
  bump: number,
): Circle[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  // Never further apart than SPACING: the dips keep one depth.
  const count = Math.max(1, Math.ceil(length / (bump * SPACING)));
  return Array.from({ length: count }, (_, index) => {
    const t = index / count;
    return {
      x: from[0] + (to[0] - from[0]) * t,
      y: from[1] + (to[1] - from[1]) * t,
      r: index % 2 === 0 ? bump : bump * 0.86,
    };
  });
}

export function cloudCircles(
  input: Pick<CloudInput, "width" | "height" | "bump">,
) {
  const { width, height } = input;
  // A bump never larger than a quarter of the box's narrow side.
  const bump = Math.max(1, Math.min(input.bump, width / 4, height / 4));
  const left = bump;
  const top = bump;
  const right = width - bump;
  const bottom = height - bump;
  const circles = [
    ...edge([left, top], [right, top], bump),
    ...edge([right, top], [right, bottom], bump),
    ...edge([right, bottom], [left, bottom], bump),
    ...edge([left, bottom], [left, top], bump),
  ];
  return { bump, circles, body: { left, top, right, bottom } };
}

const n = (value: number) => Math.round(value * 10) / 10;

export function cloudSvg(input: CloudInput): string {
  const { bump, circles, body } = cloudCircles(input);
  // Thin enough that the bumps' fills still overlap along the line of their centres: the
  // body's edge stays covered between two bumps.
  const outline = Math.min(input.outline, bump * 0.2);
  const rect = `<rect x="${n(body.left)}" y="${n(body.top)}" width="${n(
    body.right - body.left,
  )}" height="${n(body.bottom - body.top)}"/>`;
  const layer = (color: string, inset: number) =>
    `<g style="fill:${color}">${circles
      .map(
        (circle) =>
          `<circle cx="${n(circle.x)}" cy="${n(circle.y)}" r="${n(circle.r - inset)}"/>`,
      )
      .join("")}${rect}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(input.width)}" height="${n(
    input.height,
  )}" viewBox="0 0 ${n(input.width)} ${n(input.height)}">${layer(
    input.ink,
    0,
  )}${layer(input.fill, outline)}</svg>`;
}

// As a CSS background image.
export function cloudImage(input: CloudInput): string {
  return `url("data:image/svg+xml,${encodeURIComponent(cloudSvg(input))}")`;
}
