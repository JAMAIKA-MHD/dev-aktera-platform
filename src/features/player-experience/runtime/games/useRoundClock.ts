import { useCallback, useEffect, useRef, useState } from "react";

// The clock of a timed round (Memory Match). Read off the wall clock, so a slowed-down tab
// neither steals nor gives time, and never an engine-owned timer the flow cannot see: `running` is driven by what the player does (the first card, the end of
// the countdown). When it runs out `onExpire` is called once.

const TICK_MS = 100;

export interface RoundClock {
  leftMs: number;
  // Wall-clock time since the round started (what the server checks).
  elapsedMs: () => number;
}

export function useRoundClock(
  totalMs: number,
  running: boolean,
  onExpire: () => void,
): RoundClock {
  const [leftMs, setLeftMs] = useState(totalMs);
  const startedAt = useRef<number | null>(null);
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
      const remaining = totalMs - (Date.now() - started);
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

  const elapsedMs = useCallback(
    () => (startedAt.current === null ? 0 : Date.now() - startedAt.current),
    [],
  );

  return { leftMs, elapsedMs };
}
