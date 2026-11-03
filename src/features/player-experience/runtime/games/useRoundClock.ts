import { useCallback, useEffect, useRef, useState } from "react";

// The clock of a timed round (Memory Match, Catch It, Spot the Difference). Read off the wall
// clock, so a slowed-down tab neither steals nor gives time, and never an engine-owned timer
// the flow cannot see: `running` is driven by what the player does (the first card, the end of
// the countdown). When it runs out `onExpire` is called once.

const TICK_MS = 100;

export interface RoundClock {
  leftMs: number;
  // Takes time off the clock (a wrong tap); never below zero.
  penalize: (ms: number) => void;
  // Wall-clock time since the round started, penalties excluded (what the server checks).
  elapsedMs: () => number;
}

export function useRoundClock(
  totalMs: number,
  running: boolean,
  onExpire: () => void,
): RoundClock {
  const [leftMs, setLeftMs] = useState(totalMs);
  const startedAt = useRef<number | null>(null);
  const penalty = useRef(0);
  const expired = useRef(false);

  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (!running) return;
    startedAt.current ??= Date.now();
    const timer = setInterval(() => {
      const started = startedAt.current ?? Date.now();
      const remaining = totalMs - (Date.now() - started) - penalty.current;
      if (remaining > 0) {
        setLeftMs(remaining);
        return;
      }
      clearInterval(timer);
      setLeftMs(0);
      if (expired.current) return;
      expired.current = true;
      expire.current();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running, totalMs]);

  const penalize = useCallback((ms: number) => {
    penalty.current += ms;
    setLeftMs((value) => Math.max(0, value - ms));
  }, []);

  const elapsedMs = useCallback(
    () => (startedAt.current === null ? 0 : Date.now() - startedAt.current),
    [],
  );

  return { leftMs, penalize, elapsedMs };
}
