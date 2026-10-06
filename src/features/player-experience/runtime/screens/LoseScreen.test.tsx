import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { runtimeAudio } from "../feedback/audio";
import { PlayerExperience } from "../PlayerExperience";

// The loss screen (tasks.md T4.4): a warm consolation and a single, simple share button —
// never the prototype's "+1 try for a share" (features.shareBonus is locked to false, N4):
// nothing here reads or writes it, sharing is purely optional.

function setup() {
  const campaign = createDemoCampaign("lucky_wheel");
  const config = createDefaultExperience({ gameType: "lucky_wheel", campaign });
  const services = createLocalServices({ participation: "scripted", campaign });
  const track = vi.spyOn(services.analytics, "track");
  render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={["scripted"]}
        initialScreen="lose"
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

describe("LoseScreen", () => {
  it("shows a warm consolation message, never an impasse", () => {
    setup();
    expect(screen.getByText("Pas de chance cette fois !")).toBeTruthy();
    expect(screen.getByText("Retour à l'accueil")).toBeTruthy(); // the CTA
    expect(screen.getByText("Règlement")).toBeTruthy(); // legal footer, still there
  });

  it("plays the lose sound once", () => {
    const play = vi.spyOn(runtimeAudio, "play");
    setup();
    expect(play).toHaveBeenCalledWith("lose");
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("offers a single, simple share button — never a bonus try", () => {
    const { track } = setup();
    expect(screen.getAllByRole("button", { name: /Partager/ })).toHaveLength(1);
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
    // No extra attempt was granted: the journey is still on the loss screen.
    expect(screen.getByText("Pas de chance cette fois !")).toBeTruthy();
  });

  it("goes back to the start on Retour à l'accueil", () => {
    setup();
    fireEvent.click(screen.getByText("Retour à l'accueil"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });
});
