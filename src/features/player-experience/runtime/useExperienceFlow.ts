import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { CampaignSnapshot } from "../domain/campaign";
import {
  buildDrawRequest,
  canSubmit,
  createInitialFlowState,
  createPreviewFlowState,
  flowReducer,
  nextCommand,
  outcomeTimingFor,
  type FlowScreen,
  type FlowState,
} from "../domain/flow";
import type { Locale } from "../domain/locale";
import {
  createClientRequestId,
  type DrawRequest,
  type DrawResult,
  type GamePayload,
} from "../domain/participation";
import type { ExperienceConfig, FormFieldKey } from "../domain/types";
import type {
  ExperienceEvent,
  ExperienceEventName,
  ExperienceServices,
} from "../services/ports";
import { useDwellTime } from "./hooks/useDwellTime";
import { useSessionId } from "./hooks/useSessionId";

// Runs the player journey (plan §6.1): the pure state machine of domain/flow.ts, plus the
// effects it asks for through nextCommand (the draw, then the coupon confirmation) and the
// analytics. Screens call the actions below; they never talk to the services themselves, and
// the outcome only ever comes from the participation gateway (N1).

export type DrawSource = DrawRequest["context"]["source"];
export type CouponStatus = "idle" | "sending" | "confirmed" | "failed";
// What only the screens can see: the flow reports everything else itself.
export type ScreenEventName =
  "cta_clicked" | "consent_opened" | "coupon_copied" | "share_clicked";
type EventData = ExperienceEvent["data"];

export interface UseExperienceFlowOptions {
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  services: ExperienceServices;
  locale: Locale;
  // Default: "web_player" with the live gateway, "studio_preview" with a local one.
  source?: DrawSource;
  // Screen forced by the Studio preview; ignored with the live gateway (N1).
  initialScreen?: FlowScreen;
  now?: () => number; // the clock, for tests
}

export interface ExperienceFlow {
  state: FlowState;
  canSubmit: boolean;
  couponStatus: CouponStatus; // confirmation of the coupon of the current entry
  start(): void;
  updateField(field: FormFieldKey, value: string): void;
  setConsent(accepted: boolean): void;
  submit(): void;
  startDraw(): void; // wheel, scratch card: the player launches the animation
  completeInteraction(payload: GamePayload): void; // quiz, mystery box, Hit It
  completeReveal(): void;
  confirmCoupon(): void;
  retry(): void;
  restart(): void;
  track(name: ScreenEventName, data?: EventData): void;
}

// Analytics that follow from a transition (plan §7.5). Flat values only, never personal data.
export function transitionEvents(
  prev: FlowState,
  next: FlowState,
): Array<{ name: ExperienceEventName; data?: EventData }> {
  const events: Array<{ name: ExperienceEventName; data?: EventData }> = [];
  if (next.screen === "play" && prev.screen !== "play") {
    if (prev.screen === "register") events.push({ name: "form_submitted" });
    events.push({ name: "game_started", data: { gameType: next.gameType } });
  }
  if (next.screen === "revealing" && prev.screen !== "revealing") {
    events.push({
      name: "outcome_received",
      data: { isWinner: next.outcome?.isWinner === true },
    });
  }
  if (prev.screen === "revealing" && next.screen !== "revealing") {
    events.push({
      name: "reveal_completed",
      data: { isWinner: next.screen === "win" },
    });
  }
  if (next.error && next.error !== prev.error) {
    events.push({ name: "error_shown", data: { code: next.error.code } });
  }
  return events;
}

function initialState(
  campaign: CampaignSnapshot,
  initialScreen: FlowScreen | undefined,
  startedAt: number,
): FlowState {
  if (initialScreen && initialScreen !== "welcome") {
    return createPreviewFlowState(initialScreen, campaign, {
      startedAt,
      clientRequestId: createClientRequestId(),
    });
  }
  return createInitialFlowState(campaign.gameType, {
    startedAt,
    timing: outcomeTimingFor(campaign),
  });
}

