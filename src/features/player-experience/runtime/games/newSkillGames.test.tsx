import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignRules, CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import type { GameType } from "../../domain/gameTypes";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { CatchEngine } from "./catchIt/CatchEngine";
import { CatchTeaser } from "./catchIt/CatchTeaser";
import { MemoryEngine } from "./memory/MemoryEngine";
import { MemoryTeaser } from "./memory/MemoryTeaser";
import { SpotEngine } from "./spot/SpotEngine";
import { SpotTeaser } from "./spot/SpotTeaser";
import { buildScene } from "./spot/spotScene";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "./types";

// The three newer skill games: each reports what the player did, once, and never decides a win.

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

describe("CatchEngine", () => {
  const { engine, teaser } = setup("catch_it", {
    catchIt: { winThreshold: 3, durationSeconds: 20 },
  });

  it("counts down before anything falls", () => {
    const { container } = render(<CatchEngine {...engine("interacting")} />);
    expect(container.querySelector("[data-xp-countdown]")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    advance(3 * 800 + 50);
    expect(container.querySelector("[data-xp-countdown]")).toBeNull();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("ends the round at the goal and reports what was caught", () => {
    const props = engine("interacting");
    const { container } = render(<CatchEngine {...props} />);
    advance(3 * 800 + 50);
    for (let i = 0; i < 3; i++) {
      fireEvent.pointerDown(screen.getAllByRole("button")[0]);
      advance(1200); // the next item comes
    }
    expect(container.querySelector("[data-xp-hit-score]")?.textContent).toBe(
      "3 / 3",
    );
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "catch", caught: 3 }),
    );
  });

  it("reports a miss when the clock runs out with nothing caught", () => {
    const props = engine("interacting");
    render(<CatchEngine {...props} />);
    advance(3 * 800 + 50);
    advance(21_000, 1000);
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "catch", caught: 0 }),
    );
  });

  it("catches nothing outside the player's turn", () => {
    const props = engine("idle");
    render(<CatchEngine {...props} />);
    advance(5000);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("draws a still teaser with reduced motion", () => {
    const props = teaser({ reducedMotion: true });
    const { container } = render(<CatchTeaser {...props} />);
    expect(screen.getByText("Démo")).toBeTruthy();
    expect(container.querySelectorAll("[data-xp-catch-item]")).toHaveLength(3);
  });
});

describe("SpotEngine", () => {
  const { engine, teaser } = setup("spot_difference", {
    spot: { differences: 3, durationSeconds: 30 },
  });

  // The cells whose content differs between picture A and picture B.
  const differences = (container: HTMLElement) => {
    const [a, b] = container.querySelectorAll("[data-xp-spot-panel]");
    const cellsA = [...a.querySelectorAll("button")];
    const cellsB = [...b.querySelectorAll("button")];
    return cellsB.filter((cell, i) => cell.innerHTML !== cellsA[i].innerHTML);
  };

  it("hides exactly the campaign's number of differences", () => {
    const { container } = render(<SpotEngine {...engine("interacting")} />);
    expect(differences(container)).toHaveLength(3);
  });

  it("reports what was found once every difference is found", () => {
    const props = engine("interacting");
    const { container } = render(<SpotEngine {...props} />);
    for (const cell of differences(container)) fireEvent.click(cell);
    advance(600);
    expect(container.querySelector("[data-xp-hit-score]")?.textContent).toBe(
      "3 / 3",
    );
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "spot", found: 3 }),
    );
  });

  it("charges a wrong tap and does not count it", () => {
    const props = engine("interacting");
    const { container } = render(<SpotEngine {...props} />);
    const [a] = container.querySelectorAll("[data-xp-spot-panel]");
    const hidden = new Set(
      differences(container).map((cell) => cell.getAttribute("aria-label")),
    );
    const wrong = [...a.querySelectorAll("button")].find(
      (cell) => !hidden.has(cell.getAttribute("aria-label")),
    ) as HTMLElement;
    fireEvent.click(wrong);
    expect(container.querySelector("[data-xp-hit-score]")?.textContent).toBe(
      "0 / 3",
    );
    expect(props.onInteractionComplete).not.toHaveBeenCalled();
  });

  it("reports what was found when the time runs out", () => {
    const props = engine("interacting");
    render(<SpotEngine {...props} />);
    advance(31_000, 1000);
    expect(props.onInteractionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "spot", found: 0 }),
    );
  });

  it("draws a still teaser with reduced motion", () => {
    const props = teaser({ reducedMotion: true });
    const { container } = render(<SpotTeaser {...props} />);
    expect(screen.getByText("Démo")).toBeTruthy();
    expect(container.querySelectorAll("[data-xp-spot-panel]")).toHaveLength(2);
  });
});

describe("buildScene", () => {
  it("changes exactly the asked number of distinct cells", () => {
    const scene = buildScene(["star", "gem", "gift"], 5, 4, 4);
    expect(scene.differences).toHaveLength(5);
    expect(new Set(scene.differences.map((d) => d.cell)).size).toBe(5);
    const changed = scene.b
      .map((cell, i) => JSON.stringify(cell) !== JSON.stringify(scene.a[i]))
      .filter(Boolean);
    expect(changed).toHaveLength(5);
  });

  it("still changes a cell when the palette has a single icon", () => {
    const scene = buildScene(["star"], 3, 4, 4);
    const changed = scene.b.filter(
      (cell, i) => JSON.stringify(cell) !== JSON.stringify(scene.a[i]),
    );
    expect(changed).toHaveLength(3);
  });
});
