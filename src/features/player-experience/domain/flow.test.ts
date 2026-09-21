import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "./defaults";
import {
  canSubmit,
  createInitialFlowState,
  flowReducer,
  nextCommand,
  outcomeTimingFor,
  type FlowEvent,
  type FlowState,
} from "./flow";
import type { GameType } from "./gameTypes";
import type {
  DrawOutcome,
  ParticipationError,
  ParticipationErrorCode,
} from "./participation";
import type { FormConfig } from "./types";

// Default form: full name (required), phone, email (off), wilaya (optional).
const FORM: FormConfig = createDefaultExperience({ gameType: "quiz" }).form;
const T0 = 1_760_000_000_000;

const WIN: DrawOutcome = {
  isWinner: true,
  prize: { id: "prize-1", name: "Bon d'achat", winMessage: null },
  couponCode: "CODE-1234",
};
const LOSS: DrawOutcome = { isWinner: false, prize: null, couponCode: null };

const error = (code: ParticipationErrorCode): ParticipationError => ({
  code,
  message: code,
});

const run = (state: FlowState, ...events: FlowEvent[]) =>
  events.reduce(flowReducer, state);

const FILL: FlowEvent[] = [
  { type: "START" },
  { type: "UPDATE_FIELD", field: "fullName", value: "Amina B." },
  { type: "UPDATE_FIELD", field: "phone", value: "0541 23 45 67" },
  { type: "SET_CONSENT", accepted: true, at: T0 + 5_000 },
];
const SUBMIT: FlowEvent = {
  type: "SUBMIT",
  form: FORM,
  clientRequestId: "request-1",
};

// Registered and on the play screen.
const playing = (gameType: GameType, timing?: FlowState["timing"]) =>
  run(
    createInitialFlowState(gameType, { startedAt: T0, timing }),
    ...FILL,
    SUBMIT,
  );

// Draw in flight, for either timing.
const resolving = (gameType: GameType = "lucky_wheel") => {
  const state = playing(gameType);
  return state.timing === "before-animation"
    ? flowReducer(state, { type: "DRAW_STARTED" })
    : flowReducer(state, {
        type: "INTERACTION_DONE",
        payload: { kind: "hitIt", hits: 9 },
      });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createInitialFlowState", () => {
  it("starts on the welcome screen, empty, with the timing of the game", () => {
    const state = createInitialFlowState("quiz", { startedAt: T0 });
    expect(state).toEqual({
      screen: "welcome",
      gameType: "quiz",
      timing: "after-interaction",
      participant: { fullName: "", phone: "", email: "", wilaya: "" },
      consentAccepted: false,
      consentAcceptedAt: null,
      clientRequestId: null,
      gamePayload: null,
      entryId: null,
      outcome: null,
      error: null,
      couponConfirmed: false,
      startedAt: T0,
    });
    expect(
      createInitialFlowState("lucky_wheel", { startedAt: T0 }).timing,
    ).toBe("before-animation");
  });

  it("accepts a timing chosen from the campaign", () => {
    expect(
      createInitialFlowState("quiz", {
        startedAt: T0,
        timing: "before-animation",
      }).timing,
    ).toBe("before-animation");
  });
});

describe("outcomeTimingFor", () => {
  it("follows the game, except for a quiz without questions", () => {
    const question = { id: "q-1", text: "?", options: ["a", "b"] };
    expect(outcomeTimingFor({ gameType: "scratch_card", quiz: [] })).toBe(
      "before-animation",
    );
    expect(outcomeTimingFor({ gameType: "hit_it", quiz: [] })).toBe(
      "after-interaction",
    );
    expect(outcomeTimingFor({ gameType: "quiz", quiz: [question] })).toBe(
      "after-interaction",
    );
    // Nothing to answer: drawn straight away, as in production.
    expect(outcomeTimingFor({ gameType: "quiz", quiz: [] })).toBe(
      "before-animation",
    );
  });
});

