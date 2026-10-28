import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ResolvedFlyer } from "../../theme/themeAssets";

// What crosses the stage now and then (motion.flyers): birds in the sky, alone, in pairs or
// in a loose flock, a snail along the ground. Each is a sprite sheet played frame by frame
// (motion.css) while it crosses, from either side (flipped), at its own height, size and
// speed; smaller ones are slower, as if farther away. On a win a flock of birds scatters up
// across the screen; on a loss none comes. Never more than a few at once (fewer on a phone),
// none while the page is hidden, and nothing at all with reduced motion (motion.css hides
// them). Pure decoration: hidden from screen readers, never in the way of a pointer.

type Vars = CSSProperties & Record<`--${string}`, string | number>;

interface Crossing {
  id: number;
  flyer: ResolvedFlyer;
  style: Vars;
  scatter: boolean;
}

const PHONE_MAX = 2;
const between = (bounds: readonly unknown[]) => {
  const low = Number(bounds[0] ?? 0);
  const high = Number(bounds[1] ?? low);
  return low + Math.random() * Math.max(0, high - low);
};

function crossingStyle(
  flyer: ResolvedFlyer,
  { scatter, offset }: { scatter: boolean; offset: number },
): Vars {
  // Farther (smaller) ones are slower: depth from size.
  const scale = 0.6 + Math.random() * 0.4;
  const seconds = scatter
    ? between([4, 6])
    : between(flyer.cross) * (1.4 - scale * 0.4);
  const flipped = flyer.both && Math.random() < 0.5;
  const style: Vars = {
    width: `calc(${flyer.width} * ${scale.toFixed(2)})`,
    aspectRatio: String(flyer.aspect),
    "--xp-flyer-seconds": `${seconds.toFixed(1)}s`,
    "--xp-flyer-delay": `${(offset * 0.45).toFixed(2)}s`,
    "--xp-sprite-frames": flyer.frames,
    "--xp-sprite-seconds": `${(flyer.frames / flyer.fps).toFixed(3)}s`,
    "--xp-decor-src": `url("${flyer.url}")`,
  };
  if (flyer.lane === "ground") {
    style.bottom = flyer.ground ?? "0px";
  } else {
    const [top, bottom] = flyer.band;
    style.top = `${(between([top, bottom]) + offset * 3).toFixed(1)}%`;
  }
  return Object.assign(style, { "--xp-flyer-flip": flipped ? 1 : 0 });
}

export function Flyers({
  flyers,
  screen,
}: {
  flyers: readonly ResolvedFlyer[];
  screen: string | undefined;
}) {
  const [crossing, setCrossing] = useState<Crossing[]>([]);
  const serial = useRef(0);
  const count = useRef(0);
  count.current = crossing.length;

  const launch = (flyer: ResolvedFlyer, scatter: boolean, many: number) => {
    const cap =
      (window.innerWidth < 600 ? Math.min(PHONE_MAX, flyer.max) : flyer.max) -
      count.current;
    const room = Math.max(0, Math.min(many, cap));
    if (room === 0) return;
    const born: Crossing[] = Array.from({ length: room }, (_, offset) => ({
      id: ++serial.current,
      flyer,
      scatter,
      style: crossingStyle(flyer, { scatter, offset }),
    }));
    setCrossing((now) => [...now, ...born]);
  };

  // One timer per kind, at random within its bounds, only on the screens it belongs to and
  // never on a loss.
  useEffect(() => {
    if (screen === "lose") {
      setCrossing([]);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    flyers.forEach((flyer, kind) => {
      if (
        flyer.screens &&
        !(flyer.screens as readonly string[]).includes(screen ?? "")
      ) {
        return;
      }
      const next = () => {
        timers[kind] = setTimeout(
          () => {
            if (!document.hidden) {
              launch(flyer, false, 1 + Math.floor(Math.random() * flyer.flock));
            }
            next();
          },
          between(flyer.every) * 1000,
        );
      };
      next();
    });
    return () => timers.forEach((timer) => clearTimeout(timer));
    // launch reads the latest count through a ref; the timers follow the screen.
  }, [flyers, screen]);

  // A win: a flock scatters up across the screen.
  useEffect(() => {
    if (screen !== "win") return;
    for (const flyer of flyers) if (flyer.onWin) launch(flyer, true, 5);
  }, [flyers, screen]);

  return (
    <>
      {crossing.map(({ id, flyer, style, scatter }) => (
        <span
          key={id}
          className="xp-flyer"
          data-xp-lane={flyer.lane}
          data-xp-path={flyer.path}
          data-xp-scatter={scatter ? "" : undefined}
          // From the right: the sprite faces left (flipped), the same picture both ways.
          data-xp-flip={style["--xp-flyer-flip"] === 1 ? "" : undefined}
          style={style}
          onAnimationEnd={(event) => {
            // The crossing itself, not the wings: gone once off the screen.
            if (event.target !== event.currentTarget) return;
            setCrossing((now) => now.filter((item) => item.id !== id));
          }}
        >
          <span className="xp-flyer-sprite" />
        </span>
      ))}
    </>
  );
}
