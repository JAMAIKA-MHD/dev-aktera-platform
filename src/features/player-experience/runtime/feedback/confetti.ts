import confetti from "canvas-confetti";

// Confetti of the win screen (player-ui-maker/utils/confettiUtils.ts), in the colors of the
// brand. canvas-confetti draws by default on a canvas of its own, created on the page that
// imports it: in the Studio it would cover the Studio, not the preview. Here each runtime
// document gets a canvas it owns, fixed over its own viewport, and resized with it
// (resize: true), even during a burst. Nothing flies with reduced motion.

interface Launcher {
  canvas: HTMLCanvasElement;
  fire: confetti.CreateTypes;
}

const launchers = new WeakMap<Document, Launcher>();

function launcherFor(doc: Document): Launcher {
  let launcher = launchers.get(doc);
  if (!launcher) {
    const canvas = doc.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("data-xp-confetti", "");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "60", // above the legal sheet (z-50)
    });
    doc.body.appendChild(canvas);
    launcher = { canvas, fire: confetti.create(canvas, { resize: true }) };
    launchers.set(doc, launcher);
  }
  return launcher;
}

const HEX = /^#[0-9a-f]{6}$/i;

// The brand colors, read from the theme variables of the runtime root.
function brandColors(themeRoot: HTMLElement): string[] | undefined {
  const style = getComputedStyle(themeRoot);
  const colors = [
    "--xp-primary",
    "--xp-primary-light",
    "--xp-secondary",
    "--xp-accent",
  ]
    .map((name) => style.getPropertyValue(name).trim())
    .filter((value) => HEX.test(value));
  return colors.length > 0 ? colors : undefined; // undefined: the library's own palette
}

// Five bursts of different spread and speed: a fan, then a shower.
const BURSTS: readonly (confetti.Options & { share: number })[] = [
  { share: 0.25, spread: 26, startVelocity: 55 },
  { share: 0.2, spread: 60 },
  { share: 0.35, spread: 100, decay: 0.91, scalar: 0.8 },
  { share: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 },
  { share: 0.1, spread: 120, startVelocity: 45 },
];
const PARTICLES = 200;

// Returns false when nothing was launched (reduced motion, or the browser refused).
export function celebrate(
  themeRoot: HTMLElement,
  { reducedMotion }: { reducedMotion: boolean },
): boolean {
  if (reducedMotion) return false;
  try {
    const { fire } = launcherFor(themeRoot.ownerDocument);
    const colors = brandColors(themeRoot);
    for (const { share, ...burst } of BURSTS) {
      void fire({
        ...burst,
        origin: { y: 0.7 },
        particleCount: Math.floor(PARTICLES * share),
        ...(colors ? { colors } : {}),
      });
    }
    return true;
  } catch {
    return false;
  }
}

// Stops the bursts and removes the canvas (runtime unmounted, tests).
export function disposeConfetti(doc: Document): void {
  const launcher = launchers.get(doc);
  if (!launcher) return;
  launcher.fire.reset();
  launcher.canvas.remove();
  launchers.delete(doc);
}