describe("registration", () => {
  const register = () =>
    run(createInitialFlowState("lucky_wheel", { startedAt: T0 }), ...FILL);

  it("goes from welcome to the form, then records the fields and the consent", () => {
    const state = register();
    expect(state.screen).toBe("register");
    expect(state.participant).toEqual({
      fullName: "Amina B.",
      phone: "0541 23 45 67",
      email: "",
      wilaya: "",
    });
    expect(state.consentAccepted).toBe(true);
    expect(state.consentAcceptedAt).toBe(T0 + 5_000);
    const unticked = flowReducer(state, {
      type: "SET_CONSENT",
      accepted: false,
      at: T0 + 9_000,
    });
    expect(unticked.consentAccepted).toBe(false);
    expect(unticked.consentAcceptedAt).toBeNull();
  });

  it("refuses SUBMIT without consent", () => {
    const state = flowReducer(register(), {
      type: "SET_CONSENT",
      accepted: false,
      at: T0,
    });
    expect(canSubmit(state, FORM)).toBe(false);
    expect(flowReducer(state, SUBMIT)).toBe(state);
  });

  it("moves to the game on a valid SUBMIT, with the request id of the participation", () => {
    const state = flowReducer(register(), SUBMIT);
    expect(state.screen).toBe("play");
    expect(state.clientRequestId).toBe("request-1");
  });

  it("ignores form events outside the form", () => {
    const welcome = createInitialFlowState("quiz", { startedAt: T0 });
    for (const event of [
      { type: "UPDATE_FIELD", field: "phone", value: "0541234567" },
      { type: "SET_CONSENT", accepted: true, at: T0 },
      SUBMIT,
    ] as FlowEvent[]) {
      expect(flowReducer(welcome, event)).toBe(welcome);
    }
    const play = playing("quiz");
    expect(
      flowReducer(play, { type: "UPDATE_FIELD", field: "phone", value: "x" }),
    ).toBe(play);
    expect(flowReducer(play, { type: "START" })).toBe(play);
  });
});

describe("canSubmit", () => {
  const withFields = (participant: Partial<FlowState["participant"]>) => ({
    ...createInitialFlowState("quiz", { startedAt: T0 }),
    screen: "register" as const,
    consentAccepted: true,
    participant: {
      fullName: "Amina B.",
      phone: "0541234567",
      email: "",
      wilaya: "",
      ...participant,
    },
  });
  const formWith = (key: string, change: object): FormConfig => ({
    ...FORM,
    fields: FORM.fields.map((field) =>
      field.key === key ? { ...field, ...change } : field,
    ),
  });

  it("accepts the Algerian mobile formats, and refuses the others", () => {
    for (const phone of [
      "0541234567",
      "05 41 23 45 67",
      "+213541234567",
      "0661-23-45-67",
    ]) {
      expect(canSubmit(withFields({ phone }), FORM), phone).toBe(true);
    }
    for (const phone of ["", "0212345678", "054123456", "phone"]) {
      expect(canSubmit(withFields({ phone }), FORM), phone).toBe(false);
    }
  });

  it("requires the enabled required fields only", () => {
    expect(canSubmit(withFields({ fullName: "  " }), FORM)).toBe(false);
    expect(canSubmit(withFields({ wilaya: "" }), FORM)).toBe(true); // optional
    expect(
      canSubmit(
        withFields({ wilaya: "" }),
        formWith("wilaya", { required: true }),
      ),
    ).toBe(false);
    expect(
      canSubmit(
        withFields({ fullName: "" }),
        formWith("fullName", { enabled: false }),
      ),
    ).toBe(true);
  });

  it("checks the email only when the field is on and filled", () => {
    const withEmail = formWith("email", { enabled: true });
    expect(canSubmit(withFields({ email: "not-an-email" }), FORM)).toBe(true); // off
    expect(canSubmit(withFields({ email: "not-an-email" }), withEmail)).toBe(
      false,
    );
    expect(canSubmit(withFields({ email: "" }), withEmail)).toBe(true);
    expect(
      canSubmit(withFields({ email: "amina@example.dz" }), withEmail),
    ).toBe(true);
  });

  it("always requires a valid phone, whatever the form says", () => {
    const phoneOff = formWith("phone", { enabled: false, required: false });
    expect(canSubmit(withFields({ phone: "" }), phoneOff)).toBe(false);
  });
});

