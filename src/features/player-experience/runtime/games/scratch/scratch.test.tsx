import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../../domain/defaults";
import type { DrawOutcome } from "../../../domain/participation";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { ScratchEngine } from "./ScratchEngine";
import {
  createScratchMask,
  scratchAlong,
  scratchedPercent,
} from "./scratchMask";
import { ScratchTeaser } from "./ScratchTeaser";

// The scratch card (tasks.md T5.3). What has been scratched is counted on a normalized grid,
// never on the canvas's pixels: it can be checked here, and it survives any resize.

const campaign = createDemoCampaign("scratch_card");
const baseConfig = () =>
  createDefaultExperience({ gameType: "scratch_card", campaign });

const WIN: DrawOutcome = {
  isWinner: true,
  prize: {
    id: campaign.prizes[0].id,
    name: campaign.prizes[0].name,
    winMessage: null,
  },
  couponCode: "DEMO-0000-0000",
};

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

const cover = (container: HTMLElement) =>
  container.querySelector("[data-xp-scratch-cover]") as HTMLCanvasElement;

// A pointer drag across the card. jsdom gives every element a zero-sized box, so the size is
// stubbed: what is being checked is the normalized arithmetic, not jsdom's layout.
function scratch(canvas: HTMLCanvasElement, points: Array<[number, number]>) {
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 200 }) as DOMRect;
  canvas.setPointerCapture = () => {};
  fireEvent.pointerDown(canvas, {
    clientX: points[0][0],
    clientY: points[0][1],
    buttons: 1,
  });
  for (const [x, y] of points.slice(1)) {
    fireEvent.pointerMove(canvas, { clientX: x, clientY: y, buttons: 1 });
  }
  fireEvent.pointerUp(canvas);
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("scratchMask", () => {
  it("starts untouched and fills up as the card is scratched", () => {
    const mask = createScratchMask();
    expect(scratchedPercent(mask)).toBe(0);
    scratchAlong(mask, { x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.07);
    const afterOne = scratchedPercent(mask);
    expect(afterOne).toBeGreaterThan(0);
    scratchAlong(mask, { x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }, 0.07);
    expect(scratchedPercent(mask)).toBeGreaterThan(afterOne);
  });

  it("counts a cell once, however many times it is scratched over", () => {
    const mask = createScratchMask();
    scratchAlong(mask, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 0.1);
    const once = scratchedPercent(mask);
    for (let pass = 0; pass < 5; pass++) {
      scratchAlong(mask, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 0.1);
    }
    expect(scratchedPercent(mask)).toBe(once);
  });

  it("leaves a full line behind a fast swipe, not a dotted trail", () => {
    const fast = createScratchMask();
    scratchAlong(fast, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }, 0.05);
    const middle = Math.floor(0.5 * fast.resolution);
    const row = [
      ...fast.cells.slice(
        middle * fast.resolution,
        (middle + 1) * fast.resolution,
      ),
    ];
    expect(row.every((cell) => cell === 1)).toBe(true);
  });

  it("stays inside the card, whatever is scratched past its edge", () => {
    const mask = createScratchMask();
    scratchAlong(mask, { x: -3, y: -3 }, { x: 4, y: 4 }, 0.2);
    expect(scratchedPercent(mask)).toBeLessThanOrEqual(100);
    expect(mask.cells.length).toBe(mask.resolution * mask.resolution);
  });
});

