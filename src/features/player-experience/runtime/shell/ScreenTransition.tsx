import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { FlowScreen } from "../../domain/flow";
import { runtimeAudio } from "../feedback/audio";

// From one screen to the next, in a theme's own way (motion in theme.json, motion.css). The
// journey decides which screen comes; this only dresses the change, and every change is over
// in under 600 ms — the player never waits for it:
//
//   wipe     a burst grows from the middle until it covers the screen (230 ms), the screen
//            changes behind it, and the burst shrinks away (250 ms): the comic's own cut.
//   zoom     into the game: the new screen scales in from the middle (form → game).
//   impact   into a win: a flash (one, well under three a second) and a short shake, then the
//            result pops in.
//   soft     into a loss: no flash, no shake; the result settles in.
//   shake    into a status (an error, a phone that played already): the card shakes once.
//   flip     into the form (motion.flip): the card turns over on its vertical axis.
//   pipe     into the form (motion.pipe): the welcome slides down as into a pipe, the form
//            comes up from below.
//
// The wipe is a burst, or an iris closing on the screen and opening on the next
// (motion.wipe.kind, motion.css); a stepped theme plays all of these frame by frame.
//
// Only the wipe holds the old screen on for a moment, covered: it keeps the element it last
// drew (its props, and so its state, as they were), so nothing behind the burst can change
// or be tapped. The three moments of a game (play, resolving, revealing) are one screen: no
// transition between them. With reduced motion, or the brand's animations off, nothing of
// this runs (a plain fade, motion.css); nor in a browser without the Web Animations API.

export type ScreenChange =
  "wipe" | "pipe" | "flip" | "zoom" | "impact" | "soft" | "shake";

const ON_STAGE: ReadonlySet<FlowScreen> = new Set([
  "play",
  "resolving",
  "revealing",
]);

export function changeBetween(
  from: FlowScreen,
  to: FlowScreen,
  wipe: boolean, // the theme has a wipe (motion.wipe)
  pipe = false, // the theme goes into the form down a pipe (motion.pipe)
  flip = false, // or turns its card over (motion.flip)
  always = false, // the wipe covers every change of screen (a curtain)
): ScreenChange | null {
  if (from === to || (ON_STAGE.has(from) && ON_STAGE.has(to))) return null;
  if (always && wipe) return "wipe";
  if (to === "win") return "impact";
  if (to === "lose") return "soft";
  if (to === "error" || to === "duplicate" || to === "closed") return "shake";
  if (ON_STAGE.has(to)) return "zoom";
  if (from === "welcome" && to === "register") {
    if (pipe) return "pipe";
    if (flip) return "flip";
  }
  return wipe ? "wipe" : null;
}

export const COVER_MS = 230;
export const REVEAL_MS = 250;

const canAnimate = () =>
  typeof document !== "undefined" &&
  typeof document.getAnimations === "function";

interface Shown {
  screen: FlowScreen;
  element: ReactNode;
  change: ScreenChange | null;
  serial: number; // one per change: the overlay's own animation restarts with it
}

export function useScreenTransition({
  screen,
  element,
  enabled,
  wipe,
  pipe = false,
  flip = false,
  always = false,
}: {
  screen: FlowScreen;
  element: ReactNode;
  enabled: boolean; // the theme moves, and motion is not reduced
  wipe: boolean;
  pipe?: boolean;
  flip?: boolean;
  always?: boolean;
}): {
  shown: Shown;
  phase: "cover" | "reveal" | null;
  holding: ScreenChange | null; // the change under way while the old screen is held
} {
  const [shown, setShown] = useState<Shown>({
    screen,
    element,
    change: null,
    serial: 0,
  });
  const [phase, setPhase] = useState<"cover" | "reveal" | null>(null);
  const covering = useRef(false);
  const latest = useRef({ screen, element });
  latest.current = { screen, element };

  const change =
    enabled && screen !== shown.screen
      ? changeBetween(shown.screen, screen, wipe, pipe, flip, always)
      : null;
  const holds =
    (change === "wipe" || change === "pipe" || change === "flip") &&
    canAnimate();
  const [holding, setHolding] = useState<ScreenChange | null>(null);

  useEffect(() => {
    if (screen === shown.screen || covering.current) return;
    if (!holds) return;
    covering.current = true;
    const kind = change!;
    setHolding(kind);
    setPhase("cover");
    runtimeAudio.play("swoosh");
    const swap = setTimeout(() => {
      covering.current = false;
      setShown((before) => ({
        screen: latest.current.screen,
        element: latest.current.element,
        change: kind,
        serial: before.serial + 1,
      }));
      setHolding(null);
      setPhase("reveal");
    }, COVER_MS);
    return () => {
      clearTimeout(swap);
      covering.current = false;
    };
    // `change` follows from the same screens and theme as `holds`.
  }, [screen, shown.screen, holds]);
  useEffect(() => {
    if (phase !== "reveal") return;
    const done = setTimeout(() => setPhase(null), REVEAL_MS);
    return () => clearTimeout(done);
  }, [phase]);

  // Every other change shows the new screen at once, with its own entrance.
  if (screen !== shown.screen && !holds) {
    const next = {
      screen,
      element,
      change,
      serial: shown.serial + 1,
    };
    setShown(next);
    return { shown: next, phase, holding };
  }
  // The same screen, drawn again (a new state of the game): always the latest drawing,
  // except under a wipe's cover, where the old screen stays as it was.
  if (screen === shown.screen && shown.element !== element) {
    return { shown: { ...shown, element }, phase, holding };
  }
  return { shown, phase, holding };
}

// The overlay of a change: the wipe's burst, or the flash into a win. Pure decoration,
// never in the way except while it covers the screen.
export function TransitionLayer({
  phase,
  change,
  serial,
}: {
  phase: "cover" | "reveal" | null;
  change: ScreenChange | null;
  serial: number;
}) {
  // A pipe or a flip needs no overlay: the screens themselves move (motion.css).
  if (phase && change !== "pipe" && change !== "flip") {
    return (
      <div aria-hidden className="xp-fx-wipe" data-xp-phase={phase}>
        <span className="xp-fx-wipe-ink" />
        <span className="xp-fx-wipe-fill" />
      </div>
    );
  }
  if (change === "impact") {
    return (
      <span
        key={serial}
        aria-hidden
        className="xp-fx-flash"
        style={{ "--xp-fx-serial": serial } as CSSProperties}
      />
    );
  }
  return null;
}

// Two stage curtains opening once, as the journey starts (motion.curtain, motion.css): about
// 600 ms, never in the way of a tap, then gone. Nothing of it with reduced motion.
const CURTAIN_MS = 700;

export function OpeningCurtain({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(enabled && canAnimate());
  useEffect(() => {
    if (!open) return;
    const done = setTimeout(() => setOpen(false), CURTAIN_MS);
    return () => clearTimeout(done);
  }, [open]);
  if (!open) return null;
  return (
    <div aria-hidden className="xp-fx-curtain">
      <span />
      <span />
    </div>
  );
}
