import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../../domain/defaults";
import type { DrawOutcome } from "../../../domain/participation";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { BoxesEngine } from "./BoxesEngine";
import { BoxesTeaser } from "./BoxesTeaser";

// The mystery boxes (tasks.md T5.4). The one thing to prove here: the prize never depends on
// the box that was picked — the prototype tied the gift to the index, which let the choice
// decide the outcome.

const campaign = createDemoCampaign("mystery_box");
const baseConfig = () =>
  createDefaultExperience({ gameType: "mystery_box", campaign });

const win = (index: number): DrawOutcome => ({
  isWinner: true,
  prize: {
    id: campaign.prizes[index].id,
    name: campaign.prizes[index].name,
    winMessage: null,
  },
  couponCode: "DEMO-0000-0000",
});

function engineProps(
  phase: GamePhase,
  overrides: Partial<GameEngineProps> = {},
): GameEngineProps {
  const config = overrides.config ?? baseConfig();
  return {
    settings: config.game,
    campaign,
    config,
    phase,
    outcome: null,
    onStart: vi.fn(),
    onInteractionComplete: vi.fn(),
    onRevealComplete: vi.fn(),
    reducedMotion: false,
    locale: "fr",
    ...overrides,
  };
}

const boxes = (container: HTMLElement) => [
  ...container.querySelectorAll("[data-xp-box]"),
];
const stateOf = (container: HTMLElement, index: number) =>
  boxes(container)[index].getAttribute("data-xp-box-state");

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("BoxesEngine", () => {
  it("shows the brand's three boxes, all closed and all pickable", () => {
    const { container } = render(
      <BoxesEngine {...engineProps("interacting")} />,
    );
    expect(boxes(container)).toHaveLength(3);
    expect(
      boxes(container).every(
        (box) => box.getAttribute("data-xp-box-state") === "closed",
      ),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("button")
        .every((button) => !("disabled" in button && button.disabled)),
    ).toBe(true);
  });

  it("sends the box that was picked, and only once", () => {
    const props = engineProps("interacting");
    render(<BoxesEngine {...props} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "boxes",
      selectedIndex: 1,
    });
    fireEvent.click(screen.getAllByRole("button")[2]); // a second thought, too late
    expect(props.onInteractionComplete).toHaveBeenCalledOnce();
  });

  it("shakes the box that was picked while the server answers", () => {
    const { container, rerender } = render(
      <BoxesEngine {...engineProps("interacting")} />,
    );
    fireEvent.click(screen.getAllByRole("button")[0]);
    rerender(<BoxesEngine {...engineProps("awaiting-outcome")} />);
    expect(stateOf(container, 0)).toBe("shaking");
    expect(stateOf(container, 1)).toBe("dimmed");
  });

  it("opens the picked box on the prize the server gave, whichever box that was", () => {
    // The same prize comes back for two different picks: the choice never decides it.
    for (const pick of [0, 2]) {
      const props = engineProps("interacting", { outcome: win(1) });
      const { container, rerender, unmount } = render(
        <BoxesEngine {...props} />,
      );
      fireEvent.click(screen.getAllByRole("button")[pick]);
      rerender(
        <BoxesEngine {...engineProps("revealing", { outcome: win(1) })} />,
      );
      expect(stateOf(container, pick)).toBe("open");
      expect(screen.getByText(campaign.prizes[1].name)).toBeTruthy();
      unmount();
    }
  });

  it("hands the journey back once the box has been seen open", () => {
    const props = engineProps("revealing", { outcome: win(0) });
    render(<BoxesEngine {...props} />);
    expect(props.onRevealComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
  });

  it("says a loss in the brand's own words", () => {
    const config = baseConfig();
    config.screens.lose.title = { fr: "Presque !" };
    const loss: DrawOutcome = {
      isWinner: false,
      prize: null,
      couponCode: null,
    };
    const { rerender } = render(
      <BoxesEngine
        {...engineProps("interacting", { config, outcome: loss })}
      />,
    );
    fireEvent.click(screen.getAllByRole("button")[0]);
    rerender(
      <BoxesEngine {...engineProps("revealing", { config, outcome: loss })} />,
    );
    expect(screen.getByText("Presque !")).toBeTruthy();
  });

  it("takes the brand's own icon, colour and number of boxes", () => {
    const config = baseConfig();
    config.game.boxes = { count: 3, icon: "gem", color: "#123456" };
    const { container } = render(
      <BoxesEngine {...engineProps("interacting", { config })} />,
    );
    expect(container.querySelector(".lucide-gem")).toBeTruthy();
    expect(container.innerHTML).toContain("#123456");
  });
});

describe("BoxesTeaser", () => {
  const teaserProps = (): GameTeaserProps => {
    const config = baseConfig();
    return {
      settings: config.game,
      campaign,
      config,
      locale: "fr",
      reducedMotion: false,
      active: true,
      onStart: vi.fn(),
      startLabel: "Lancer le jeu",
    };
  };

  it("shows the brand's boxes and its caption, and never opens one (rule 1)", () => {
    const props = teaserProps();
    const { container } = render(<BoxesTeaser {...props} />);
    expect(
      screen.getByRole("button", {
        name: "Lancer le jeu · Choisissez votre boîte",
      }),
    ).toBeTruthy();
    expect(boxes(container)).toHaveLength(3);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    // Whatever moment it is caught at, no lid has ever opened on anything.
    expect(
      boxes(container).some(
        (box) => box.getAttribute("data-xp-box-state") === "open",
      ),
    ).toBe(false);
    for (const prize of campaign.prizes) {
      expect(screen.queryByText(prize.name)).toBeNull();
    }
  });

  it("nudges one box after another, and stands still off screen or when fixed (rule 4)", () => {
    const props = teaserProps();
    const { container, rerender } = render(<BoxesTeaser {...props} />);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(
      boxes(container).some(
        (box) => box.getAttribute("data-xp-box-state") === "picked",
      ),
    ).toBe(true);

    rerender(<BoxesTeaser {...props} active={false} />);
    const frozen = boxes(container).map((box) =>
      box.getAttribute("data-xp-box-state"),
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(
      boxes(container).map((box) => box.getAttribute("data-xp-box-state")),
    ).toEqual(frozen);
  });

  it("starts the journey when touched, never a game (rule 2)", () => {
    const props = teaserProps();
    render(<BoxesTeaser {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(props.onStart).toHaveBeenCalledOnce();
  });
});
