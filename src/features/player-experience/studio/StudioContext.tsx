import { createContext, useContext, type ReactNode } from "react";
import { useStore } from "zustand";
import type { DemoCampaignRules } from "../services/createLocalServices";
import type { ExperienceServices } from "../services/ports";
import type { StudioState, StudioStore } from "./store";

// What every part of the Studio reads: its own store (one per open campaign, T6.1) and the
// services it saves and uploads through. The preview frame has services of its own.

export type CampaignSettingsSection = "rules" | "prizes" | "questions";

export interface StudioContextValue {
  store: StudioStore;
  services: ExperienceServices;
  // Opens the campaign Wizard on the right step (T6.6, wired by the app in T7.1).
  onEditCampaignSettings?: (
    campaignId: string,
    section: CampaignSettingsSection,
  ) => void | Promise<void>;
  // Asks the app to reload the campaign after the Wizard (the snapshot comes back by props).
  onRefreshCampaign?: () => void;
  // What decides a win in the campaign (weights, stock, probability, correct answers), for
  // the read-only rules card only: it never enters the configuration, the store or the frame.
  rules?: DemoCampaignRules | null;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({
  value,
  children,
}: {
  value: StudioContextValue;
  children: ReactNode;
}) {
  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  );
}

export function useStudioContext(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) {
    throw new Error("useStudioContext must be used inside <StudioProvider>");
  }
  return value;
}

// A slice of the Studio state; re-renders only when that slice changes.
export function useStudio<T>(selector: (state: StudioState) => T): T {
  return useStore(useStudioContext().store, selector);
}

export function useStudioHistory() {
  const { store } = useStudioContext();
  const canUndo = useStore(
    store.temporal,
    (state) => state.pastStates.length > 0,
  );
  const canRedo = useStore(
    store.temporal,
    (state) => state.futureStates.length > 0,
  );
  const { undo, redo } = store.temporal.getState();
  return { canUndo, canRedo, undo: () => undo(), redo: () => redo() };
}
