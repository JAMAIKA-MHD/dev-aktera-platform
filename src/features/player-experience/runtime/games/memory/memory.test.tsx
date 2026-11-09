import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignRules, CampaignSnapshot } from "../../../domain/campaign";
import { createDefaultExperience } from "../../../domain/defaults";
import type { GameType } from "../../../domain/gameTypes";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { MemoryEngine } from "./MemoryEngine";
import { MemoryTeaser } from "./MemoryTeaser";

// Memory Match: it reports what the player did, once, and never decides a win.

function setup(gameType: GameType, rules: CampaignRules) {
  const campaign: CampaignSnapshot = { ...createDemoCampaign(gameType), rules };
  const config = createDefaultExperience({ gameType, campaign });
  const engine = (
    phase: GamePhase,
    overrides: Partial<GameEngineProps> = {},
  ): GameEngineProps => ({
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
  });
  const teaser = (
    overrides: Partial<GameTeaserProps> = {},
  ): GameTeaserProps => ({
    settings: config.game,
    campaign,
    config,
    locale: "fr",
    reducedMotion: false,
    active: true,
    onStart: vi.fn(),
    startLabel: "Lancer le jeu",
    ...overrides,
  });
  return { engine, teaser };
}

// In small steps, each one flushed: an effect that schedules the next timer (the 3-2-1) only
// runs once React has rendered the previous tick.
const advance = (ms: number, step = 100) => {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    act(() => {
      vi.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MemoryEngine", () => {
  const { engine, teaser } = setup("memory_match", {
    memory: { pairs: 3, durationSeconds: 30 },
  });

  const cardsByFace = () => {
    const groups = new Map<string, HTMLElement[]>();
    for (const button of screen.getAllByRole("button")) {
      const face = button
        .querySelector("[data-xp-face]")
        ?.getAttribute("data-xp-face");
      if (!face) continue;
      groups.set(face, [...(groups.get(face) ?? []), button]);
    }
    return [...groups.values()];
  };

  it("deals two cards for every pair of the campaign", () => {
    render(<MemoryEngine {...engine("interacting")} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(cardsByFace().every((pair) => pair.length === 2)).toBe(true);
  });

  it("reports pairs, moves and time once every pair is found", () => {
    const props = engine("interacting");
    render(<MemoryEngine {...props} />);
    for (const [a, b] of cardsByFace()) {
      fireEvent.click(a);
      fireEvent.click(b);
      advance(500);
    }
    advance(600);
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "memory", pairs: 3, moves: 3 }),
    );
  });

  it("turns a wrong pair back and counts it as a move", () => {
    const props = engine("interacting");
    const { container } = render(<MemoryEngine {...props} />);
    const [first, second] = cardsByFace();
    fireEvent.click(first[0]);
    fireEvent.click(second[0]);
    expect(container.querySelectorAll('[data-xp-card="up"]')).toHaveLength(2);
    advance(900);
    expect(container.querySelectorAll('[data-xp-card="up"]')).toHaveLength(0);
    expect(props.onInteractionComplete).not.toHaveBeenCalled();
  });

  it("reports what was found when the time runs out", () => {
    const props = engine("interacting");
    render(<MemoryEngine {...props} />);
    const [pair] = cardsByFace();
    fireEvent.click(pair[0]); // the clock starts on the first card
    advance(31_000, 1000);
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "memory", pairs: 0 }),
    );
  });

  it("takes no card outside the player's turn", () => {
    const props = engine("awaiting-outcome");
    render(<MemoryEngine {...props} />);
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("hands the reveal straight on", () => {
    const props = engine("revealing");
    render(<MemoryEngine {...props} />);
    expect(props.onRevealComplete).toHaveBeenCalled();
  });

  it("shows a still teaser, marked Démo, that starts the journey on a tap", () => {
    const props = teaser({ reducedMotion: true });
    render(<MemoryTeaser {...props} />);
    expect(screen.getByText("Démo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(props.onStart).toHaveBeenCalled();
  });
});
