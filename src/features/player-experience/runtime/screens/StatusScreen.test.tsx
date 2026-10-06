import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import {
  createInitialFlowState,
  type FlowScreen,
  type FlowState,
} from "../../domain/flow";
import type { ParticipationErrorCode } from "../../domain/participation";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  createLocalServices,
  type ScriptedScenario,
} from "../../services/createLocalServices";
import type { ParticipationGateway } from "../../services/ports";
import { ServicesProvider } from "../../services/ServicesProvider";
import { PlayerExperience } from "../PlayerExperience";
import type { ExperienceFlow } from "../useExperienceFlow";
import { StatusScreen } from "./StatusScreen";

// The three non-winning outcomes of a draw (tasks.md T4.3): each names what happened and
// always offers a way out (B9). Lightweight tests drive StatusScreen directly with a mock
// flow; the retry test plays the real journey, to prove RETRY reuses the clientRequestId
// end to end, through the button the player actually presses.

function mockFlow(screen: FlowScreen, error?: ParticipationErrorCode) {
  const retry = vi.fn();
  const restart = vi.fn();
  const track = vi.fn();
  const state: FlowState = {
    ...createInitialFlowState("lucky_wheel", { startedAt: 0 }),
    screen,
    error: error ? { code: error, message: "from the gateway" } : null,
  };
  const flow = { state, retry, restart, track } as unknown as ExperienceFlow;
  return { flow, retry, restart, track };
}

function renderOn(screen: FlowScreen, error?: ParticipationErrorCode) {
  const { flow, retry, restart, track } = mockFlow(screen, error);
  const view = render(
    <StatusScreen
      flow={flow}
      config={createDefaultExperience({ gameType: "lucky_wheel" })}
      campaign={createDemoCampaign("lucky_wheel")}
      locale="fr"
      chrome={{ logoUrl: null, statusBadge: null, live: true }}
    />,
  );
  return { ...view, retry, restart, track };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StatusScreen: already participated", () => {
  it("names it, with only a way back — never a retry (a business refusal fails again)", () => {
    renderOn("duplicate");
    expect(screen.getByText("Déjà joué !")).toBeTruthy();
    expect(
      screen.getByText(
        "Vous avez déjà participé à cette campagne avec ce numéro.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Retour")).toBeTruthy();
    expect(screen.queryByText("Réessayer")).toBeNull();
  });

  it("goes back to the start, reporting the click", () => {
    const { restart, track } = renderOn("duplicate");
    fireEvent.click(screen.getByText("Retour"));
    expect(restart).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith(
      "cta_clicked",
      expect.objectContaining({ cta: "primary" }),
    );
  });
});

describe("StatusScreen: campaign closed", () => {
  it("names it, with only a way back", () => {
    renderOn("closed");
    expect(screen.getByText("Campagne terminée")).toBeTruthy();
    expect(
      screen.getByText("Cette campagne est terminée. Merci de votre intérêt !"),
    ).toBeTruthy();
    expect(screen.getByText("Retour")).toBeTruthy();
    expect(screen.queryByText("Réessayer")).toBeNull();
  });
});

describe("StatusScreen: network or unknown error", () => {
  it("offers to retry first, and to go back", () => {
    const { retry, restart } = renderOn("error", "NETWORK");
    expect(screen.getByText("Oups !")).toBeTruthy();
    expect(
      screen.getByText(
        "Connexion impossible. Vérifiez votre réseau et réessayez.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Réessayer"));
    expect(retry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Retour"));
    expect(restart).toHaveBeenCalledOnce();
  });

  it("uses the default code when the flow was forced by the preview (no real error)", () => {
    renderOn("error"); // createPreviewFlowState sets no real ParticipationError
    expect(
      screen.getByText(
        "Connexion impossible. Vérifiez votre réseau et réessayez.",
      ),
    ).toBeTruthy();
  });

  it("shows the actual error the gateway gave (UNKNOWN, not just NETWORK)", () => {
    renderOn("error", "UNKNOWN");
    expect(
      screen.getByText("Un problème est survenu. Réessayez dans un instant."),
    ).toBeTruthy();
  });
});

describe("every variant", () => {
  it("is never a dead end: the legal footer stays, and a medallion fills slot 5", () => {
    for (const variant of ["duplicate", "closed", "error"] as const) {
      const { container, unmount } = renderOn(variant);
      expect(screen.getByText("Règlement"), variant).toBeTruthy();
      expect(
        container.querySelector('[data-xp-slot="interaction"] svg'),
        variant,
      ).toBeTruthy();
      unmount();
    }
  });
});

// End to end: the real journey, the scripted gateway, the button the player presses.
type Scripted = ParticipationGateway & {
  setScenario(scenario: ScriptedScenario): void;
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning
});

describe("RETRY, played end to end", () => {
  it("reuses the exact same request after a network error, once the network is back", async () => {
    vi.useFakeTimers();
    const campaign = createDemoCampaign("lucky_wheel");
    const config = createDefaultExperience({
      gameType: "lucky_wheel",
      campaign,
    });
    const services = createLocalServices({
      participation: "scripted",
      scenario: "network-error",
      campaign,
    });
    const draw = vi.spyOn(services.participation, "draw");
    const gateway = services.participation as Scripted;
    render(
      <ServicesProvider services={services}>
        <PlayerExperience
          config={config}
          campaign={campaign}
          locale="fr"
          allowedGatewayModes={["scripted"]}
          initialScreen="register"
        />
      </ServicesProvider>,
    );
    fireEvent.change(screen.getByLabelText("Nom complet"), {
      target: { value: "Amina B." },
    });
    fireEvent.change(screen.getByLabelText("Numéro de téléphone"), {
      target: { value: "0555123456" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Participer"));
    fireEvent.click(screen.getByText("Tourner la roue"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText("Oups !")).toBeTruthy();
    expect(draw).toHaveBeenCalledOnce();

    gateway.setScenario("lose"); // the network is back
    fireEvent.click(screen.getByText("Réessayer"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(draw).toHaveBeenCalledTimes(2);
    const [first, second] = draw.mock.calls.map(([request]) => request);
    expect(second.clientRequestId).toBe(first.clientRequestId);
    expect(second.gamePayload).toEqual(first.gamePayload);
    expect(screen.queryByText("Oups !")).toBeNull(); // moved on
    vi.useRealTimers();
  });
});
