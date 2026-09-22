import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../domain/defaults";
import type { FlowScreen, FlowState } from "../domain/flow";
import type { GameType } from "../domain/gameTypes";
import type { DrawRequest } from "../domain/participation";
import { createDemoCampaign } from "../presets/demoCampaign";
import {
  createLocalServices,
  type ScriptedScenario,
} from "../services/createLocalServices";
import type {
  ExperienceServices,
  ParticipationGateway,
} from "../services/ports";
import {
  transitionEvents,
  useExperienceFlow,
  type ExperienceFlow,
  type UseExperienceFlowOptions,
} from "./useExperienceFlow";

// The acceptance test of T4.1: the journey driven through the hook, with the scripted
// gateway of the Studio (its 300 ms latency run on fake timers).

const T0 = 1_760_000_000_000;
let clock = T0;
const now = () => clock;

type Scripted = ParticipationGateway & {
  setScenario(scenario: ScriptedScenario): void;
};

function setup(
  scenario: ScriptedScenario,
  options: Partial<UseExperienceFlowOptions> & { gameType?: GameType } = {},
) {
  const gameType = options.gameType ?? "lucky_wheel";
  const campaign = createDemoCampaign(gameType);
  const config = createDefaultExperience({ gameType, campaign });
  const services =
    options.services ??
    createLocalServices({ participation: "scripted", scenario });
  const draw = vi.spyOn(services.participation, "draw");
  const confirm = vi.spyOn(services.participation, "confirmCoupon");
  const track = vi.spyOn(services.analytics, "track");
  const hook = renderHook(() =>
    useExperienceFlow({
      config,
      campaign,
      services,
      locale: "fr",
      now,
      ...options,
    }),
  );
  return {
    ...hook,
    flow: () => hook.result.current,
    services,
    gateway: services.participation as Scripted,
    campaign,
    config,
    draw,
    confirm,
    track,
  };
}

const screen = (flow: () => ExperienceFlow): FlowScreen => flow().state.screen;

// Welcome → registration (details and consent) → play.
function register(flow: () => ExperienceFlow) {
  act(() => flow().start());
  act(() => {
    flow().updateField("fullName", "Amina B.");
    flow().updateField("phone", "+213 541 23 45 67");
  });
  clock = T0 + 5_000;
  act(() => flow().setConsent(true));
  act(() => flow().submit());
}

// Lets the gateway answer (scripted: 300 ms; demo: up to 900 ms).
const answer = (ms = 300) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

async function drawWheel(flow: () => ExperienceFlow) {
  register(flow);
  act(() => flow().startDraw());
  await answer();
}

beforeEach(() => {
  vi.useFakeTimers();
  clock = T0;
  vi.spyOn(console, "warn").mockImplementation(() => {}); // the demo gateway warning
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useExperienceFlow with the scripted gateway", () => {
  it("plays a win to the end: one draw, the reveal, the coupon confirmed once", async () => {
    const prize = createDemoCampaign("lucky_wheel").prizes[0];
    const { flow, draw, confirm } = setup(`win-${prize.id}`);
    expect(screen(flow)).toBe("welcome");
    await drawWheel(flow);
    expect(draw).toHaveBeenCalledOnce();
    expect(screen(flow)).toBe("revealing");
    expect(flow().state.outcome).toMatchObject({
      isWinner: true,
      prize: { id: prize.id, name: prize.name },
    });
    act(() => flow().completeReveal());
    expect(screen(flow)).toBe("win");
    expect(flow().couponStatus).toBe("idle");
    act(() => flow().confirmCoupon());
    expect(flow().couponStatus).toBe("sending");
    await answer(0);
    act(() => flow().confirmCoupon()); // a second tap
    await answer(0);
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(flow().state.entryId);
    expect(flow().couponStatus).toBe("confirmed");
  });

  it("plays a loss, then goes back to the start", async () => {
    const { flow } = setup("lose");
    await drawWheel(flow);
    act(() => flow().completeReveal());
    expect(screen(flow)).toBe("lose");
    act(() => flow().restart());
    expect(screen(flow)).toBe("welcome");
    expect(flow().state.participant.fullName).toBe("Amina B."); // kept for the next time
    expect(flow().state.consentAccepted).toBe(false); // asked again
  });

  it("shows the duplicate screen when the phone already played", async () => {
    const { flow } = setup("duplicate");
    await drawWheel(flow);
    expect(screen(flow)).toBe("duplicate");
    expect(flow().state.error?.code).toBe("ALREADY_PARTICIPATED");
  });

  it("shows the closed screen when the campaign is over", async () => {
    const { flow } = setup("closed");
    await drawWheel(flow);
    expect(screen(flow)).toBe("closed");
    expect(flow().state.error?.code).toBe("CAMPAIGN_CLOSED");
  });

  it("retries after a network error with the very same request", async () => {
    const { flow, gateway, draw } = setup("network-error");
    await drawWheel(flow);
    expect(screen(flow)).toBe("error");
    expect(flow().state.error?.code).toBe("NETWORK");
    gateway.setScenario("lose"); // the network is back
    act(() => flow().retry());
    expect(screen(flow)).toBe("resolving");
    await answer();
    expect(screen(flow)).toBe("revealing");
    expect(draw).toHaveBeenCalledTimes(2);
    const [first, second] = draw.mock.calls.map(([request]) => request);
    expect(second.clientRequestId).toBe(first.clientRequestId);
    expect(second.gamePayload).toEqual(first.gamePayload);
  });
});

