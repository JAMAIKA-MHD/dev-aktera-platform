import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../../domain/defaults";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { ChooseBrandEngine } from "./ChooseBrandEngine";
import { ChooseBrandTeaser } from "./ChooseBrandTeaser";

// Choose Your Brand: one pick per round, sent once after the last one, never a win decided here.

const campaign = createDemoCampaign("choose_brand");
const config = createDefaultExperience({ gameType: "choose_brand", campaign });
const rounds = config.game.chooseBrand!.rounds;

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

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const side = (name: "left" | "right") =>
  screen
    .getAllByRole("button")
    .find((button) => button.querySelector(`[data-xp-side="${name}"]`))!;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ChooseBrandEngine", () => {
  it("starts with the default rounds of a new campaign", () => {
    expect(rounds.length).toBeGreaterThanOrEqual(2);
    render(<ChooseBrandEngine {...engine("interacting")} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText(`1 / ${rounds.length}`)).toBeTruthy();
  });

  it("sends every pick, in order, once the last round is played", () => {
    const props = engine("interacting");
    render(<ChooseBrandEngine {...props} />);
    const order = rounds.map((_, index) =>
      index % 2 === 0 ? "left" : "right",
    );
    for (const picked of order) {
      fireEvent.click(side(picked));
      expect(props.onInteractionComplete).not.toHaveBeenCalled();
      advance(700);
    }
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "choices",
      picks: rounds.map((round, index) => ({
        roundId: round.id,
        side: order[index],
        label: round[order[index]].label.fr,
      })),
    });
  });

  it("takes one pick per round, even on a double tap", () => {
    const props = engine("interacting");
    render(<ChooseBrandEngine {...props} />);
    fireEvent.click(side("left"));
    fireEvent.click(side("right"));
    advance(700);
    expect(screen.getByText(`2 / ${rounds.length}`)).toBeTruthy();
  });

  it("picks with the arrow keys too", () => {
    const props = engine("interacting");
    const { container } = render(<ChooseBrandEngine {...props} />);
    const duel = container.querySelector('[dir="ltr"]')!;
    fireEvent.keyDown(duel, { key: "ArrowRight" });
    expect(
      container.querySelector(
        '[data-xp-side="right"][data-xp-choice="picked"]',
      ),
    ).toBeTruthy();
  });

  it("takes no pick outside the player's turn", () => {
    render(<ChooseBrandEngine {...engine("awaiting-outcome")} />);
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("hands the reveal on", () => {
    const props = engine("revealing", { reducedMotion: true });
    render(<ChooseBrandEngine {...props} />);
    advance(0);
    expect(props.onRevealComplete).toHaveBeenCalled();
  });
});

describe("ChooseBrandTeaser", () => {
  it("shows a still teaser, marked Démo, that starts the journey on a tap", () => {
    const onStart = vi.fn();
    const props: GameTeaserProps = {
      settings: config.game,
      campaign,
      config,
      locale: "fr",
      reducedMotion: true,
      active: true,
      onStart,
      startLabel: "Lancer le jeu",
    };
    render(<ChooseBrandTeaser {...props} />);
    expect(screen.getByText("Démo")).toBeTruthy();
    expect(screen.getByText("Classique")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(onStart).toHaveBeenCalled();
  });
});
