// A short vibration, when the device can (plan §8.6, D11): a tap to confirm a gesture, a
// double pulse for a win. Silently nothing elsewhere (desktops, iOS Safari). A lively theme
// (motion.games) adds a medium tick for the wheel's last slices, a strong burst for a win and
// a soft double pulse for a loss.

const PATTERNS: Readonly<
  Record<"tap" | "tick" | "win" | "bigWin" | "lose", number | number[]>
> = {
  tap: 10,
  tick: 18,
  win: [30, 60, 30],
  bigWin: [60, 50, 90],
  lose: [20, 90, 20],
};

export function vibrate(kind: keyof typeof PATTERNS): boolean {
  try {
    if (typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(PATTERNS[kind]);
  } catch {
    return false;
  }
}
