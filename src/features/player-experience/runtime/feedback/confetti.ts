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

// A cartoon win (motion.confetti "cartoon"): stars, circles and squares from two cannons in
// the bottom corners, then a light shower from the top for about three seconds. Fewer pieces
// on a phone than on a large screen, and nothing left running once they have fallen.
const CANNON_SHARE = 0.55;
const SHOWER_MS = 3200;
const SHOWER_EVERY_MS = 320;

function cartoonBurst(
  fire: confetti.CreateTypes,
  colors: string[] | undefined,
  budget: number,
): void {
  const look = {
    shapes: ["star", "circle", "square"] as confetti.Shape[],
    scalar: 1.15,
    ...(colors ? { colors } : {}),
  };
  const cannon = Math.floor((budget * CANNON_SHARE) / 2);
  for (const [x, angle] of [
    [0, 60],
    [1, 120],
  ] as const) {
    void fire({
      ...look,
      particleCount: cannon,
      angle,
      spread: 55,
      startVelocity: 62,
      origin: { x, y: 1 },
    });
  }
  const drops = Math.floor(SHOWER_MS / SHOWER_EVERY_MS);
  const perDrop = Math.max(
    1,
    Math.floor((budget * (1 - CANNON_SHARE)) / drops),
  );
  for (let drop = 1; drop <= drops; drop++) {
    setTimeout(() => {
      void fire({
        ...look,
        particleCount: perDrop,
        angle: 270,
        spread: 140,
        startVelocity: 8,
        gravity: 0.7,
        ticks: 260,
        origin: { x: Math.random(), y: -0.05 },
      });
    }, drop * SHOWER_EVERY_MS);
  }
}

// A pixel win (motion.confetti "pixel"): flat squares in the palette, chunky like pixels,
// thrown up once from the bottom, then a shower of squares and gold coins from the top, each
// falling at its own speed with a slight sway.
function pixelBurst(
  fire: confetti.CreateTypes,
  colors: string[] | undefined,
  budget: number,
): void {
  const look = {
    shapes: ["square"] as confetti.Shape[],
    flat: true,
    scalar: 1.5,
    ...(colors ? { colors } : {}),
  };
  void fire({
    ...look,
    particleCount: Math.floor(budget * 0.4),
    angle: 90,
    spread: 75,
    startVelocity: 55,
    origin: { x: 0.5, y: 1 },
  });
  const drops = Math.floor(SHOWER_MS / SHOWER_EVERY_MS);
  const perDrop = Math.max(1, Math.floor((budget * 0.6) / drops));
  for (let drop = 1; drop <= drops; drop++) {
    setTimeout(() => {
      void fire({
        ...look,
        // Every other drop is coins: the first color (the primary, gold) only, bigger.
        ...(drop % 2 && colors
          ? { colors: colors.slice(0, 1), scalar: 2 }
          : {}),
        particleCount: perDrop,
        angle: 270,
        spread: 160,
        startVelocity: 4 + Math.random() * 6,
        gravity: 0.5 + Math.random() * 0.5,
        drift: Math.random() * 0.6 - 0.3,
        ticks: 320,
        origin: { x: Math.random(), y: -0.05 },
      });
    }, drop * SHOWER_EVERY_MS);
  }
}

// The pieces a screen can take without dropping frames: about 60 on a phone, 150 on a large
// screen.
function particleBudget(doc: Document): number {
  const width = doc.defaultView?.innerWidth ?? 0;
  return width >= 900 ? 150 : 60;
}

// Returns false when nothing was launched (reduced motion, or the browser refused).
export function celebrate(
  themeRoot: HTMLElement,
  {
    reducedMotion,
    style = "classic",
  }: { reducedMotion: boolean; style?: "classic" | "cartoon" | "pixel" },
): boolean {
  if (reducedMotion) return false;
  try {
    const { fire } = launcherFor(themeRoot.ownerDocument);
    const colors = brandColors(themeRoot);
    const budget = particleBudget(themeRoot.ownerDocument);
    if (style === "cartoon") {
      cartoonBurst(fire, colors, budget);
      return true;
    }
    if (style === "pixel") {
      pixelBurst(fire, colors, budget);
      return true;
    }
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
