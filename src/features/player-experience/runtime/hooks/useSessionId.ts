import { useState } from "react";

// The visit identifier sent with a participation (DrawRequest.context.sessionId). Same
// sessionStorage key and same format as the production page (PlayerFlowPage.tsx), so that
// a visit keeps one identifier from the impression to the draw. Storage may be blocked
// (private mode, sandboxed iframe): the page then keeps an identifier in memory.

export const SESSION_STORAGE_KEY = "octoreach_session_id";

let memoryId: string | null = null;

const newSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function readOrCreateSessionId(storage?: Storage): string {
  try {
    const store = storage ?? window.sessionStorage;
    const existing = store.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = newSessionId();
    store.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    memoryId ??= newSessionId();
    return memoryId;
  }
}

// Read once per mount: the identifier never changes while the runtime is shown.
export function useSessionId(): string {
  const [sessionId] = useState(() => readOrCreateSessionId());
  return sessionId;
}