describe("the draw request", () => {
  it("sends the normalized phone, the consent record and the context", async () => {
    const { flow, draw, campaign, config } = setup("lose");
    register(flow);
    clock = T0 + 42_000;
    act(() => flow().startDraw());
    await answer();
    const request = draw.mock.calls[0][0] as DrawRequest;
    expect(request).toMatchObject({
      campaignId: campaign.id,
      participant: { phone: "0541234567", fullName: "Amina B." },
      consent: {
        accepted: true,
        acceptedAt: new Date(T0 + 5_000).toISOString(),
        policyVersion: config.form.consent.policyVersion,
        locale: "fr",
      },
      gamePayload: { kind: "none" },
      humanToken: null,
      context: {
        dwellTimeSeconds: 42,
        userAgent: navigator.userAgent,
        source: "studio_preview",
      },
    });
    expect(request.context.sessionId).toMatch(/^sess_/);
    expect(request.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends the payload of the player's interaction", async () => {
    const { flow, draw } = setup("lose", { gameType: "hit_it" });
    register(flow);
    act(() => flow().startDraw()); // not for Hit It: nothing happens
    expect(screen(flow)).toBe("play");
    act(() => flow().completeInteraction({ kind: "hitIt", hits: 9 }));
    await answer();
    expect(draw.mock.calls[0][0].gamePayload).toEqual({
      kind: "hitIt",
      hits: 9,
    });
  });

  it("turns a gateway that throws into an error the player can retry", async () => {
    const { flow, draw } = setup("lose");
    draw.mockRejectedValueOnce(new Error("socket closed"));
    await drawWheel(flow);
    expect(screen(flow)).toBe("error");
    expect(flow().state.error).toEqual({
      code: "UNKNOWN",
      message: "Error: socket closed",
    });
    act(() => flow().retry());
    await answer();
    expect(screen(flow)).toBe("revealing");
  });

  it("never sends a participation without consent: back to the form", async () => {
    const { flow, draw } = setup("lose", { initialScreen: "play" });
    expect(screen(flow)).toBe("play"); // forced by the preview, nothing typed
    act(() => flow().startDraw());
    await answer();
    expect(draw).not.toHaveBeenCalled();
    expect(screen(flow)).toBe("register");
    expect(flow().state.error?.code).toBe("INVALID_INPUT");
  });

  it("ignores a submit outside the form", () => {
    const { flow, track } = setup("lose");
    track.mockClear();
    act(() => flow().submit());
    expect(screen(flow)).toBe("welcome");
    expect(track).not.toHaveBeenCalled();
  });

  it("does not submit an invalid form, and reports it", () => {
    const { flow, track } = setup("lose");
    act(() => flow().start());
    act(() => flow().submit());
    expect(screen(flow)).toBe("register");
    expect(flow().canSubmit).toBe(false);
    expect(track).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "form_invalid", screen: "register" }),
    );
  });

  it("drops an answer that arrives once the experience is gone", async () => {
    const { flow, unmount, draw } = setup("lose");
    register(flow);
    act(() => flow().startDraw());
    unmount();
    await answer();
    expect(draw).toHaveBeenCalledOnce(); // answered, and silently dropped
  });

  it("sends the token of the human verification, or none when it fails", async () => {
    const { flow, draw, services, gateway } = setup("network-error");
    vi.spyOn(services.humanVerification, "getToken")
      .mockResolvedValueOnce("captcha-token")
      .mockRejectedValueOnce(new Error("captcha down"));
    await drawWheel(flow);
    gateway.setScenario("lose");
    act(() => flow().retry());
    await answer();
    expect(draw.mock.calls.map(([request]) => request.humanToken)).toEqual([
      "captcha-token",
      null, // the server decides whether a missing token is acceptable
    ]);
  });

  it("confirms the coupon once, and says when the confirmation failed", async () => {
    const prize = createDemoCampaign("lucky_wheel").prizes[0];
    const { flow, confirm } = setup(`win-${prize.id}`);
    confirm.mockResolvedValueOnce({
      ok: false,
      error: { code: "NETWORK", message: "offline" },
    });
    await drawWheel(flow);
    act(() => flow().completeReveal());
    act(() => flow().confirmCoupon());
    await answer(0);
    expect(flow().couponStatus).toBe("failed");
    act(() => flow().restart());
    expect(flow().couponStatus).toBe("idle"); // the status belongs to its entry
  });

  it("drops a confirmation that answers once the experience is gone", async () => {
    const prize = createDemoCampaign("lucky_wheel").prizes[0];
    const { flow, confirm, track, unmount } = setup(`win-${prize.id}`);
    await drawWheel(flow);
    act(() => flow().completeReveal());
    act(() => flow().confirmCoupon());
    unmount();
    await answer(0);
    expect(confirm).toHaveBeenCalledOnce();
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "coupon_confirmed" }),
    );
  });

  it("treats a confirmation that throws as failed", async () => {
    const prize = createDemoCampaign("lucky_wheel").prizes[0];
    const { flow, confirm } = setup(`win-${prize.id}`);
    confirm.mockRejectedValueOnce(new Error("offline"));
    await drawWheel(flow);
    act(() => flow().completeReveal());
    act(() => flow().confirmCoupon());
    await answer(0);
    expect(flow().couponStatus).toBe("failed");
  });
});

