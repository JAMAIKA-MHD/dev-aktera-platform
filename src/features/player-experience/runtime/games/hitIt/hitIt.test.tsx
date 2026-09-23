import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { createDefaultExperience } from "../../../domain/defaults";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { HitItEngine } from "./HitItEngine";
import { HitItTeaser } from "./HitItTeaser";

// Hit It (tasks.md T5.6): the count is the engine's only job, and the campaign's own rules
// are what the player is told. Whether the count wins is the server's business.

const RULES = { winThreshold: 8, durationSeconds: 10 };
const campaign: CampaignSnapshot = {
  ...createDemoCampaign("hit_it"),
  rules: { hitIt: RULES },
};
const baseConfig = () =>
  createDefaultExperience({ gameType: "hit_it", campaign });

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

const field = () => screen.getByRole("button");
const score = (container: HTMLElement) =>
  container.querySelector("[data-xp-hit-score]")?.textContent;
const target = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-xp-hit-target]");

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HitItEngine", () => {
  it("shows the campaign's own goal and clock, from the first frame", () => {
    const { container } = render(
      <HitItEngine {...engineProps("interacting")} />,
    );
    expect(score(container)).toBe(`0 / ${RULES.winThreshold}`);
    expect(
      screen.getByText(`${RULES.winThreshold} · ${RULES.durationSeconds}s`),
    ).toBeTruthy();
    expect(target(container)).toBeTruthy();
  });

  it("counts a hit and moves the target somewhere else on the field", () => {
    const { container } = render(
      <HitItEngine {...engineProps("interacting")} />,
    );
    const before = target(container)?.style.insetInlineStart;
    fireEvent.pointerDown(field());
    expect(score(container)).toBe(`1 / ${RULES.winThreshold}`);
    expect(target(container)?.style.insetInlineStart).not.toBe(before);
  });

  it("can be played from the keyboard as well as by hand (D19)", () => {
    const { container } = render(
      <HitItEngine {...engineProps("interacting")} />,
    );
    fireEvent.keyDown(field(), { key: " " });
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.keyDown(field(), { key: "a" }); // anything else counts for nothing
    expect(score(container)).toBe(`2 / ${RULES.winThreshold}`);
  });

  it("keeps the target inside the field, wherever chance puts it", () => {
    const { container } = render(
      <HitItEngine {...engineProps("interacting")} />,
    );
    for (const draw of [0, 0.5, 0.999]) {
      vi.spyOn(Math, "random").mockReturnValue(draw);
      fireEvent.pointerDown(field());
      const spot = target(container);
      for (const value of [spot?.style.insetInlineStart, spot?.style.top]) {
        const percent = Number.parseFloat(value ?? "");
        expect(percent).toBeGreaterThanOrEqual(10);
        expect(percent).toBeLessThanOrEqual(90);
      }
    }
  });

  it("sends the count when the round's time is up, once and only once", () => {
    const props = engineProps("interacting");
    render(<HitItEngine {...props} />);
    for (let hit = 0; hit < 5; hit++) fireEvent.pointerDown(field());
    act(() => {
      vi.advanceTimersByTime(RULES.durationSeconds * 1000 + 200);
    });
    expect(props.onInteractionComplete).toHaveBeenCalledOnce();
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "hitIt",
      hits: 5,
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(props.onInteractionComplete).toHaveBeenCalledOnce();
  });

  it("counts nothing once the round is over", () => {
    const props = engineProps("interacting");
    const { container } = render(<HitItEngine {...props} />);
    act(() => {
      vi.advanceTimersByTime(RULES.durationSeconds * 1000 + 200);
    });
    fireEvent.pointerDown(field());
    expect(score(container)).toBe(`0 / ${RULES.winThreshold}`);
  });

  it("never says whether the count won: it hands the reveal straight back", () => {
    const props = engineProps("revealing");
    render(<HitItEngine {...props} />);
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
    expect(screen.queryByText(/gagn/i)).toBeNull();
  });

  it("takes the brand's own target icon", () => {
    const config = baseConfig();
    config.game.hitIt = { targetIcon: "zap", targetImage: null };
    const { container } = render(
      <HitItEngine {...engineProps("interacting", { config })} />,
    );
    expect(container.querySelector(".lucide-zap")).toBeTruthy();
  });
});

describe("HitItTeaser", () => {
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

  it("is plainly marked as a demonstration, with the campaign's own goal", () => {
    const { container } = render(<HitItTeaser {...teaserProps()} />);
    expect(screen.getByText("Démo")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `Lancer le jeu · ${RULES.winThreshold} touches en ${RULES.durationSeconds} s`,
      }),
    ).toBeTruthy();
    expect(score(container)).toBe(`0 / ${RULES.winThreshold}`);
  });

  it("hops its target and climbs its count on its own, then starts over", () => {
    const { container } = render(<HitItTeaser {...teaserProps()} />);
    const STEP_MS = 620;
    const ROUND_STEPS = 9;
    const start = target(container)?.style.insetInlineStart;
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    expect(target(container)?.style.insetInlineStart).not.toBe(start);
    expect(score(container)).not.toBe(`0 / ${RULES.winThreshold}`);
    act(() => {
      vi.advanceTimersByTime(STEP_MS * (ROUND_STEPS - 1));
    });
    expect(score(container)).toBe(`0 / ${RULES.winThreshold}`); // a new round
  });

  it("stands still off screen, and counts for nothing when touched (rules 2 and 4)", () => {
    const props = teaserProps();
    const { container, rerender } = render(<HitItTeaser {...props} />);
    rerender(<HitItTeaser {...props} active={false} />);
    const frozen = target(container)?.style.insetInlineStart;
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(target(container)?.style.insetInlineStart).toBe(frozen);

    fireEvent.click(screen.getByRole("button"));
    expect(props.onStart).toHaveBeenCalledOnce(); // the journey, never a round
  });
});
