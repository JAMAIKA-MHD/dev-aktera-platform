import type { CampaignSnapshot } from "./campaign";
import { OUTCOME_TIMING, type GameType, type OutcomeTiming } from "./gameTypes";
import {
  isRetryable,
  type DrawOutcome,
  type GamePayload,
  type ParticipationError,
} from "./participation";
import { isValidDzMobile } from "./phone";
import type { FormConfig } from "./types";

// Player journey as a pure state machine (plan §6.1). No network, no clock, no randomness:
// timestamps and request ids come with the events. useExperienceFlow (T4.1) runs the effects
// that nextCommand asks for.
//
//   welcome ─START→ register ─SUBMIT→ play
//   play ─DRAW_STARTED→ resolving          (wheel, scratch card: drawn before the animation)
//   play ─INTERACTION_DONE→ resolving      (quiz, mystery box, Hit It: drawn after the player acts)
//   resolving ─RESOLVED→ revealing ─REVEAL_DONE→ win | lose
//   resolving ─FAILED→ duplicate | closed | register (invalid input) | error ─RETRY→ resolving

export type FlowScreen =
  | "welcome"
  | "register"
  | "play"
  | "resolving"
  | "revealing"
  | "win"
  | "lose"
  | "duplicate"
  | "closed"
  | "error";

export interface FlowState {
  screen: FlowScreen;
  gameType: GameType;
  timing: OutcomeTiming;
  participant: {
    fullName: string;
    phone: string; // as typed: normalized when the draw request is built
    email: string;
    wilaya: string;
  };
  consentAccepted: boolean;
  consentAcceptedAt: number | null; // epoch ms, stored in the ConsentRecord (Law 18-07)
  clientRequestId: string | null; // one per participation, kept by RETRY
  gamePayload: GamePayload | null; // what the draw sends, kept by RETRY
  entryId: string | null;
  outcome: DrawOutcome | null;
  error: ParticipationError | null;
  couponConfirmed: boolean;
  startedAt: number; // epoch ms, for the dwell time
}

export type FlowEvent =
  | { type: "START" }
  | {
      type: "UPDATE_FIELD";
      field: keyof FlowState["participant"];
      value: string;
    }
  | { type: "SET_CONSENT"; accepted: boolean; at: number }
  | { type: "SUBMIT"; form: FormConfig; clientRequestId: string }
  | { type: "DRAW_STARTED" }
  | { type: "INTERACTION_DONE"; payload: GamePayload }
  | { type: "RESOLVED"; entryId: string; outcome: DrawOutcome }
  | { type: "FAILED"; error: ParticipationError }
  | { type: "REVEAL_DONE" }
  | { type: "CONFIRM_COUPON" }
  | { type: "RETRY" }
  | { type: "RESTART" };

export type FlowCommand = "DRAW" | "CONFIRM";

const EMPTY_PARTICIPANT: FlowState["participant"] = {
  fullName: "",
  phone: "",
  email: "",
  wilaya: "",
};

// A quiz without any question has nothing to answer: as in production, it is drawn as
// soon as the player starts, like a wheel. The Studio flags such a campaign (T1.11).
export function outcomeTimingFor(
  campaign: Pick<CampaignSnapshot, "gameType" | "quiz">,
): OutcomeTiming {
  if (campaign.gameType === "quiz" && campaign.quiz.length === 0) {
    return "before-animation";
  }
  return OUTCOME_TIMING[campaign.gameType];
}

