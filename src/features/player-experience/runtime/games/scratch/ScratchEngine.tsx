import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { resolveText } from "../../../domain/locale";
import { RESULT_TEXT } from "../../../presets/contentDefaults";
import { useGameTheme } from "../../../theme/GameTheme";
import { tint } from "../../../theme/recipes";
import { runtimeAudio } from "../../feedback/audio";
import { useElementSize } from "../../layout/useElementSize";
import type { GameEngineProps } from "../types";
import {
  SCRATCH_COVER_TEXT,
  ScratchCardFace,
  scratchCanvasInks,
} from "./ScratchCardFace";
import {
  createScratchMask,
  scratchAlong,
  scratchedPercent,
  type ScratchPoint,
} from "./scratchMask";

// The scratch card (plan §8.6, tasks.md T5.3). The prize is already known when the player
// starts scratching (the draw runs before the animation): the engine only uncovers what it
// was handed (N1). What has been scratched is held in normalized coordinates — a resize
// repaints the very same scratches at the new size, and the percentage never moves.

const SCRATCH_RADIUS = 0.07; // of the card's width
const REVEAL_MS = 420;
// A lively theme (motion.games): flakes of foil fly off under the finger, a few at a time,
// and the scratching sound follows the speed (one per stretch of card scratched).
const FLAKE_EVERY_MS = 28;
const FLAKES_AT_ONCE = 24;
const FLAKE_MS = 560;
const SOUND_EVERY = 0.045; // of the card's width scratched

