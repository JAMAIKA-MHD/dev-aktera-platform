import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { resolveText } from "../../../domain/locale";
import { tint } from "../../../theme/recipes";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import { RoundHud } from "../RoundHud";
import type { GameEngineProps } from "../types";
import { useRoundClock, type RoundClock } from "../useRoundClock";
import { CatchItem } from "./CatchItem";

// Catch It. Items fall through the field and the player taps them before they leave it. The
// round ends when the campaign's number of catches is reached or the clock runs out, and the
// engine reports what was caught and how long it took: whether that wins, and what it wins, is
// the server's to say (N1). The pace follows the campaign: the more catches asked per second,
// the faster items come, so every goal asks for roughly the same share of the items shown.

const COUNTDOWN_FROM = 3;
const STEP_MS = 800;
const EDGE = 10; // keeps an item away from the field's sides, in percent
const MIN_SPAWN_MS = 380;
const MAX_SPAWN_MS = 1100;

interface Falling {
  id: number;
  x: number;
  y: number; // only used with reduced motion, where items do not fall
  lifeMs: number;
}

export function CatchEngine({
  settings,
  campaign,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const rules = campaign.rules.catchIt ?? DEFAULT_RULES.catchIt;
  const totalMs = rules.durationSeconds * 1000;
  const spawnMs = Math.min(
    MAX_SPAWN_MS,
    Math.max(MIN_SPAWN_MS, (totalMs * 0.85) / (rules.winThreshold * 1.7)),
  );
  const lifeMs = reducedMotion
    ? 2200
    : Math.min(3000, Math.max(1500, spawnMs * 3.2));
  const icon = settings.catchIt?.itemIcon ?? "star";
  const image = settings.catchIt?.itemImage ?? null;
  const fallback = config.locales.default;

  const [items, setItems] = useState<Falling[]>([]);
  const [caught, setCaught] = useState(0);
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [over, setOver] = useState(false);
  const caughtRef = useRef(0);
  const overRef = useRef(false);
  const nextId = useRef(0);
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
      const report = () => {
        setItems([]);
        send.current({
          kind: "catch",
          caught: caughtRef.current,
          elapsedMs: clockRef.current?.elapsedMs() ?? 0,
        });
      };
      if (delayMs > 0) later(report, delayMs);
      else report();
    },
    [later],
  );

  const interacting = phase === "interacting" && !over;
  const running = interacting && count === 0;
  const clock = useRoundClock(totalMs, running, () => finish(0));
  useEffect(() => {
    clockRef.current = clock;
  });

  // 3, 2, 1: the clock only starts once the player has seen the field.
  useEffect(() => {
    if (!interacting || count === 0) return;
    runtimeAudio.play("countdown");
    const timer = setTimeout(
      () => setCount((value) => value - 1),
      reducedMotion ? 600 : STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [interacting, count, reducedMotion]);

  // Items come at the campaign's pace while the clock runs.
  useEffect(() => {
    if (!running) return;
    const spawn = () => {
      const id = nextId.current++;
      setItems((previous) => [
        ...previous,
        {
          id,
          x: EDGE + Math.random() * (100 - 2 * EDGE),
          y: 18 + Math.random() * 62,
          lifeMs,
        },
      ]);
      // Left unscathed, it leaves the field: a miss costs nothing but the chance.
      later(
        () => setItems((previous) => previous.filter((it) => it.id !== id)),
        lifeMs,
      );
    };
    spawn();
    const timer = setInterval(spawn, spawnMs);
    return () => clearInterval(timer);
  }, [running, spawnMs, lifeMs, later]);

  // Catch It shows nothing of its own at the reveal: the result belongs to the screens after.
  useEffect(() => {
    if (phase === "revealing") revealComplete.current();
  }, [phase]);

  const catchItem = (id: number) => {
    if (!running || overRef.current) return;
    setItems((previous) => previous.filter((it) => it.id !== id));
    caughtRef.current += 1;
    setCaught(caughtRef.current);
    runtimeAudio.play("tick");
    vibrate("tap");
    if (caughtRef.current >= rules.winThreshold)
      finish(reducedMotion ? 0 : 350);
  };

  const label = resolveText(config.screens.play.primaryCta, locale, fallback);

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_1fr] gap-2"
      data-xp-game="catch_it"
      data-xp-phase={phase}
    >
      <RoundHud
        score={`${caught} / ${rules.winThreshold}`}
        goal={`${rules.winThreshold} · ${rules.durationSeconds}s`}
        leftMs={clock.leftMs}
        totalMs={totalMs}
        reducedMotion={reducedMotion}
        reached={caught >= rules.winThreshold}
      />
      <div
        data-xp-catch-field
        className="relative size-full min-h-0 touch-manipulation overflow-hidden rounded-[var(--xp-radius-lg)] border border-dashed"
        style={{
          borderColor: tint("--xp-primary", 25),
          opacity: phase === "interacting" ? 1 : 0.6,
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={label}
            onPointerDown={() => catchItem(item.id)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                catchItem(item.id);
              }
            }}
            className="absolute z-10 size-[max(44px,min(18cqmin,4.5rem))] cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
            style={{
              insetInlineStart: `${item.x}%`,
              transform: "translate(-50%, -50%)",
              ...(reducedMotion
                ? { top: `${item.y}%` }
                : {
                    animation: `xp-fall ${item.lifeMs}ms linear forwards`,
                  }),
            }}
          >
            {/* Centered on its button, which is the one that moves. */}
            <CatchItem
              icon={icon}
              image={image}
              x={50}
              style={{ top: "50%" }}
            />
          </button>
        ))}
        {interacting && count > 0 && (
          <span
            role="status"
            data-xp-countdown
            className="absolute inset-0 z-20 grid place-items-center text-[clamp(3rem,22cqmin,7rem)] font-black tabular-nums"
            style={{
              color: "var(--xp-primary)",
              backgroundColor: tint("--xp-surface", 55),
            }}
          >
            {count}
          </span>
        )}
      </div>
    </div>
  );
}
