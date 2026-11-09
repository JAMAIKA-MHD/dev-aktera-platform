import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../../domain/defaults";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { ChooseBrandEngine } from "./ChooseBrandEngine";
import { ChooseBrandTeaser } from "./ChooseBrandTeaser";

// Pick Your Favorite ("winner stays"): one pick per duel, sent once after the last one with
// the champion, never a win decided here.

const campaign = createDemoCampaign("choose_brand");
const config = createDefaultExperience({ gameType: "choose_brand", campaign });
const contenders = config.game.chooseBrand!.contenders;
// The demo campaign has no count: the whole list plays, one duel fewer than products.
const duels = contenders.length - 1;
// A campaign whose Wizard plays 3 products.
const threeProducts = {
  ...campaign,
  rules: { choice: { count: 3, roundSeconds: 10 } },
};
// The shortest game: two products, one duel, on the shortest clock.
const twoProducts = {
  ...campaign,
  rules: { choice: { count: 2, roundSeconds: 5 } },
};

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
  it("starts with the first two products of a new campaign", () => {
    render(<ChooseBrandEngine {...engine("interacting")} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText(`1 / ${duels}`)).toBeTruthy();
    expect(screen.getByText(`Duel · 1/${duels}`)).toBeTruthy();
  });

  it("plays the campaign's count of products", () => {
    render(
      <ChooseBrandEngine
        {...engine("interacting", { campaign: threeProducts })}
      />,
    );
    expect(screen.getByText("Duel · 1/2")).toBeTruthy();
    expect(screen.getByText("1 / 2")).toBeTruthy();
  });

  it("sends every pick and the champion, once the last duel is played", () => {
    const props = engine("interacting", { campaign: threeProducts });
    render(<ChooseBrandEngine {...props} />);
    const [first, , third] = contenders;
    // 1 vs 2 → 1 (left, it stays there); 1 vs 3 → 3 (right): the final.
    fireEvent.click(side("left"));
    expect(props.onInteractionComplete).not.toHaveBeenCalled();
    advance(700);
    expect(screen.getByText("Finale")).toBeTruthy();
    fireEvent.click(side("right"));
    advance(700);
    expect(props.onInteractionComplete).toHaveBeenCalledTimes(1);
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "choices",
      picks: [
        {
          roundId: "m1",
          side: "left",
          label: first.label.fr,
          optionId: first.id,
        },
        {
          roundId: "m2",
          side: "right",
          label: third.label.fr,
          optionId: third.id,
        },
      ],
      champion: { optionId: third.id, label: third.label.fr },
    });
    expect(screen.getByText("Votre champion !")).toBeTruthy();
  });

  it("plays a game of two products as one final", () => {
    const props = engine("interacting", { campaign: twoProducts });
    render(<ChooseBrandEngine {...props} />);
    expect(screen.getByText("Finale")).toBeTruthy();
    expect(screen.getByText("1 / 1")).toBeTruthy();
    fireEvent.click(side("right"));
    advance(700);
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "choices",
      picks: [expect.objectContaining({ roundId: "m1", side: "right" })],
      champion: expect.objectContaining({ optionId: contenders[1].id }),
    });
  });

  it("gives each duel its own clock, restarted from the campaign's seconds", () => {
    const props = engine("interacting", { campaign: threeProducts });
    render(<ChooseBrandEngine {...props} />);
    expect(screen.getByRole("timer").textContent).toBe("10 s");
    advance(4000);
    expect(screen.getByRole("timer").textContent).toBe("6 s");
    fireEvent.click(side("left"));
    advance(700);
    expect(screen.getByRole("timer").textContent).toBe("10 s");
  });

  it("keeps the product on screen when the time runs out, without recording a pick", () => {
    const props = engine("interacting", { campaign: threeProducts });
    const { container } = render(<ChooseBrandEngine {...props} />);
    const [first] = contenders;
    // A pick in the first duel: product 1 stays on the left.
    fireEvent.click(side("left"));
    advance(700);
    advance(10100);
    // The product stays without a check (nobody picked it), the newcomer steps back, and the
    // badge and the question say the time is up.
    expect(
      container.querySelector('[data-xp-side="left"][data-xp-choice="idle"]'),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-xp-side="right"][data-xp-choice="dropped"]',
      ),
    ).toBeTruthy();
    expect(container.querySelector(".xp-choice-badge")).toBeNull();
    expect(
      container.querySelector("[data-xp-timeout].xp-choice-clock"),
    ).toBeTruthy();
    expect(screen.getByText("Temps écoulé !")).toBeTruthy();
    advance(1000);
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "choices",
      picks: [
        {
          roundId: "m1",
          side: "left",
          label: first.label.fr,
          optionId: first.id,
        },
      ],
      champion: { optionId: first.id, label: first.label.fr },
    });
  });

  it("reports no champion for a game where the player picked nothing", () => {
    const props = engine("interacting", { campaign: twoProducts });
    render(<ChooseBrandEngine {...props} />);
    advance(5100);
    advance(1000);
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "choices",
      picks: [],
      champion: null,
    });
  });

  it("counts the last three seconds down on the badge, in place of VS", () => {
    const { container } = render(
      <ChooseBrandEngine
        {...engine("interacting", { campaign: twoProducts })}
      />,
    );
    const badge = () => container.querySelector(".xp-choice-clock")!;
    expect(badge().textContent).toContain("VS");
    expect(badge().hasAttribute("data-xp-low")).toBe(false);
    advance(2100);
    expect(badge().hasAttribute("data-xp-low")).toBe(true);
    expect(container.querySelector(".xp-choice-second")?.textContent).toBe("3");
    advance(1000);
    expect(container.querySelector(".xp-choice-second")?.textContent).toBe("2");
  });

  it("runs no clock outside the player's turn", () => {
    render(<ChooseBrandEngine {...engine("awaiting-outcome")} />);
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("takes one pick per duel, even on a double tap", () => {
    const props = engine("interacting");
    render(<ChooseBrandEngine {...props} />);
    fireEvent.click(side("left"));
    fireEvent.click(side("right"));
    advance(700);
    expect(screen.getByText(`2 / ${duels}`)).toBeTruthy();
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