export function ScratchEngine({
  settings,
  campaign,
  config,
  phase,
  outcome,
  onStart,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const [card, size] = useElementSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const mask = useRef(createScratchMask());
  const last = useRef<ScratchPoint | null>(null);
  const [uncovered, setUncovered] = useState(false);
  const motion = useGameTheme().manifest?.motion;
  const lively = motion?.games === "lively";
  // A stepped theme (motion.feel) digs out whole pixel blocks, never round strokes.
  const blocky = motion?.feel === "stepped";
  const flakes = useRef<HTMLDivElement>(null);
  const flakedAt = useRef(0);
  const scratchedSinceSound = useRef(0);
  const fallback = config.locales.default;
  const threshold = settings.scratch?.revealThresholdPercent ?? 50;
  const coverText = resolveText(settings.scratch?.coverText, locale, fallback);

  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });
  const handOver = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(handOver.current), []);

  // Repaints the cover at the canvas's current size, then takes back out every scratch made
  // so far: the work already done survives a resize, a rotation, anything (plan §8.6).
  const repaint = useCallback(() => {
    const element = canvas.current;
    const context = element?.getContext?.("2d");
    if (!element || !context) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = Math.max(1, Math.round(size.width * ratio));
    element.height = Math.max(1, Math.round(size.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, size.width, size.height);
    const inks = getComputedStyle(element);
    const foil = context.createLinearGradient(0, 0, size.width, size.height);
    foil.addColorStop(0, inks.borderTopColor);
    foil.addColorStop(0.45, inks.borderRightColor);
    foil.addColorStop(1, inks.borderBottomColor);
    context.fillStyle = foil;
    context.fillRect(0, 0, size.width, size.height);
    context.globalCompositeOperation = "destination-out";
    if (blocky) {
      digBlocks(context, mask.current.strokes, size.width, size.height);
      return;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = SCRATCH_RADIUS * 2 * size.width;
    for (const stroke of mask.current.strokes) {
      context.beginPath();
      stroke.forEach((point, index) => {
        const x = point.x * size.width;
        const y = point.y * size.height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      // A single tap still leaves a mark, not an empty path.
      if (stroke.length === 1) {
        context.lineTo(
          stroke[0].x * size.width + 0.01,
          stroke[0].y * size.height,
        );
      }
      context.stroke();
    }
  }, [size.width, size.height, blocky]);

  useEffect(repaint, [repaint, uncovered]);

  const scratching = phase === "revealing" && !uncovered;

  // The rest of the cover fades away, then the journey is handed back.
  const finish = useCallback(() => {
    setUncovered(true);
    runtimeAudio.play("win");
    clearTimeout(handOver.current);
    handOver.current = setTimeout(
      () => revealComplete.current(),
      reducedMotion ? 0 : REVEAL_MS,
    );
  }, [reducedMotion]);

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!scratching || event.buttons === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const point = {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    };
    const from = last.current ?? point;
    scratchAlong(mask.current, from, point, SCRATCH_RADIUS);
    if (lively && !reducedMotion) flake(point);
    if (last.current === null) mask.current.strokes.push([point]);
    else mask.current.strokes[mask.current.strokes.length - 1]?.push(point);
    last.current = point;
    repaint();
    if (!lively) runtimeAudio.play("scratch");
    else {
      scratchedSinceSound.current += Math.hypot(
        point.x - from.x,
        point.y - from.y,
      );
      if (
        scratchedSinceSound.current >= SOUND_EVERY ||
        from === point // the first touch
      ) {
        scratchedSinceSound.current = 0;
        runtimeAudio.play("scratch");
      }
    }
    if (scratchedPercent(mask.current) >= threshold) finish();
  };

  // A flake of foil where the finger is: a small piece of the cover, flying off and fading
  // (games.css), straight in the DOM so that scratching never re-renders anything.
  const flake = (point: ScratchPoint) => {
    const box = flakes.current;
    const now = performance.now();
    if (!box || now - flakedAt.current < FLAKE_EVERY_MS) return;
    if (box.childElementCount >= FLAKES_AT_ONCE) return;
    flakedAt.current = now;
    const piece = document.createElement("span");
    piece.className = "xp-scratch-flake";
    piece.style.left = `${(point.x * 100).toFixed(1)}%`;
    piece.style.top = `${(point.y * 100).toFixed(1)}%`;
    piece.style.setProperty(
      "--xp-flake-x",
      `${(Math.random() * 2 - 1) * 2.4}rem`,
    );
    piece.style.setProperty("--xp-flake-y", `${-0.6 - Math.random() * 1.8}rem`);
    piece.style.setProperty(
      "--xp-flake-turn",
      `${Math.round(Math.random() * 540 - 270)}deg`,
    );
    box.appendChild(piece);
    setTimeout(() => piece.remove(), FLAKE_MS);
  };

  const release = () => {
    last.current = null;
  };

  return (
    <div
      className="grid size-full min-h-0 place-items-center"
      data-xp-game="scratch_card"
      data-xp-phase={phase}
      data-xp-uncovered={uncovered ? "" : undefined}
    >
      <ScratchCardFace
        cardRef={card}
        campaign={campaign}
        config={config}
        locale={locale}
        outcome={outcome}
        cover={
          <>
            <canvas
              ref={canvas}
              data-xp-scratch-cover
              aria-hidden
              className="absolute inset-0 size-full touch-none transition-opacity duration-300"
              // The cover's colour is read off this element, so it follows the theme like
              // everything else rather than being written into the canvas calls (C5).
              style={{
                ...scratchCanvasInks,
                opacity: uncovered ? 0 : 1,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                last.current = null;
                move(event);
              }}
              onPointerMove={move}
              onPointerUp={release}
              onPointerCancel={release}
            />
            {!uncovered && (
              <p
                dir="auto"
                className="pointer-events-none absolute inset-0 grid place-items-center p-4 text-center text-[clamp(0.9rem,4.5cqmin,1.25rem)] font-extrabold uppercase tracking-[0.12em]"
                style={{ color: SCRATCH_COVER_TEXT }}
              >
                {coverText}
              </p>
            )}
            {lively && (
              <div
                ref={flakes}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[3]"
              />
            )}
          </>
        }
      />

      {/* The card can always be uncovered without scratching: a keyboard, a screen reader or
          a hand that cannot drag reaches the very same result (D19). */}
      {phase === "idle" && (
        <button
          type="button"
          onClick={onStart}
          data-xp-game-action
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-[var(--xp-radius-pill)] border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
          style={{
            borderColor: `var(--xp-game-action-edge, ${tint("--xp-text", 14)})`,
          }}
        >
          {coverText}
        </button>
      )}
      {scratching && (
        <button
          type="button"
          onClick={finish}
          data-xp-game-action
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-[var(--xp-radius-pill)] border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
          style={{
            borderColor: `var(--xp-game-action-edge, ${tint("--xp-text", 14)})`,
          }}
        >
          {resolveText(RESULT_TEXT.reveal, locale, fallback)}
        </button>
      )}
    </div>
  );
}

// Pixel scratching: along each stroke, the blocks of a grid it passes over are dug out whole
// (a block is half the scratch's width), so the cover breaks like pixel dirt. What counts as
// scratched is the mask's, the same as for round strokes: only the drawing differs.
function digBlocks(
  context: CanvasRenderingContext2D,
  strokes: readonly (readonly ScratchPoint[])[],
  width: number,
  height: number,
): void {
  const block = Math.max(2, SCRATCH_RADIUS * width);
  const reach = 1; // blocks on each side of the one under the finger
  const dug = new Set<string>();
  const dig = (x: number, y: number) => {
    const column = Math.floor(x / block);
    const row = Math.floor(y / block);
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        // The corners stay: a rounder, chunkier hole.
        if (Math.abs(dx) + Math.abs(dy) > reach + (reach > 1 ? 1 : 0)) continue;
        const key = `${column + dx}:${row + dy}`;
        if (dug.has(key)) continue;
        dug.add(key);
        context.fillRect(
          (column + dx) * block,
          (row + dy) * block,
          Math.ceil(block),
          Math.ceil(block),
        );
      }
    }
  };
  for (const stroke of strokes) {
    stroke.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      const previous = index > 0 ? stroke[index - 1]! : point;
      const fromX = previous.x * width;
      const fromY = previous.y * height;
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(x - fromX, y - fromY) / (block / 2)),
      );
      for (let step = 0; step <= steps; step++) {
        dig(
          fromX + ((x - fromX) * step) / steps,
          fromY + ((y - fromY) * step) / steps,
        );
      }
    });
  }
}
