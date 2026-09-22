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
  // The journey always gives a status screen its error (useExperienceFlow.test.tsx, and the
  // preview states of domain/flow.ts); the interim screen still reads without one.
  it("shows the default message of a status screen without its error", () => {
    renderOn("closed");
    expect(screen.getByText("Campaign ended")).toBeTruthy();
    expect(
      screen.getByText("This campaign has ended. Thank you for your interest!"),
    ).toBeTruthy();
  });

  it("leaves welcome and registration to their own screens (T4.2)", () => {
    expect(renderOn("welcome").container.innerHTML).toBe("");
    expect(renderOn("register").container.innerHTML).toBe("");
  });
});
