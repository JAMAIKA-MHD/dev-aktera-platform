import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../../domain/defaults";
import { quizSourceHash } from "../../../domain/display";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import type { GameEngineProps, GamePhase, GameTeaserProps } from "../types";
import { QuizEngine } from "./QuizEngine";
import { QuizTeaser } from "./QuizTeaser";

// The quiz (tasks.md T5.5). Two things matter here: the answers that leave the browser are
// the same whatever language they were read in, and no correct answer is ever on screen —
// the engine is not even given one.

const campaign = createDemoCampaign("quiz");
const baseConfig = () =>
  createDefaultExperience({ gameType: "quiz", campaign });

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

// Answers every question by picking the option at `choice`, as a player would.
function answerAll(choice: number) {
  for (let asked = 0; asked < campaign.quiz.length; asked++) {
    fireEvent.click(screen.getAllByRole("button")[choice]);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("QuizEngine", () => {
  it("asks the campaign's own questions, one at a time, with a counter", () => {
    render(<QuizEngine {...engineProps("interacting")} />);
    expect(screen.getByText(campaign.quiz[0].text)).toBeTruthy();
    expect(screen.getByText(`1 / ${campaign.quiz.length}`)).toBeTruthy();
    expect(screen.queryByText(campaign.quiz[1].text)).toBeNull(); // one at a time
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText(campaign.quiz[1].text)).toBeTruthy();
    expect(screen.getByText(`2 / ${campaign.quiz.length}`)).toBeTruthy();
  });

  it("sends the answers by question id and option position, once", () => {
    const props = engineProps("interacting");
    render(<QuizEngine {...props} />);
    answerAll(1);
    expect(props.onInteractionComplete).toHaveBeenCalledOnce();
    expect(props.onInteractionComplete).toHaveBeenCalledWith({
      kind: "quiz",
      answers: Object.fromEntries(campaign.quiz.map(({ id }) => [id, 1])),
    });
  });

  it("sends the very same answers in French and in Arabic", () => {
    const translated = baseConfig();
    // A brand translated the first question and its options into Arabic.
    const [first] = campaign.quiz;
    translated.game.quiz = {
      translations: {
        [first.id]: {
          sourceHash: quizSourceHash(first),
          text: { ar: "سؤال مترجم" },
          options: first.options.map((_, index) => ({
            ar: `خيار ${index}`,
          })),
        },
      },
    };

    const sent: unknown[] = [];
    for (const locale of ["fr", "ar"] as const) {
      const props = engineProps("interacting", {
        config: translated,
        locale,
        onInteractionComplete: (payload) => sent.push(payload),
      });
      const { unmount } = render(<QuizEngine {...props} />);
      if (locale === "ar") expect(screen.getByText("سؤال مترجم")).toBeTruthy();
      answerAll(2); // the third option on every question, whatever it reads
      unmount();
    }
    expect(sent[0]).toEqual(sent[1]);
  });

  it("never has a correct answer to show: the campaign it is given holds none", () => {
    render(<QuizEngine {...engineProps("interacting")} />);
    for (const question of campaign.quiz) {
      expect(Object.keys(question)).toEqual(["id", "text", "options"]);
    }
    expect(document.body.innerHTML).not.toContain("correct");
  });

  it("moves on when a question's time runs out, and counts it as unanswered", () => {
    const timed = {
      ...campaign,
      rules: { quiz: { passThresholdPercent: 50, secondsPerQuestion: 2 } },
    };
    const props = engineProps("interacting", { campaign: timed });
    render(<QuizEngine {...props} />);
    fireEvent.click(screen.getAllByRole("button")[0]); // the first one answered
    // One question at a time: each clock is only started once the previous one has run out
    // and React has rendered the question that follows.
    for (let left = 1; left < campaign.quiz.length; left++) {
      act(() => {
        vi.advanceTimersByTime(2100);
      });
    }
    expect(props.onInteractionComplete).toHaveBeenCalledOnce();
    const [payload] = vi.mocked(props.onInteractionComplete).mock.calls[0];
    // Only the question that was actually answered is sent: the server counts the rest wrong.
    expect(payload).toEqual({
      kind: "quiz",
      answers: { [campaign.quiz[0].id]: 0 },
    });
  });

  it("shows the timer only when the campaign has one", () => {
    const { container, unmount } = render(
      <QuizEngine {...engineProps("interacting")} />,
    );
    // The demo campaign has no timer by default.
    expect(container.querySelector("[data-xp-quiz-timer]")).toBeNull();
    unmount();

    const timed = {
      ...campaign,
      rules: { quiz: { passThresholdPercent: 50, secondsPerQuestion: 15 } },
    };
    const second = render(
      <QuizEngine {...engineProps("interacting", { campaign: timed })} />,
    );
    expect(second.container.querySelector("[data-xp-quiz-timer]")).toBeTruthy();
  });

  it("hands the journey back at once: a quiz has no reveal of its own", () => {
    const props = engineProps("revealing");
    render(<QuizEngine {...props} />);
    expect(props.onRevealComplete).toHaveBeenCalledOnce();
  });

  it("accepts no answer once the questions are gone", () => {
    const props = engineProps("awaiting-outcome");
    render(<QuizEngine {...props} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(props.onInteractionComplete).not.toHaveBeenCalled();
  });
});

describe("QuizTeaser", () => {
  const teaserProps = (
    overrides: Partial<GameTeaserProps> = {},
  ): GameTeaserProps => {
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
      ...overrides,
    };
  };

  it("shows the real number of questions, and the text of none of them (rule 1)", () => {
    render(<QuizTeaser {...teaserProps()} />);
    expect(
      screen.getByRole("button", {
        name: `Lancer le jeu · ${campaign.quiz.length} questions`,
      }),
    ).toBeTruthy();
    expect(screen.getByText(`1 / ${campaign.quiz.length}`)).toBeTruthy();
    for (const question of campaign.quiz) {
      expect(screen.queryByText(question.text)).toBeNull();
      for (const option of question.options) {
        expect(screen.queryByText(option)).toBeNull();
      }
    }
  });

  it("counts through the questions on its own, and stops off screen (rule 4)", () => {
    const props = teaserProps();
    const { rerender } = render(<QuizTeaser {...props} />);
    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(screen.getByText(`2 / ${campaign.quiz.length}`)).toBeTruthy();
    rerender(<QuizTeaser {...props} active={false} />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText(`2 / ${campaign.quiz.length}`)).toBeTruthy();
  });

  it("shows a timer ring only for a campaign that has a timer", () => {
    const { container, unmount } = render(<QuizTeaser {...teaserProps()} />);
    expect(container.querySelector("[data-xp-quiz-timer]")).toBeNull();
    unmount();
    const timed = {
      ...campaign,
      rules: { quiz: { passThresholdPercent: 50, secondsPerQuestion: 15 } },
    };
    const second = render(<QuizTeaser {...teaserProps({ campaign: timed })} />);
    expect(second.container.querySelector("[data-xp-quiz-timer]")).toBeTruthy();
  });

  it("starts the journey when touched, never a game (rule 2)", () => {
    const props = teaserProps();
    render(<QuizTeaser {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(props.onStart).toHaveBeenCalledOnce();
  });
});
