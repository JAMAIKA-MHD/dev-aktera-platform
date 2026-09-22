import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  createLocalServices,
  type ScriptedScenario,
} from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { PlayerExperience } from "../PlayerExperience";

// The scripted gateway's own artificial delay (SCRIPTED_LATENCY_MS); the runtime may not
// import services/local directly (boundary rule), so the value is repeated here as elsewhere
// in runtime/ (StatusScreen.test.tsx).
const SCRIPTED_LATENCY_MS = 300;

// T4.5: the whole journey, played once per scripted scenario — the same five a real gateway
// can return (win, lose, an already-used phone, a closed campaign, a network error) — through
// the real screens (welcome → register → play → the outcome), never through the flow's state
// directly (useExperienceFlow.test.tsx already does that, at the hook level). No game engine
// exists yet (phase 5): the play screen's own stand-in (PendingScreen, T4.1) plays that part,
// exactly as a real engine will once it exists (the wheel and the scratch card need only a
// tap to start, `state.timing === "before-animation"`, T5.1's contract).

function setup(scenario: ScriptedScenario) {
  const campaign = createDemoCampaign("lucky_wheel");
  const config = createDefaultExperience({ gameType: "lucky_wheel", campaign });
  const services = createLocalServices({
    participation: "scripted",
    scenario,
    campaign,
  });
  const draw = vi.spyOn(services.participation, "draw");
  const confirmCoupon = vi.spyOn(services.participation, "confirmCoupon");
  render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={["scripted"]}
      />
    </ServicesProvider>,
  );
  return { campaign, draw, confirmCoupon };
}

// Welcome → register, filled and sent → play, the game "played" → resolving. The gateway
// answers after SCRIPTED_LATENCY_MS: advancing fake timers stands in for that wait.
async function playThroughRegistration() {
  fireEvent.click(screen.getByText("Lancer le jeu"));
  fireEvent.change(screen.getByLabelText("Nom complet"), {
    target: { value: "Amina Benali" },
  });
  fireEvent.change(screen.getByLabelText("Numéro de téléphone"), {
    target: { value: "0555123456" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("Participer"));
  fireEvent.click(screen.getByText("Tourner la roue"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SCRIPTED_LATENCY_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning, expected
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("the player journey, played end to end (T4.5)", () => {
  it("wins: the prize, its code, confirmed, then back to the start", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { campaign, draw, confirmCoupon } = setup("win-demo-prize-voucher");

    await playThroughRegistration();

    expect(screen.getByText("Félicitations, vous avez gagné !")).toBeTruthy();
    expect(screen.getByText(campaign.prizes[0].name)).toBeTruthy();
    expect(screen.getByText(/^DEMO-[A-Z0-9]{4}-[A-Z0-9]{4}$/)).toBeTruthy();
    expect(draw).toHaveBeenCalledOnce();
    const [request] = draw.mock.calls[0];
    expect(request.participant.phone).toBe("0555123456");
    expect(request.consent.accepted).toBe(true);
    expect(request.gamePayload).toEqual({ kind: "none" });

    fireEvent.click(screen.getByText("J'ai copié mon code"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // confirmCoupon has no artificial latency
    });
    expect(confirmCoupon).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText("Terminer"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy(); // back on welcome

    expect(error).not.toHaveBeenCalled();
  });

  it("loses: a consolation, then back to the start", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup("lose");

    await playThroughRegistration();

    expect(screen.getByText("Pas de chance cette fois !")).toBeTruthy();
    fireEvent.click(screen.getByText("Retour à l'accueil"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();

    expect(error).not.toHaveBeenCalled();
  });

  it("refuses a phone that already played: no retry offered", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { draw } = setup("duplicate");

    await playThroughRegistration();

    expect(screen.getByText("Déjà joué !")).toBeTruthy();
    expect(screen.queryByText("Réessayer")).toBeNull();
    fireEvent.click(screen.getByText("Retour"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
    expect(draw).toHaveBeenCalledOnce();

    expect(error).not.toHaveBeenCalled();
  });

  it("refuses a closed campaign: no retry offered", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup("closed");

    await playThroughRegistration();

    expect(screen.getByText("Campagne terminée")).toBeTruthy();
    expect(screen.queryByText("Réessayer")).toBeNull();
    fireEvent.click(screen.getByText("Retour"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();

    expect(error).not.toHaveBeenCalled();
  });

  it("meets a network error, and can retry the very same attempt", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { draw } = setup("network-error");

    await playThroughRegistration();

    expect(screen.getByText("Oups !")).toBeTruthy();
    expect(draw).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText("Réessayer"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCRIPTED_LATENCY_MS);
    });
    // Still scripted for "network-error": the same attempt fails again, on purpose.
    expect(screen.getByText("Oups !")).toBeTruthy();
    expect(draw).toHaveBeenCalledTimes(2);
    const [first, second] = draw.mock.calls.map(([request]) => request);
    expect(second.clientRequestId).toBe(first.clientRequestId);
    expect(second.gamePayload).toEqual(first.gamePayload);

    fireEvent.click(screen.getByText("Retour"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();

    expect(error).not.toHaveBeenCalled();
  });
});
