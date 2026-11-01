// Where this person stands in the product tour and the "Get started" checklist. It sits above the
// shell, so leaving for the full-screen Studio and coming back does not restart anything. The
// state is saved on the profile; a save that fails only means it is asked again next time.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  useAuth,
  type OnboardingChecklistState,
  type OnboardingStatus,
} from "../../contexts/AuthContext";
import {
  markJoined,
  saveOnboardingProgress,
  type OnboardingPatch,
} from "../../services/onboardingService";
import { useDashboard } from "../DashboardContext";
import { PATHS } from "../paths";

const START_DELAY_MS = 600;

export interface TourRun {
  id: number;
  /** 0 is the welcome; a tour in progress resumes on its step. */
  startStep: number;
  replay: boolean;
}

interface Progress {
  status: OnboardingStatus;
  step: number;
  checklist: OnboardingChecklistState;
}

export interface OnboardingValue {
  tourRun: TourRun | null;
  replayTour: () => void;
  saveTourStep: (step: number) => void;
  endTour: (outcome: "completed" | "skipped", step: number) => void;

  /** Still in setup: not for accounts that were here before it, nor for invited teammates. */
  setupActive: boolean;
  setupStyle: "guide" | "own";
  setSetupStyle: (style: "guide" | "own") => void;
  finishSetup: () => void;
  sandboxTested: boolean;
  markSandboxTested: () => void;
}

const OnboardingContext = createContext<OnboardingValue>({
  tourRun: null,
  replayTour: () => {},
  saveTourStep: () => {},
  endTour: () => {},
  setupActive: false,
  setupStyle: "guide",
  setSetupStyle: () => {},
  finishSetup: () => {},
  sandboxTested: false,
  markSandboxTested: () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  const { campLoading, prizeLoading } = useDashboard();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const userId = profile?.id ?? null;
  const [progress, setProgress] = useState<Progress | null>(null);
  const [tourRun, setTourRun] = useState<TourRun | null>(null);
  const runCount = useRef(0);
  const autoStartDone = useRef(false);

  // Read once per person: from then on this state is ahead of the profile loaded at sign-in.
  useEffect(() => {
    autoStartDone.current = false;
    setTourRun(null);
    setProgress(
      profile?.onboarding_status
        ? {
            status: profile.onboarding_status,
            step: profile.onboarding_step ?? 0,
            checklist: profile.onboarding_checklist ?? {},
          }
        : null,
    );
    // First arrival of an invited teammate: they stop showing as "Invited".
    if (userId && profile?.invited_at && !profile.joined_at) {
      markJoined(userId).catch((err) =>
        console.warn("[onboarding] arrival not saved", err),
      );
    }
    // Only a change of person resets it: `profile` itself is left out of the dependencies.
  }, [userId]);

  const save = useCallback(
    (patch: OnboardingPatch) => {
      if (!userId) return;
      saveOnboardingProgress(userId, patch).catch((err) =>
        console.warn("[onboarding] not saved", err),
      );
    },
    [userId],
  );

  const startRun = useCallback((startStep: number, replay: boolean) => {
    runCount.current += 1;
    setTourRun({ id: runCount.current, startStep, replay });
  }, []);

  // First login, or a tour left unfinished: starts on the Overview once it has settled.
  const status = progress?.status;
  const savedStep = progress?.step ?? 0;
  const dataReady = !campLoading && !prizeLoading;
  useEffect(() => {
    const pending = status === "not_started" || status === "in_progress";
    if (!pending || autoStartDone.current || tourRun) return;
    if (pathname !== PATHS.home || !dataReady) return;
    const timer = window.setTimeout(() => {
      autoStartDone.current = true;
      startRun(status === "in_progress" ? savedStep : 0, false);
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, savedStep, tourRun, pathname, dataReady, startRun]);

  const replayTour = useCallback(() => {
    autoStartDone.current = true;
    navigate(PATHS.home);
    startRun(0, true);
  }, [navigate, startRun]);

  const saveTourStep = useCallback(
    (step: number) => {
      setProgress((current) =>
        current ? { ...current, status: "in_progress", step } : current,
      );
      save({ onboarding_status: "in_progress", onboarding_step: step });
    },
    [save],
  );

  const endTour = useCallback(
    (outcome: "completed" | "skipped", step: number) => {
      setTourRun(null);
      setProgress((current) =>
        current ? { ...current, status: outcome, step } : current,
      );
      save({
        onboarding_status: outcome,
        onboarding_step: step,
        ...(outcome === "completed"
          ? { onboarding_completed_at: new Date().toISOString() }
          : {}),
      });
    },
    [save],
  );

  const checklist = progress?.checklist;
  const updateChecklist = useCallback(
    (patch: OnboardingChecklistState) => {
      if (!checklist) return;
      const next = { ...checklist, ...patch };
      setProgress((current) =>
        current ? { ...current, checklist: next } : current,
      );
      save({ onboarding_checklist: next });
    },
    [checklist, save],
  );

  const sandboxTested = Boolean(checklist?.sandbox_tested_at);
  const markSandboxTested = useCallback(() => {
    if (!sandboxTested) {
      updateChecklist({ sandbox_tested_at: new Date().toISOString() });
    }
  }, [sandboxTested, updateChecklist]);
  const setSetupStyle = useCallback(
    (style: "guide" | "own") => updateChecklist({ setup_style: style }),
    [updateChecklist],
  );
  const finishSetup = useCallback(
    () => updateChecklist({ setup_finished_at: new Date().toISOString() }),
    [updateChecklist],
  );

  const setupActive =
    Boolean(checklist) &&
    !checklist?.dismissed_at &&
    !checklist?.setup_finished_at &&
    !profile?.invited_at;
  const setupStyle = checklist?.setup_style ?? "guide";

  const value = useMemo<OnboardingValue>(
    () => ({
      tourRun,
      replayTour,
      saveTourStep,
      endTour,
      setupActive,
      setupStyle,
      setSetupStyle,
      finishSetup,
      sandboxTested,
      markSandboxTested,
    }),
    [
      tourRun,
      replayTour,
      saveTourStep,
      endTour,
      setupActive,
      setupStyle,
      setSetupStyle,
      finishSetup,
      sandboxTested,
      markSandboxTested,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
