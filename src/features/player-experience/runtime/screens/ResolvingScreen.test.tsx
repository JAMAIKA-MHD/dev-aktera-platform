import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createInitialFlowState } from "../../domain/flow";
import type { Locale } from "../../domain/locale";
import { createDemoCampaign } from "../../presets/demoCampaign";
import type { ExperienceFlow } from "../useExperienceFlow";
import { ResolvingScreen } from "./ResolvingScreen";

// The wait while a draw is in flight (tasks.md T4.3): a turning indicator, the play screen's
// content, and nothing to press. Leaving here would drop the draw's result (domain/flow.ts,
// LOCKED_SCREENS): there is no CTA to offer, but the legal footer of the frame stays (B9).

const render_ = (locale: Locale) => {
  const config = createDefaultExperience({ gameType: "lucky_wheel" });
  const flow = {
    state: {
      ...createInitialFlowState("lucky_wheel", { startedAt: 0 }),
      screen: "resolving",
    },
    track: vi.fn(),
  } as unknown as ExperienceFlow;
  return render(
    <ResolvingScreen
      flow={flow}
      config={config}
      campaign={createDemoCampaign("lucky_wheel")}
      locale={locale}
      chrome={{ logoUrl: null, statusBadge: "Demo", live: true }}
    />,
  );
};

describe("ResolvingScreen", () => {
  it("shows a turning indicator and the waiting message, announced to screen readers", () => {
    const { container } = render_("fr");
    expect(screen.getByRole("status").textContent).toBe(
      "Préparation de votre partie…",
    );
    expect(container.querySelector(".xp-spin")).toBeTruthy();
  });

  it("gives the message in the three languages", () => {
    expect(
      within(render_("ar").container).getByRole("status").textContent,
    ).toBe("جارٍ تحضير لعبتك…");
    expect(
      within(render_("en").container).getByRole("status").textContent,
    ).toBe("Getting your game ready…");
  });

  it("offers nothing to press: the draw is already under way", () => {
    const { container } = render_("fr");
    expect(container.querySelector('[data-xp-slot="cta"]')).toBeNull();
  });

  it("is not a dead end: the legal footer stays", () => {
    render_("fr");
    expect(screen.getByText("Règlement")).toBeTruthy();
  });

  it("draws the play screen's content, open to the Studio's field", () => {
    const { container } = render_("fr");
    expect(
      container.querySelector('[data-xp-edit="screens.play.title"]'),
    ).toBeTruthy();
  });
});