export function useExperienceFlow(
  options: UseExperienceFlowOptions,
): ExperienceFlow {
  const { config, campaign, services, locale, now = Date.now } = options;
  const live = services.participation.mode === "live";
  const sessionId = useSessionId();
  const dwellTime = useDwellTime(now);
  const [state, dispatch] = useReducer(flowReducer, null, () =>
    initialState(campaign, live ? undefined : options.initialScreen, now()),
  );
  const [coupon, setCoupon] = useState<{
    entryId: string | null;
    status: CouponStatus;
  }>({ entryId: null, status: "idle" });
  const forced = options.initialScreen;
  useEffect(() => {
    if (live && forced && forced !== "welcome") {
      console.warn(
        `initialScreen "${forced}" ignored: screens can only be forced in a preview, never with the live gateway.`,
      );
    }
  }, [live, forced]);

  // What the effects read when they run: a draw uses the locale and services of its moment.
  const source = options.source ?? (live ? "web_player" : "studio_preview");
  const latest = useRef({ config, campaign, services, locale, source, now });
  useEffect(() => {
    latest.current = { config, campaign, services, locale, source, now };
  });
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Tracking is fire-and-forget: a failing tracker never breaks the journey.
  const track = useCallback(
    (name: ExperienceEventName, screen: FlowScreen, data?: EventData) => {
      const current = latest.current;
      try {
        current.services.analytics.track({
          name,
          at: new Date(current.now()).toISOString(),
          campaignId: current.campaign.id,
          sessionId,
          screen,
          locale: current.locale,
          ...(data ? { data } : {}),
        });
      } catch {
        // Ignored on purpose.
      }
    },
    [sessionId],
  );

  const draw = useCallback(
    async (attempt: FlowState) => {
      const { config, campaign, services, locale, source } = latest.current;
      let humanToken: string | null = null;
      try {
        humanToken = await services.humanVerification.getToken();
      } catch {
        humanToken = null; // the server decides whether a missing token is acceptable
      }
      const request = buildDrawRequest(attempt, {
        campaignId: campaign.id,
        form: config.form,
        locale,
        humanToken,
        context: {
          sessionId,
          dwellTimeSeconds: dwellTime(),
          userAgent: navigator.userAgent,
          source,
        },
      });
      let result: DrawResult;
      if (!request) {
        // Never sent without consent and a valid phone: back to the form (N3).
        result = {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Incomplete participation: consent or phone missing.",
          },
        };
      } else {
        track("draw_requested", "resolving", {
          payload: request.gamePayload.kind,
        });
        try {
          result = await services.participation.draw(request);
        } catch (error) {
          result = {
            ok: false,
            error: { code: "UNKNOWN", message: String(error) },
          };
        }
      }
      if (!mounted.current) return;
      // An explicit comparison: tsconfig.json is not strict, and narrows no truthiness.
      if (result.ok === false) {
        dispatch({ type: "FAILED", error: result.error });
      } else {
        dispatch({
          type: "RESOLVED",
          entryId: result.entryId,
          outcome: result.outcome,
        });
      }
    },
    [dwellTime, sessionId, track],
  );

  const confirm = useCallback(
    async (entryId: string) => {
      setCoupon({ entryId, status: "sending" });
      let ok = false;
      try {
        ok = (
          await latest.current.services.participation.confirmCoupon(entryId)
        ).ok;
      } catch {
        ok = false;
      }
      if (!mounted.current) return;
      setCoupon({ entryId, status: ok ? "confirmed" : "failed" });
      track("coupon_confirmed", "win", { ok });
    },
    [track],
  );

  // Once per mount, on the first screen.
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("experience_viewed", state.screen);
  }, [state.screen, track]);

  // Is the campaign still open? Asked on the welcome screen, on arrival and after a restart
  // (backend task B5.1): on the public page, a closed or sold-out campaign says so before the
  // player fills in the form for nothing. Live gateway only: the Studio must keep showing the
  // welcome screen of a draft or paused campaign while the brand designs it. An error is
  // ignored: the server decides at draw time anyway.
  const checkOnWelcome = live && state.screen === "welcome";
  useEffect(() => {
    if (!checkOnWelcome) return;
    let active = true;
    const { services: current, campaign: shown } = latest.current;
    current.participation.checkAvailability(shown.id).then(
      (availability) => {
        if (active && availability.open === false) {
          dispatch({ type: "UNAVAILABLE", reason: availability.reason });
        }
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [checkOnWelcome]);

  // Each transition: its analytics, then the effect it asks for. Events dispatched in the
  // same batch are seen as one transition; the draw is asynchronous, so a command is never
  // folded into another one.
  const previous = useRef(state);
  useEffect(() => {
    const prev = previous.current;
    previous.current = state;
    if (prev === state) return;
    for (const event of transitionEvents(prev, state)) {
      track(event.name, state.screen, event.data);
    }
    const command = nextCommand(prev, state);
    if (command === "DRAW") void draw(state);
    if (command === "CONFIRM" && state.entryId) void confirm(state.entryId);
  }, [state, track, draw, confirm]);

  return {
    state,
    canSubmit: canSubmit(state, config.form),
    couponStatus:
      coupon.entryId !== null && coupon.entryId === state.entryId
        ? coupon.status
        : "idle",
    start: () => dispatch({ type: "START" }),
    updateField: (field, value) =>
      dispatch({ type: "UPDATE_FIELD", field, value }),
    setConsent: (accepted) =>
      dispatch({ type: "SET_CONSENT", accepted, at: now() }),
    submit: () => {
      if (state.screen !== "register") return;
      if (!canSubmit(state, config.form)) {
        track("form_invalid", state.screen);
        return;
      }
      dispatch({
        type: "SUBMIT",
        form: config.form,
        clientRequestId: createClientRequestId(),
      });
    },
    startDraw: () => dispatch({ type: "DRAW_STARTED" }),
    completeInteraction: (payload) =>
      dispatch({ type: "INTERACTION_DONE", payload }),
    completeReveal: () => dispatch({ type: "REVEAL_DONE" }),
    confirmCoupon: () => dispatch({ type: "CONFIRM_COUPON" }),
    retry: () => dispatch({ type: "RETRY" }),
    restart: () => dispatch({ type: "RESTART" }),
    track: (name, data) => track(name, state.screen, data),
  };
}
