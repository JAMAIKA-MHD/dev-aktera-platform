import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { DEFAULT_SPOT_ICONS } from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import { useElementSize } from "../../layout/useElementSize";
import { RoundHud } from "../RoundHud";
import type { GameEngineProps } from "../types";
import { useRoundClock, type RoundClock } from "../useRoundClock";
import { SpotPanel } from "./SpotPanel";
import { buildScene } from "./spotScene";

// Spot the Difference. Two pictures drawn from the brand's icons, a few changes between them,
// and a clock. A tap on a change in either picture finds it; a tap anywhere else costs
// PENALTY_MS, so tapping everything is no strategy. The engine reports what was found and how
// long it took: whether that wins, and what it wins, is the server's to say (N1).

const COLS = 4;
const ROWS = 4;
const GAP = 12; // between the two pictures, in px
const PENALTY_MS = 2000;
const SHAKE_MS = 400;

export function SpotEngine({
  settings,
  campaign,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const rules = campaign.rules.spot ?? DEFAULT_RULES.spot;
  const totalMs = rules.durationSeconds * 1000;
  const icons = settings.spot?.icons ?? DEFAULT_SPOT_ICONS;
  const fallback = config.locales.default;

  // Drawn once per play: a resize or a re-render never changes the pictures.
  const [scene] = useState(() =>
    buildScene(icons, rules.differences, COLS, ROWS),
  );
  const [found, setFound] = useState<ReadonlySet<number>>(() => new Set());
  const [wrong, setWrong] = useState<{ panel: "a" | "b"; cell: number } | null>(
    null,
  );
  const [over, setOver] = useState(false);
  const overRef = useRef(false);
  const foundRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((run: () => void, ms: number) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const send = useRef(onInteractionComplete);
  useEffect(() => {
    send.current = onInteractionComplete;
  });
  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });

  const clockRef = useRef<RoundClock | null>(null);
  const finish = useCallback(
    (delayMs: number) => {
      if (overRef.current) return;
      overRef.current = true;
      setOver(true);
      const report = () =>
        send.current({
          kind: "spot",
          found: foundRef.current,
          elapsedMs: clockRef.current?.elapsedMs() ?? 0,
        });
      if (delayMs > 0) later(report, delayMs);
      else report();
    },
    [later],
  );

  const playing = phase === "interacting" && !over;
  const clock = useRoundClock(totalMs, playing, () => finish(0));
  useEffect(() => {
    clockRef.current = clock;
  });

  // Spot the Difference shows nothing of its own at the reveal.
  useEffect(() => {
    if (phase === "revealing") revealComplete.current();
  }, [phase]);

  const tap = (panel: "a" | "b", cell: number) => {
    if (!playing || overRef.current) return;
    const isDifference = scene.differences.some((d) => d.cell === cell);
    if (isDifference && !found.has(cell)) {
      setFound((previous) => new Set(previous).add(cell));
      foundRef.current += 1;
      runtimeAudio.play("tick");
      vibrate("tap");
      if (foundRef.current >= rules.differences) {
        runtimeAudio.play("click");
        finish(reducedMotion ? 0 : 450);
      }
      return;
    }
    if (found.has(cell)) return;
    clock.penalize(PENALTY_MS);
    runtimeAudio.play("lose");
    vibrate("tap");
    setWrong({ panel, cell });
    later(() => setWrong(null), SHAKE_MS);
  };

  // Two pictures that share the slot: stacked when it is tall, side by side when it is wide,
  // whichever makes the pictures bigger (never a media query, only the slot's own size).
  const [boardRef, size] = useElementSize<HTMLDivElement>();
  const measured = size.width > 0 && size.height > 0;
  const stackedSide = Math.min(size.width, (size.height - GAP) / 2);
  const wideSide = Math.min((size.width - GAP) / 2, size.height);
  const stacked = stackedSide >= wideSide;
  const side = Math.max(0, Math.floor(stacked ? stackedSide : wideSide));
  const panelStyle = measured ? { width: side } : { width: "40%" };
  const label = resolveText(config.screens.play.primaryCta, locale, fallback);

  const panel = (id: "a" | "b") => (
    <SpotPanel
      cells={id === "a" ? scene.a : scene.b}
      cols={scene.cols}
      found={found}
      wrong={wrong?.panel === id ? wrong.cell : null}
      onTap={(cell) => tap(id, cell)}
      disabled={!playing}
      label={label}
      reducedMotion={reducedMotion}
      style={panelStyle}
    />
  );

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_1fr] gap-2"
      data-xp-game="spot_difference"
      data-xp-phase={phase}
    >
      <RoundHud
        score={`${found.size} / ${rules.differences}`}
        goal={`${rules.differences} · ${rules.durationSeconds}s`}
        leftMs={clock.leftMs}
        totalMs={totalMs}
        reducedMotion={reducedMotion}
        reached={found.size >= rules.differences}
      />
      <div
        ref={boardRef}
        className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden"
        style={{ opacity: phase === "interacting" ? 1 : 0.6 }}
      >
        <div
          data-xp-spot-board
          className={`flex items-center justify-center ${stacked ? "flex-col" : "flex-row"}`}
          style={{ gap: GAP }}
        >
          {panel("a")}
          {panel("b")}
        </div>
      </div>
    </div>
  );
}