describe("ScratchEngine", () => {
  it("shows the brand's cover, and the prize underneath once it is off", () => {
    const { container } = render(
      <ScratchEngine {...engineProps("revealing", { outcome: WIN })} />,
    );
    expect(screen.getAllByText("Grattez ici").length).toBeGreaterThan(0);
    // The prize is drawn under the cover, named exactly as the win screen will name it.
    expect(screen.getByText(campaign.prizes[0].name)).toBeTruthy();
    expect(cover(container)).toBeTruthy();
  });

  it("uncovers the card once the brand's threshold is reached, and hands the journey back", () => {
    const props = engineProps("revealing", { outcome: WIN });
    const { container } = render(<ScratchEngine {...props} />);
    // A few sweeps, enough to pass the 50 % of the demo configuration.
    for (let row = 0; row < 6; row++) {
      scratch(
        cover(container),
        Array.from({ length: 12 }, (_, step) => [step * 27, 10 + row * 32]),
      );
    }
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
  });

  it("does not hand the journey back before the threshold", () => {
    const props = engineProps("revealing", { outcome: WIN });
    const { container } = render(<ScratchEngine {...props} />);
    scratch(cover(container), [
      [10, 10],
      [30, 12],
    ]);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(props.onRevealComplete).not.toHaveBeenCalled();
  });

  it("can always be uncovered without scratching, for a keyboard or a screen reader", () => {
    const props = engineProps("revealing", { outcome: WIN });
    render(<ScratchEngine {...props} />);
    fireEvent.click(screen.getByText("Révéler"));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
  });

  it("ignores a pointer that is only hovering, and one before the draw", () => {
    const waiting = engineProps("idle");
    const { container, unmount } = render(<ScratchEngine {...waiting} />);
    scratch(
      cover(container),
      Array.from({ length: 12 }, (_, step) => [step * 27, 100]),
    );
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(waiting.onRevealComplete).not.toHaveBeenCalled();
    expect(screen.queryByText("Révéler")).toBeNull(); // nothing to reveal yet
    unmount();

    const playing = engineProps("revealing", { outcome: WIN });
    const second = render(<ScratchEngine {...playing} />);
    const canvas = cover(second.container);
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 200 }) as DOMRect;
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 100, buttons: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(playing.onRevealComplete).not.toHaveBeenCalled();
  });

  it("launches the draw from the card, like the CTA does", () => {
    const props = engineProps("idle");
    render(<ScratchEngine {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Grattez ici" }));
    expect(props.onStart).toHaveBeenCalledOnce();
  });

  it("says a loss in the brand's own words, never one of its own", () => {
    const loss: DrawOutcome = {
      isWinner: false,
      prize: null,
      couponCode: null,
    };
    const config = baseConfig();
    config.screens.lose.title = { fr: "Presque !" };
    render(
      <ScratchEngine
        {...engineProps("revealing", { config, outcome: loss })}
      />,
    );
    expect(screen.getByText("Presque !")).toBeTruthy();
  });
});

describe("ScratchTeaser", () => {
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

  it("shows the brand's ticket and its caption, and never a prize (rule 1)", () => {
    const props = teaserProps();
    const { container } = render(<ScratchTeaser {...props} />);
    expect(
      screen.getByRole("button", {
        name: "Lancer le jeu · Grattez pour découvrir votre surprise",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Grattez ici").length).toBeGreaterThan(0);
    for (const prize of campaign.prizes) {
      expect(screen.queryByText(prize.name)).toBeNull();
    }
    expect(container.querySelector("[data-xp-scratch-coin]")).toBeTruthy();
  });

  it("starts the journey when touched, never a game (rule 2)", () => {
    const props = teaserProps();
    render(<ScratchTeaser {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(props.onStart).toHaveBeenCalledOnce();
  });

  it("moves its coin on its own, and stands still off screen or when fixed (rule 4)", () => {
    const props = teaserProps();
    const { container, rerender } = render(<ScratchTeaser {...props} />);
    const coin = () =>
      (container.querySelector("[data-xp-scratch-coin]") as HTMLElement).style
        .insetInlineStart;
    const start = coin();
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(coin()).not.toBe(start);

    rerender(<ScratchTeaser {...props} active={false} />);
    const paused = coin();
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(coin()).toBe(paused);

    rerender(<ScratchTeaser {...props} reducedMotion />);
    const stillCoin = container.querySelector(
      "[data-xp-scratch-coin]",
    ) as HTMLElement;
    expect(stillCoin.style.opacity).toBe("0"); // a plain ticket, no coin at all
  });
});
