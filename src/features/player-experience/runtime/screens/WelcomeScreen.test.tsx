import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { GameType } from "../../domain/gameTypes";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { PlayerExperience } from "../PlayerExperience";

// The welcome screen inside the real journey: teaser of the game, sections, one button.

function setup(gameType: GameType = "lucky_wheel") {
  const campaign = createDemoCampaign(gameType);
  const config = createDefaultExperience({ gameType, campaign });
  const services = createLocalServices({ participation: "scripted", campaign });
  const track = vi.spyOn(services.analytics, "track");
  const view = render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={["scripted"]}
      />
    </ServicesProvider>,
  );
  return { ...view, campaign, track };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("WelcomeScreen", () => {
  it("shows the teaser of the game, its caption, the sections and one button", () => {
    const { container, campaign } = setup();
    expect(
      screen.getByText(`${campaign.prizes.length} lots à gagner`),
    ).toBeTruthy();
    expect(
      container
        .querySelector('[data-xp-slot="interaction"] [data-xp-teaser]')
        ?.getAttribute("data-xp-teaser"),
    ).toBe("lucky_wheel");
    expect(container.querySelector('[data-xp-slot="sections"]')).toBeTruthy();
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });

  it("starts the journey from the teaser like from the CTA, never a game", () => {
    const { track } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Lancer le jeu · / }));
    expect(screen.getByText("Vos coordonnées")).toBeTruthy(); // registration first
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "cta_clicked",
        screen: "welcome",
        data: { cta: "teaser" },
      }),
    );
  });

  it("follows the game of the campaign: its teaser, texts and CTA", () => {
    const { container, campaign } = setup("quiz");
    expect(
      container
        .querySelector("[data-xp-teaser]")
        ?.getAttribute("data-xp-teaser"),
    ).toBe("quiz");
    expect(screen.getByText(`${campaign.quiz.length} questions`)).toBeTruthy();
    expect(screen.getByText("Relevez le quiz express")).toBeTruthy();
    fireEvent.click(screen.getByText("Commencer le quiz"));
    expect(screen.getByText("Vos coordonnées")).toBeTruthy();
  });
});
