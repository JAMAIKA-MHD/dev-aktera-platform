import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { resolveQuizQuestion } from "../../../domain/display";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import {
  buildStandaloneDemoRules,
  createLocalServices,
} from "../../../services/createLocalServices";
import { createStudioStore } from "../../store";
import { StudioProvider } from "../../StudioContext";
import { QuizTranslationsEditor } from "./QuizTranslationsEditor";

const quiz: CampaignSnapshot = {
  ...createDemoCampaign("quiz"),
  id: "campaign-quiz",
};

function renderEditor() {
  const store = createStudioStore({ campaign: quiz });
  render(
    <StudioProvider
      value={{
        store,
        services: createLocalServices(),
        rules: buildStandaloneDemoRules(quiz),
        onEditCampaignSettings: () => {},
      }}
    >
      <QuizTranslationsEditor />
    </StudioProvider>,
  );
  return store;
}

const firstCard = () =>
  document.querySelector<HTMLElement>(
    `[data-studio-path="game.quiz.translations.${quiz.quiz[0].id}"]`,
  )!;

describe("QuizTranslationsEditor", () => {
  it("shows each question as typed in the campaign, the right answer marked", () => {
    renderEditor();
    const card = firstCard();
    expect(card.textContent).toContain(quiz.quiz[0].text);
    expect(within(card).getAllByLabelText("Correct answer")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: /Edit questions in campaign settings/,
      }),
    ).toBeTruthy();
    // Nothing in the editor can pick another answer: no radio, no select, no checkbox.
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("translates a question into Arabic, and the answers stay database indexes", () => {
    const store = renderEditor();
    act(() => store.getState().setLocale("ar"));
    const card = firstCard();
    fireEvent.change(within(card).getByLabelText("Question"), {
      target: { value: "ما هي عاصمة الجزائر؟" },
    });
    fireEvent.change(
      within(card).getByLabelText(/^Option 2( · right answer)?$/),
      {
        target: { value: "الجزائر" },
      },
    );
    const config = store.getState().config;
    const translation = config.game.quiz!.translations[quiz.quiz[0].id];
    expect(translation.text.ar).toBe("ما هي عاصمة الجزائر؟");
    expect(translation.options).toHaveLength(quiz.quiz[0].options.length);
    const shown = resolveQuizQuestion(quiz.quiz[0], config, "ar");
    expect(shown.text).toBe("ما هي عاصمة الجزائر؟");
    expect(shown.options[1]).toBe("الجزائر");
    // Only texts were written: the answer given by index 1 is the same in every language.
    expect(resolveQuizQuestion(quiz.quiz[0], config, "fr").options[1]).toBe(
      quiz.quiz[0].options[1],
    );
  });

  it("counts the questions translated in each language offered", () => {
    const store = renderEditor();
    expect(
      screen.getByText(/0\/3 questions translated in Arabic/),
    ).toBeTruthy();
    act(() => store.getState().setLocale("ar"));
    const card = firstCard();
    fireEvent.change(within(card).getByLabelText("Question"), {
      target: { value: "سؤال" },
    });
    quiz.quiz[0].options.forEach((_, index) =>
      fireEvent.change(
        within(card).getByLabelText(
          new RegExp(`^Option ${index + 1}( · right answer)?$`),
        ),
        {
          target: { value: `خيار ${index + 1}` },
        },
      ),
    );
    expect(
      screen.getByText(/1\/3 questions translated in Arabic/),
    ).toBeTruthy();
  });

  it("flags a translation outdated after a Wizard edit, until it is reviewed", () => {
    const store = renderEditor();
    act(() => store.getState().setLocale("ar"));
    fireEvent.change(within(firstCard()).getByLabelText("Question"), {
      target: { value: "سؤال" },
    });
    const edited: CampaignSnapshot = {
      ...quiz,
      quiz: [
        { ...quiz.quiz[0], text: "Quelle ville est la capitale ?" },
        ...quiz.quiz.slice(1),
      ],
    };
    act(() => store.getState().setCampaign(edited));
    const card = firstCard();
    expect(within(card).getByText("Outdated")).toBeTruthy();
    const review = within(card).getByRole("group", {
      name: "Review translation",
    });
    expect(review.textContent).toContain("Quelle ville est la capitale ?");
    expect(review.textContent).toContain("سؤال");
    expect(
      store
        .getState()
        .issues.some((issue) =>
          issue.id.startsWith("quiz-translation-outdated"),
        ),
    ).toBe(true);
    fireEvent.click(
      within(card).getByRole("button", { name: "Mark as reviewed" }),
    );
    expect(within(firstCard()).queryByText("Outdated")).toBeNull();
    expect(
      store
        .getState()
        .issues.some((issue) =>
          issue.id.startsWith("quiz-translation-outdated"),
        ),
    ).toBe(false);
  });
});