export function createInitialFlowState(
  gameType: GameType,
  options: { startedAt: number; timing?: OutcomeTiming },
): FlowState {
  return {
    screen: "welcome",
    gameType,
    timing: options.timing ?? OUTCOME_TIMING[gameType],
    participant: { ...EMPTY_PARTICIPANT },
    consentAccepted: false,
    consentAcceptedAt: null,
    clientRequestId: null,
    gamePayload: null,
    entryId: null,
    outcome: null,
    error: null,
    couponConfirmed: false,
    startedAt: options.startedAt,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// True when the form can be sent: every enabled required field filled, a valid Algerian
// mobile number (always required: it is the anti-duplicate key), a well-formed email when
// one is typed, and the consent box ticked.
export function canSubmit(state: FlowState, form: FormConfig): boolean {
  if (!state.consentAccepted) return false;
  if (!isValidDzMobile(state.participant.phone)) return false;
  return form.fields.every((field) => {
    if (!field.enabled || field.key === "phone") return true;
    const value = state.participant[field.key].trim();
    if (field.required && value === "") return false;
    return field.key !== "email" || value === "" || EMAIL.test(value);
  });
}

// Screens where the draw is in flight or being shown: leaving them would lose the result.
const LOCKED_SCREENS: readonly FlowScreen[] = ["resolving", "revealing"];

// Returns the same state object when an event does not apply to the current screen,
// so late or duplicated events (a response after RESTART, a double tap) change nothing.
export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "START":
      return state.screen === "welcome"
        ? { ...state, screen: "register" }
        : state;

    case "UPDATE_FIELD":
      if (state.screen !== "register") return state;
      return {
        ...state,
        participant: { ...state.participant, [event.field]: event.value },
      };

    case "SET_CONSENT":
      if (state.screen !== "register") return state;
      return {
        ...state,
        consentAccepted: event.accepted,
        consentAcceptedAt: event.accepted ? event.at : null,
      };

    case "SUBMIT":
      if (state.screen !== "register" || !canSubmit(state, event.form)) {
        return state;
      }
      return {
        ...state,
        screen: "play",
        clientRequestId: event.clientRequestId,
        error: null,
      };

    case "DRAW_STARTED":
      if (state.screen !== "play" || state.timing !== "before-animation") {
        return state;
      }
      return { ...state, screen: "resolving", gamePayload: { kind: "none" } };

    case "INTERACTION_DONE":
      if (state.screen !== "play" || state.timing !== "after-interaction") {
        return state;
      }
      return { ...state, screen: "resolving", gamePayload: event.payload };

    case "RESOLVED":
      if (state.screen !== "resolving") return state;
      return {
        ...state,
        screen: "revealing",
        entryId: event.entryId,
        outcome: event.outcome,
        error: null,
      };

    case "FAILED":
      if (state.screen !== "resolving") return state;
      return failed(state, event.error);

    case "REVEAL_DONE":
      if (state.screen !== "revealing" || !state.outcome) return state;
      return { ...state, screen: state.outcome.isWinner ? "win" : "lose" };

    case "CONFIRM_COUPON":
      if (
        state.screen !== "win" ||
        state.couponConfirmed ||
        !state.entryId ||
        !state.outcome?.couponCode
      ) {
        return state;
      }
      return { ...state, couponConfirmed: true };

    case "RETRY":
      // Same clientRequestId and payload: the server never counts the attempt twice.
      if (
        state.screen !== "error" ||
        !state.error ||
        !isRetryable(state.error.code) ||
        !state.clientRequestId ||
        !state.gamePayload
      ) {
        return state;
      }
      return { ...state, screen: "resolving", error: null };

    case "RESTART":
      if (LOCKED_SCREENS.includes(state.screen)) return state;
      // Back to the start, the typed details kept. The consent must be given again for a new
      // participation, and the server still refuses a second one with the same phone.
      return {
        ...createInitialFlowState(state.gameType, {
          startedAt: state.startedAt,
          timing: state.timing,
        }),
        participant: state.participant,
      };
  }
}

function failed(state: FlowState, error: ParticipationError): FlowState {
  switch (error.code) {
    case "ALREADY_PARTICIPATED":
      return { ...state, screen: "duplicate", error };
    case "CAMPAIGN_CLOSED":
      return { ...state, screen: "closed", error };
    case "INVALID_INPUT":
      // Back to the form to fix the details; the next SUBMIT starts a new attempt.
      return {
        ...state,
        screen: "register",
        error,
        clientRequestId: null,
        gamePayload: null,
      };
    case "NETWORK":
    case "UNKNOWN":
      return { ...state, screen: "error", error };
  }
}

// The effect to run after a transition, if any: "DRAW" when a draw starts (first attempt
// or RETRY), "CONFIRM" when the player confirms having copied the coupon code.
export function nextCommand(
  prev: FlowState,
  next: FlowState,
): FlowCommand | null {
  if (next.screen === "resolving" && prev.screen !== "resolving") return "DRAW";
  if (next.couponConfirmed && !prev.couponConfirmed) return "CONFIRM";
  return null;
}
