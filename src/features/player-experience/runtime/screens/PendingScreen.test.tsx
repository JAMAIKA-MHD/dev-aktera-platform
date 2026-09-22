import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createInitialFlowState, type FlowScreen } from "../../domain/flow";
import { createDemoCampaign } from "../../presets/demoCampaign";
import type { ExperienceFlow } from "../useExperienceFlow";
import { PendingScreen } from "./PendingScreen";

const flowOn = (screen: FlowScreen) =>
  ({
    state: {
      ...createInitialFlowState("lucky_wheel", { startedAt: 0 }),
      screen,
    },
    track: vi.fn(),
  }) as unknown as ExperienceFlow;

const renderOn = (screen: FlowScreen) =>
  render(
    <PendingScreen
      flow={flowOn(screen)}
      config={createDefaultExperience({ gameType: "lucky_wheel" })}
      campaign={createDemoCampaign("lucky_wheel")}
      locale="en"
      chrome={{ logoUrl: null, statusBadge: null, live: false }}
    />,
  );

describe("PendingScreen", () => {
  it("leaves every other screen of the journey to its own component (T4.2, T4.3, T4.4)", () => {
    for (const own of [
      "welcome",
      "register",
      "resolving",
      "duplicate",
      "closed",
      "error",
      "win",
      "lose",
    ] as const) {
      expect(renderOn(own).container.innerHTML, own).toBe("");
    }
  });

  it("shows a stand-in for the game while it plays, with the CTA of a game drawn first", () => {
    render(
      <PendingScreen
        flow={flowOn("play")}
        config={createDefaultExperience({ gameType: "lucky_wheel" })}
        campaign={createDemoCampaign("lucky_wheel")}
        locale="en"
        chrome={{ logoUrl: null, statusBadge: null, live: false }}
      />,
    );
    expect(screen.getByText(/Game engine/)).toBeTruthy();
    expect(screen.getByText("Spin the wheel")).toBeTruthy(); // the CTA
  });
});
