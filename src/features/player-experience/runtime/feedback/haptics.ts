// A short vibration, when the device can (plan §8.6, D11): a tap to confirm a gesture, a
// double pulse for a win. Silently nothing elsewhere (desktops, iOS Safari).

const PATTERNS: Readonly<Record<"tap" | "win", number | number[]>> = {
  tap: 10,
  win: [30, 60, 30],
};

export function vibrate(kind: keyof typeof PATTERNS): boolean {
  try {
    if (typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(PATTERNS[kind]);
  } catch {
    return false;
  }
}
