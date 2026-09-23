import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import type { ExperienceConfig } from "../domain/types";
import type { ExperienceRepository } from "../services/ports";
import type { SaveStatus, StudioStore } from "./store";

// Saving, without a Save button (tasks.md T6.1): every edit is written on its own, a moment
// after the brand stops typing. What matters is what happens when it goes wrong — the status
// says so, a retry is offered, and the tab refuses to close on unsaved work rather than
// letting it disappear quietly.

export const AUTOSAVE_DEBOUNCE_MS = 800;

export interface AutosaveOptions {
  store: StudioStore;
  repository: ExperienceRepository;
  debounceMs?: number;
  // Guards the tab against closing on unsaved work; off in tests and in the preview.
  guardUnload?: boolean;
}

export interface Autosave {
  status: SaveStatus;
  lastSavedAt: string | null;
  error: string | null;
  retry(): void;
}

export function useAutosave({
  store,
  repository,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
  guardUnload = true,
}: AutosaveOptions): Autosave {
  const status = useStore(store, (state) => state.saveStatus);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The configuration waiting to be written: "unsaved" is exactly "pending is not null".
  const pending = useRef<ExperienceConfig | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const write = useCallback(async () => {
    const config = pending.current;
    if (!config) return;
    const { setSaveStatus, setStoredUpdatedAt, storedUpdatedAt } =
      store.getState();
    setSaveStatus("saving");
    try {
      const result = await repository.save(config, {
        expectedUpdatedAt: storedUpdatedAt ?? undefined,
      });
      if (!alive.current) return;
      if (result.ok === false) {
        setError(result.error.message);
        setSaveStatus("error");
        return;
      }
      // Only what was actually written counts as saved: a newer edit made while the write
      // was in flight is still pending, and its own timer will carry it.
      if (pending.current === config) pending.current = null;
      setStoredUpdatedAt(result.config.updatedAt);
      setLastSavedAt(result.config.updatedAt);
      setError(null);
      setSaveStatus(pending.current ? "saving" : "saved");
    } catch (thrown) {
      if (!alive.current) return;
      setError(thrown instanceof Error ? thrown.message : String(thrown));
      setSaveStatus("error");
    }
  }, [repository, store]);

  // One write per lull in the typing, never one per keystroke.
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.config === previous.config) return;
        // A configuration loaded from storage is already saved: nothing to write.
        if (state.storedUpdatedAt !== previous.storedUpdatedAt) return;
        pending.current = state.config;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void write(), debounceMs);
      }),
    [store, write, debounceMs],
  );

  // Unsaved work must not leave without the brand being asked.
  useEffect(() => {
    if (!guardUnload) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [guardUnload]);

  const retry = useCallback(() => {
    clearTimeout(timer.current);
    void write();
  }, [write]);

  return { status, lastSavedAt, error, retry };
}
