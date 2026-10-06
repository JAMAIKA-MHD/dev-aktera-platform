// How much of a scratch card has been scratched (tasks.md T5.3), kept apart from the canvas
// that draws it. Everything here is in normalized coordinates (0 to 1), so the card can be
// resized, rotated or reopened at another size without a single scratch being lost — and so
// the coverage can be counted without reading a single pixel.

export interface ScratchPoint {
  x: number; // 0 to 1, across the card
  y: number; // 0 to 1, down the card
}

// A coarse grid of the card: each cell is either untouched or scratched through. Fine enough
// that the threshold means what it says, cheap enough to update on every pointer move.
export const MASK_RESOLUTION = 28;

export interface ScratchMask {
  readonly resolution: number;
  readonly cells: Uint8Array;
  readonly strokes: ScratchPoint[][]; // what a redraw replays, in the new size's pixels
}

export function createScratchMask(
  resolution: number = MASK_RESOLUTION,
): ScratchMask {
  return {
    resolution,
    cells: new Uint8Array(resolution * resolution),
    strokes: [],
  };
}

// Marks every cell the disc of `radius` (normalized) covers on its way from `from` to `to`.
export function scratchAlong(
  mask: ScratchMask,
  from: ScratchPoint,
  to: ScratchPoint,
  radius: number,
): void {
  const { resolution, cells } = mask;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  // One step per half-radius: a fast swipe leaves a line, never a dotted trail.
  const steps = Math.max(1, Math.ceil(distance / (radius / 2 || 1)));
  for (let step = 0; step <= steps; step++) {
    const ratio = step / steps;
    const x = from.x + (to.x - from.x) * ratio;
    const y = from.y + (to.y - from.y) * ratio;
    const spread = Math.ceil(radius * resolution);
    const column = Math.round(x * resolution);
    const row = Math.round(y * resolution);
    for (let dy = -spread; dy <= spread; dy++) {
      for (let dx = -spread; dx <= spread; dx++) {
        if (dx * dx + dy * dy > spread * spread) continue;
        const cx = column + dx;
        const cy = row + dy;
        if (cx < 0 || cy < 0 || cx >= resolution || cy >= resolution) continue;
        cells[cy * resolution + cx] = 1;
      }
    }
  }
}

// Share of the card scratched through, from 0 to 100.
export function scratchedPercent(mask: ScratchMask): number {
  let scratched = 0;
  for (const cell of mask.cells) scratched += cell;
  return (scratched / mask.cells.length) * 100;
}
