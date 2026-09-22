import { useCallback, useState } from "react";

// Seconds the player has spent on the experience, for DrawRequest.context.dwellTimeSeconds.
// A reader, not a state: reading the time never renders the screen again.
export function useDwellTime(now: () => number = Date.now): () => number {
  const [mountedAt] = useState(now); // read once, when the runtime appears
  return useCallback(
    () => Math.max(0, Math.round((now() - mountedAt) / 1000)),
    [now, mountedAt],
  );
}