describe("draw before the animation (wheel, scratch card)", () => {
  it("draws when the player starts the animation, then reveals the result", () => {
    const play = playing("lucky_wheel");
    const drawing = flowReducer(play, { type: "DRAW_STARTED" });
    expect(drawing.screen).toBe("resolving");
    expect(drawing.gamePayload).toEqual({ kind: "none" });
    expect(nextCommand(play, drawing)).toBe("DRAW");

    const revealing = flowReducer(drawing, {
      type: "RESOLVED",
      entryId: "entry-1",
      outcome: WIN,
    });
    expect(revealing).toMatchObject({
      screen: "revealing",
      entryId: "entry-1",
      outcome: WIN,
    });
    expect(nextCommand(drawing, revealing)).toBeNull();
    expect(flowReducer(revealing, { type: "REVEAL_DONE" }).screen).toBe("win");
  });

  it("ignores an interaction payload", () => {
    const play = playing("scratch_card");
    expect(
      flowReducer(play, {
        type: "INTERACTION_DONE",
        payload: { kind: "boxes", selectedIndex: 1 },
      }),
    ).toBe(play);
  });

  it("serves a quiz without questions like a wheel", () => {
    const play = playing("quiz", "before-animation");
    expect(flowReducer(play, { type: "DRAW_STARTED" }).screen).toBe(
      "resolving",
    );
  });
});

describe("draw after the interaction (quiz, mystery box, Hit It)", () => {
  it("draws with the player's payload, then reveals the result", () => {
    const play = playing("quiz");
    const payload = { kind: "quiz" as const, answers: { "q-1": 2, "q-2": 0 } };
    const drawing = flowReducer(play, { type: "INTERACTION_DONE", payload });
    expect(drawing.screen).toBe("resolving");
    expect(drawing.gamePayload).toEqual(payload);
    expect(nextCommand(play, drawing)).toBe("DRAW");

    const lost = run(
      drawing,
      { type: "RESOLVED", entryId: "entry-2", outcome: LOSS },
      { type: "REVEAL_DONE" },
    );
    expect(lost.screen).toBe("lose");
  });

  it("does not draw before the player has played", () => {
    const play = playing("mystery_box");
    expect(flowReducer(play, { type: "DRAW_STARTED" })).toBe(play);
  });
});

describe("errors", () => {
  it("shows the duplicate screen when the phone already played", () => {
    const state = flowReducer(resolving(), {
      type: "FAILED",
      error: error("ALREADY_PARTICIPATED"),
    });
    expect(state.screen).toBe("duplicate");
    expect(state.error?.code).toBe("ALREADY_PARTICIPATED");
  });

  it("shows the closed screen when the campaign is over", () => {
    const state = flowReducer(resolving(), {
      type: "FAILED",
      error: error("CAMPAIGN_CLOSED"),
    });
    expect(state.screen).toBe("closed");
  });

  it("goes back to the form on invalid input, for a new attempt", () => {
    const state = flowReducer(resolving("hit_it"), {
      type: "FAILED",
      error: error("INVALID_INPUT"),
    });
    expect(state).toMatchObject({
      screen: "register",
      error: { code: "INVALID_INPUT" },
      clientRequestId: null,
      gamePayload: null,
    });
    expect(state.participant.phone).toBe("0541 23 45 67"); // kept, to be corrected
    const again = flowReducer(state, {
      ...SUBMIT,
      clientRequestId: "request-2",
    });
    expect(again).toMatchObject({
      screen: "play",
      clientRequestId: "request-2",
      error: null,
    });
  });

  it("offers RETRY on a network or unknown error, with the same request", () => {
    for (const code of ["NETWORK", "UNKNOWN"] as const) {
      const before = resolving("hit_it");
      const failed = flowReducer(before, {
        type: "FAILED",
        error: error(code),
      });
      expect(failed.screen).toBe("error");
      const retried = flowReducer(failed, { type: "RETRY" });
      expect(retried.screen).toBe("resolving");
      expect(retried.error).toBeNull();
      expect(retried.clientRequestId).toBe(before.clientRequestId);
      expect(retried.gamePayload).toEqual({ kind: "hitIt", hits: 9 });
      expect(nextCommand(failed, retried)).toBe("DRAW");
    }
  });

  it("refuses RETRY when retrying cannot help", () => {
    for (const code of ["ALREADY_PARTICIPATED", "CAMPAIGN_CLOSED"] as const) {
      const state = flowReducer(resolving(), {
        type: "FAILED",
        error: error(code),
      });
      expect(flowReducer(state, { type: "RETRY" })).toBe(state);
    }
    const odd: FlowState = {
      ...resolving(),
      screen: "error",
      error: error("INVALID_INPUT"),
    };
    expect(flowReducer(odd, { type: "RETRY" })).toBe(odd);
    expect(flowReducer(playing("quiz"), { type: "RETRY" }).screen).toBe("play");
  });
});

