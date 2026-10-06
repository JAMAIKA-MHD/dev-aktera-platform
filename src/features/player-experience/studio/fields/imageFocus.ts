// The point of interest of a background photo (theme.background.focus), in percent of the
// image: 0,0 is the top left corner. Pure helpers of ImageField.

export type Focus = { x: number; y: number };

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

// Arrow keys move the point by 2 %, by 10 % with Shift; any other key: null.
export function nudge(focus: Focus, key: string, large: boolean): Focus | null {
  const step = large ? 10 : 2;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = moves[key];
  if (!move) return null;
  return {
    x: clampPercent(focus.x + move[0]),
    y: clampPercent(focus.y + move[1]),
  };
}

// Only https links: the schema refuses anything else in a remote AssetRef.
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}
