import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { FlowScreen } from "../../domain/flow";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { runtimeAudio } from "../feedback/audio";
import { PlayerExperience } from "../PlayerExperience";

// The Ballot screen of a draw campaign: the participation is accepted and in the draw. It is
// played like a win (sound, confetti) but never shows a prize nor a code.

// canvas-confetti draws on a real <canvas>; jsdom has none (WinScreen.test.tsx's pattern).
const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(), { reset: vi.fn() });
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create: confetti.create } }));

function setup(initialScreen: FlowScreen = "ballot") {
  const campaign = { ...createDemoCampaign("lucky_wheel"), ballot: true };
  const config = createDefaultExperience({ gameType: "lucky_wheel", campaign });
  const services = createLocalServices({
    participation: "scripted",
    campaign,
    scenario: "lose",
  });
  const track = vi.spyOn(services.analytics, "track");
  render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={["scripted"]}
        initialScreen={initialScreen}
      />
    </ServicesProvider>,
  );
  return { track };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning
  vi.spyOn(window, "open").mockImplementation(() => null);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("BallotScreen", () => {
  it("tells the player their entry is in the draw, with no prize nor code", () => {
    setup();
    expect(screen.getByText("Participation validée !")).toBeTruthy();
    expect(screen.getByText("Inscrit au tirage")).toBeTruthy();
    expect(screen.queryByText(/DEMO-/)).toBeNull();
    expect(screen.queryByText("Pas de chance cette fois !")).toBeNull();
    expect(screen.getByText("Règlement")).toBeTruthy(); // legal footer, still there
  });

  it("celebrates like a win: the win sound and confetti", () => {
    const play = vi.spyOn(runtimeAudio, "play");
    setup();
    expect(play).toHaveBeenCalledWith("win");
    expect(play).not.toHaveBeenCalledWith("lose");
    expect(confetti.fire).toHaveBeenCalled();
  });

  it("shares on WhatsApp without granting anything", () => {
    const { track } = setup();
    fireEvent.click(screen.getByText("Partager"));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://api.whatsapp.com/send?text="),
      "_blank",
      "noopener,noreferrer",
    );
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "share_clicked",
        data: { kind: "whatsapp" },
      }),
    );
    expect(screen.getByText("Participation validée !")).toBeTruthy();
  });

  it("goes back to the start on Terminer", () => {
    setup();
    fireEvent.click(screen.getByText("Terminer"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });
});