describe("the demo gateway", () => {
  it("never lets RESTART open a second participation with the same phone (N4)", async () => {
    const services = createLocalServices(); // demo gateway, entries in localStorage
    const { flow } = setup("lose", { services });
    await drawWheel(flow);
    await answer(1_000);
    act(() => flow().completeReveal());
    expect(["win", "lose"]).toContain(screen(flow));
    act(() => flow().restart());
    register(flow);
    act(() => flow().startDraw());
    await answer(1_000);
    expect(screen(flow)).toBe("duplicate");
  });
});

describe("the live gateway", () => {
  const live = (): ExperienceServices => ({
    ...createLocalServices(),
    participation: {
      mode: "live",
      checkAvailability: async () => ({ open: true }),
      draw: async () => ({
        ok: true,
        entryId: "entry-1",
        outcome: { isWinner: false, prize: null, couponCode: null },
      }),
      confirmCoupon: async () => ({ ok: true }),
    },
  });

  it("never starts on a forced screen", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { flow } = setup("lose", { services: live(), initialScreen: "win" });
    expect(screen(flow)).toBe("welcome");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("initialScreen"));
  });

  it("tells the server the draw comes from the web player", async () => {
    const { flow, draw } = setup("lose", { services: live() });
    await drawWheel(flow);
    expect(draw.mock.calls[0][0].context.source).toBe("web_player");
  });
});

describe("analytics", () => {
  it("follows the journey, without any personal data", async () => {
    const prize = createDemoCampaign("lucky_wheel").prizes[0];
    const { flow, track, campaign } = setup(`win-${prize.id}`);
    await drawWheel(flow);
    act(() => flow().completeReveal());
    act(() => flow().track("coupon_copied"));
    act(() => flow().confirmCoupon());
    await answer(0);
    const events = track.mock.calls.map(([event]) => event);
    expect(events.map((event) => event.name)).toEqual([
      "experience_viewed",
      "form_submitted",
      "game_started",
      "draw_requested",
      "outcome_received",
      "reveal_completed",
      "coupon_copied",
      "coupon_confirmed",
    ]);
    expect(events[0]).toEqual({
      name: "experience_viewed",
      at: new Date(T0).toISOString(),
      campaignId: campaign.id,
      sessionId: expect.stringMatching(/^sess_/),
      screen: "welcome",
      locale: "fr",
    });
    expect(events.at(-1)).toMatchObject({ screen: "win", data: { ok: true } });
    const sent = JSON.stringify(events);
    expect(sent).not.toContain("541");
    expect(sent).not.toContain("Amina");
  });

  it("reports the errors shown", async () => {
    const { flow, track } = setup("duplicate");
    await drawWheel(flow);
    expect(track).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "error_shown",
        screen: "duplicate",
        data: { code: "ALREADY_PARTICIPATED" },
      }),
    );
  });

  it("never lets a failing tracker break the journey", async () => {
    const { flow, track } = setup("lose");
    track.mockImplementation(() => {
      throw new Error("tracker down");
    });
    await drawWheel(flow);
    act(() => flow().completeReveal());
    expect(screen(flow)).toBe("lose");
  });

  it("derives the events from each transition", () => {
    const state = (patch: Partial<FlowState>) =>
      ({
        screen: "welcome",
        error: null,
        outcome: null,
        ...patch,
      }) as FlowState;
    expect(
      transitionEvents(
        state({ screen: "welcome" }),
        state({ screen: "register" }),
      ),
    ).toEqual([]);
    // A game screen forced by the preview: the game starts, nothing was submitted.
    expect(
      transitionEvents(
        state({ screen: "welcome" }),
        state({ screen: "play", gameType: "quiz" }),
      ),
    ).toEqual([{ name: "game_started", data: { gameType: "quiz" } }]);
    const error = { code: "NETWORK" as const, message: "x" };
    expect(
      transitionEvents(
        state({ screen: "error", error }),
        state({ screen: "error", error }),
      ),
    ).toEqual([]); // the same error is reported once
  });
});