describe("late or repeated events", () => {
  it("ignores a result that arrives outside the draw", () => {
    const play = playing("lucky_wheel");
    expect(
      flowReducer(play, { type: "RESOLVED", entryId: "e", outcome: WIN }),
    ).toBe(play);
    expect(flowReducer(play, { type: "FAILED", error: error("NETWORK") })).toBe(
      play,
    );
    expect(flowReducer(play, { type: "REVEAL_DONE" })).toBe(play);
  });

  it("does not let RESTART drop a draw in flight or being shown", () => {
    const drawing = resolving();
    expect(flowReducer(drawing, { type: "RESTART" })).toBe(drawing);
    const revealing = flowReducer(drawing, {
      type: "RESOLVED",
      entryId: "e",
      outcome: WIN,
    });
    expect(flowReducer(revealing, { type: "RESTART" })).toBe(revealing);
  });
});

describe("coupon", () => {
  const won = (outcome: DrawOutcome = WIN) =>
    run(
      resolving(),
      { type: "RESOLVED", entryId: "entry-1", outcome },
      { type: "REVEAL_DONE" },
    );

  it("confirms the coupon once, and asks for the CONFIRM effect", () => {
    const win = won();
    const confirmed = flowReducer(win, { type: "CONFIRM_COUPON" });
    expect(confirmed.couponConfirmed).toBe(true);
    expect(nextCommand(win, confirmed)).toBe("CONFIRM");
    expect(flowReducer(confirmed, { type: "CONFIRM_COUPON" })).toBe(confirmed);
  });

  it("has nothing to confirm without a code, or after a loss", () => {
    const noCode = won({ ...WIN, couponCode: null });
    expect(flowReducer(noCode, { type: "CONFIRM_COUPON" })).toBe(noCode);
    const lose = won(LOSS);
    expect(lose.screen).toBe("lose");
    expect(flowReducer(lose, { type: "CONFIRM_COUPON" })).toBe(lose);
  });
});

describe("RESTART", () => {
  it("goes back to the welcome screen and keeps the details already sent", () => {
    const win = run(
      resolving(),
      { type: "RESOLVED", entryId: "entry-1", outcome: WIN },
      { type: "REVEAL_DONE" },
      { type: "CONFIRM_COUPON" },
    );
    const restarted = flowReducer(win, { type: "RESTART" });
    expect(restarted).toEqual({
      ...createInitialFlowState("lucky_wheel", { startedAt: T0 }),
      participant: win.participant,
    });
    // The consent must be given again, and the next attempt gets a new request id:
    // the server refuses it as a duplicate (RESTART never bypasses the check).
    expect(restarted.consentAccepted).toBe(false);
    expect(restarted.clientRequestId).toBeNull();
  });

  it("is available from every screen that is not drawing", () => {
    const duplicate = flowReducer(resolving(), {
      type: "FAILED",
      error: error("ALREADY_PARTICIPATED"),
    });
    const network = flowReducer(resolving(), {
      type: "FAILED",
      error: error("NETWORK"),
    });
    for (const state of [duplicate, network, playing("quiz")]) {
      expect(flowReducer(state, { type: "RESTART" }).screen).toBe("welcome");
    }
  });

  it("keeps a timing chosen from the campaign", () => {
    const state = flowReducer(playing("quiz", "before-animation"), {
      type: "RESTART",
    });
    expect(state.timing).toBe("before-animation");
  });
});

describe("nextCommand", () => {
  it("asks for nothing on ordinary transitions", () => {
    const welcome = createInitialFlowState("quiz", { startedAt: T0 });
    const register = flowReducer(welcome, { type: "START" });
    expect(nextCommand(welcome, register)).toBeNull();
    expect(nextCommand(register, register)).toBeNull();
  });
});

describe("purity", () => {
  it("reads no clock and no randomness, and never changes its input", () => {
    const now = vi.spyOn(Date, "now");
    const random = vi.spyOn(Math, "random");
    const uuid = vi.spyOn(crypto, "randomUUID");
    const start = createInitialFlowState("quiz", { startedAt: T0 });
    const frozen = structuredClone(start);
    const end = run(
      start,
      ...FILL,
      SUBMIT,
      { type: "INTERACTION_DONE", payload: { kind: "quiz", answers: {} } },
      { type: "FAILED", error: error("NETWORK") },
      { type: "RETRY" },
      { type: "RESOLVED", entryId: "e", outcome: WIN },
      { type: "REVEAL_DONE" },
      { type: "CONFIRM_COUPON" },
      { type: "RESTART" },
    );
    expect(end.screen).toBe("welcome");
    expect(start).toEqual(frozen);
    expect(now).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
  });
});
