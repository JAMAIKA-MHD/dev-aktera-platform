import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createInitialFlowState } from "../../domain/flow";
import type { ExperienceFlow } from "../useExperienceFlow";
import { PendingScreen } from "./PendingScreen";

// The journey always gives a status screen its error (useExperienceFlow.test.tsx, and the
// preview states of domain/flow.ts); the interim screen still reads without one.
describe("PendingScreen", () => {
  it("shows the default message of a status screen without its error", () => {
    const flow = {
      state: {
        ...createInitialFlowState("lucky_wheel", { startedAt: 0 }),
        screen: "closed",
      },
      track: vi.fn(),
    } as unknown as ExperienceFlow;
    render(
      <PendingScreen
        flow={flow}
        config={createDefaultExperience({ gameType: "lucky_wheel" })}
        locale="en"
        chrome={{ logoUrl: null, statusBadge: null, live: false }}
      />,
    );
    expect(screen.getByText("Campaign ended")).toBeTruthy();
    expect(
      screen.getByText("This campaign has ended. Thank you for your interest!"),
    ).toBeTruthy();
  });
});
