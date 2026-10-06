import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../../domain/defaults";
import type { DrawOutcome } from "../../../domain/participation";
import type { ExperienceConfig } from "../../../domain/types";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import { runtimeAudio } from "../../feedback/audio";
import type { GameEngineProps, GamePhase } from "../types";
import { WheelEngine } from "./WheelEngine";
import { WheelTeaser } from "./WheelTeaser";

// The wheel (tasks.md T5.2): the same drawing for the game and its pregame teaser, an angle
// that never re-renders the segments, and a landing that only ever reads the outcome it was
// handed. The landing's own arithmetic is checked in wheelMath.test.ts.

const campaign = createDemoCampaign("lucky_wheel");
const baseConfig = () =>
  createDefaultExperience({ gameType: "lucky_wheel", campaign });

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

const rotor = (container: HTMLElement) =>
  container.querySelector("svg > g") as SVGGElement;
const rotationOf = (container: HTMLElement) =>
  Number(/rotate\(([-\d.]+)deg\)/.exec(rotor(container).style.transform)?.[1]);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WheelEngine", () => {
  it("draws the campaign's own segments, with the prize names the win screen would use", () => {
    const { container } = render(<WheelEngine {...engineProps("idle")} />);
    const labels = [...container.querySelectorAll("text")].map(
      (text) => text.textContent,
    );
    for (const prize of campaign.prizes.slice(0, 3)) {
      expect(labels).toContain(prize.name);
    }
    expect(labels).toContain("JOUER"); // the hub, from the configuration
  });

  it("is the button while it waits, and fires the same event as the CTA", () => {
    const props = engineProps("idle");
    render(<WheelEngine {...props} />);
    fireEvent.click(screen.getByLabelText("JOUER"));
    expect(props.onStart).toHaveBeenCalledOnce();
  });

  it("is no longer a button once it turns: pressing it again would change nothing", () => {
    render(<WheelEngine {...engineProps("awaiting-outcome")} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("turns while the draw is in flight, without waiting for the outcome", () => {
    const { container } = render(
      <WheelEngine {...engineProps("awaiting-outcome")} />,
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(rotationOf(container)).toBeGreaterThan(0);
  });

  it("lands on a segment carrying the prize won, then hands the journey back", () => {
    const props = engineProps("revealing", { outcome: WIN });
    const { container } = render(<WheelEngine {...props} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
    // Which segment sits under the pointer at 12 o'clock, once the wheel has stopped.
    const segments = props.settings.wheel?.segments ?? [];
    const angle = 360 / segments.length;
    const facing = (((-90 - rotationOf(container)) % 360) + 360) % 360;
    const landed = segments[Math.floor(facing / angle) % segments.length];
    expect(landed.prizeId).toBe(campaign.prizes[0].id);
  });

  it("ticks as the segments go past, and stays silent with reduced motion", () => {
    const play = vi.spyOn(runtimeAudio, "play");
    const { unmount } = render(
      <WheelEngine {...engineProps("revealing", { outcome: WIN })} />,
    );
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(play).toHaveBeenCalledWith("tick");
    unmount();

    play.mockClear();
    const still = engineProps("revealing", {
      outcome: WIN,
      reducedMotion: true,
    });
    render(<WheelEngine {...still} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(play).not.toHaveBeenCalled();
    expect(still.onRevealComplete).toHaveBeenCalledOnce(); // the result is still reached
  });

  it("never leaves the journey stuck, even on a wheel without a single segment", () => {
    const config = baseConfig();
    config.game.wheel = { segments: [], hubLabel: {} };
    const props = engineProps("revealing", { config, outcome: WIN });
    render(<WheelEngine {...props} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
  });

  it("keeps the angle a resize cannot touch: the spin goes on from where it was", () => {
    const { container, rerender } = render(
      <WheelEngine {...engineProps("awaiting-outcome")} />,
    );
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const turned = rotationOf(container);
    // A resize re-renders the engine; nothing about the angle is held in the markup.
    rerender(<WheelEngine {...engineProps("awaiting-outcome")} />);
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(rotationOf(container)).toBeGreaterThanOrEqual(turned);
  });
});

describe("WheelFace, drawn from the configuration", () => {
  it("takes a segment's own colour, icon and label over the prize's", () => {
    const config = baseConfig();
    const segments = config.game.wheel?.segments ?? [];
    segments[0] = {
      ...segments[0],
      color: "#123456", // a brand's own colour is data, not a colour written in the runtime
      icon: "gem",
      label: { fr: "Lot maison" },
    };
    const { container } = render(
      <WheelEngine {...engineProps("idle", { config })} />,
    );
    const slice = container.querySelector("path");
    expect(slice?.getAttribute("fill")).toBe("#123456");
    expect(
      [...container.querySelectorAll("text")].map((text) => text.textContent),
    ).toContain("Lot maison");
    expect(container.querySelector(".lucide-gem")).toBeTruthy();
  });

  it("cuts a label too long to sit on its slice, rather than letting it spill", () => {
    const config = baseConfig();
    const segments = config.game.wheel?.segments ?? [];
    segments[0] = {
      ...segments[0],
      label: { fr: "Un libellé bien trop long pour une part" },
    };
    const { container } = render(
      <WheelEngine {...engineProps("idle", { config })} />,
    );
    const labels = [...container.querySelectorAll("text")].map(
      (text) => text.textContent ?? "",
    );
    expect(labels).toContain("Un libellé bi…");
  });

  it("tells a losing segment apart from a prize, whatever the preset", () => {
    const { container } = render(<WheelEngine {...engineProps("idle")} />);
    const segments = engineProps("idle").settings.wheel?.segments ?? [];
    const fills = [...container.querySelectorAll("path")].map((path) =>
      path.getAttribute("fill"),
    );
    segments.forEach((segment, index) => {
      if (segment.prizeId === null) {
        expect(fills[index]).toContain("var(--xp-text)"); // quiet, never a brand colour
      } else {
        expect(fills[index]).toMatch(/var\(--xp-(primary|secondary|accent)\)/);
      }
    });
  });
});

describe("WheelTeaser", () => {
  const teaserProps = (overrides: Partial<ExperienceConfig> = {}) => {
    const config = { ...baseConfig(), ...overrides };
    return {
      settings: config.game,
      campaign,
      config,
      locale: "fr" as const,
      reducedMotion: false,
      active: true,
      onStart: vi.fn(),
      startLabel: "Lancer le jeu",
    };
  };

  it("shows the very wheel that will be played, and its automatic caption", () => {
    const { container } = render(<WheelTeaser {...teaserProps()} />);
    const labels = [...container.querySelectorAll("text")].map(
      (text) => text.textContent,
    );
    expect(labels).toContain(campaign.prizes[0].name);
    expect(
      screen.getByRole("button", {
        name: `Lancer le jeu · ${campaign.prizes.length} lots à gagner`,
      }),
    ).toBeTruthy();
  });

  it("starts the journey when touched, never a game (rule 2)", () => {
    const props = teaserProps();
    render(<WheelTeaser {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(props.onStart).toHaveBeenCalledOnce();
  });

  it("drifts on its own, and never slows to a stop on a segment (rule 1)", () => {
    const { container } = render(<WheelTeaser {...teaserProps()} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const first = rotationOf(container);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(first).toBeGreaterThan(0);
    expect(rotationOf(container)).toBeGreaterThan(first); // still going
  });

  it("stands still off screen, and goes on from there when it comes back (rule 4)", () => {
    const props = teaserProps();
    const { container, rerender } = render(
      <WheelTeaser {...props} active={false} />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(rotor(container).style.transform).toBe("");
    rerender(<WheelTeaser {...props} active />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(rotationOf(container)).toBeGreaterThan(0);
  });

  it("stands still with reduced motion, and on a teaser set to a still image", () => {
    for (const props of [
      { ...teaserProps(), reducedMotion: true },
      (() => {
        const still = teaserProps();
        still.settings.teaser.mode = "static";
        return still;
      })(),
    ]) {
      const { container, unmount } = render(<WheelTeaser {...props} />);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(rotor(container).style.transform).toBe("");
      unmount();
    }
  });
});
