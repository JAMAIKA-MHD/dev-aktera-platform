import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../../contexts/LanguageContext";
import type { Campaign, PrizeTemplate } from "../../types";
import { CampaignWizard } from "../CampaignWizard";
import {
  initialWizardForm,
  playingGame,
  savedPrizeLines,
  startingOn,
  validateWizard,
  type WizardContext,
} from "./wizardForm";

vi.mock("../common/ImageUploader", () => ({
  ImageUploader: () => <div data-testid="image-uploader" />,
}));

const TEMPLATES: PrizeTemplate[] = [
  {
    id: "t1",
    name: "Headphones",
    category: "physical",
    description: "",
    totalStock: 200,
    availableStock: 200,
    allocatedStock: 0,
    itemValue: "5000 DA",
  },
];

const LIVE: Campaign = {
  id: "c1",
  name: "Summer Spin",
  arabicName: "",
  slug: "summer-spin",
  gameType: "lucky_wheel",
  gameLogicConfig: { brand_name: "Sunny" },
  status: "active",
  winProbability: 40,
  autoPacePrizes: false,
  maxEntries: "2",
  prizes: [{ id: "p1", templateId: "t1", quantity: 50, weight: 100 }],
  questions: [],
  participantsCount: 12,
  rewardsClaimed: 3,
  startDate: "2026-10-01",
  endDate: "2026-10-31",
};

const CONTEXT: WizardContext = {
  templates: TEMPLATES,
  editingCampaign: null,
  existingNames: ["Eid Wheel"],
};

function setup(props: Partial<ComponentProps<typeof CampaignWizard>> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <LanguageProvider>
      <CampaignWizard
        prizes={TEMPLATES}
        onSave={onSave}
        onCancel={onCancel}
        {...props}
      />
    </LanguageProvider>,
  );
  return { onSave, onCancel, user };
}

const steps = () =>
  within(screen.getByRole("navigation", { name: "Steps of the campaign" }));
const stepButton = (label: RegExp) =>
  steps().getByRole("button", { name: label });
const currentStep = () =>
  steps()
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-current") === "step")
    ?.textContent;
// State of the circle of a step in the left list: pending, current, done or error.
const circle = (label: RegExp) =>
  stepButton(label).querySelector("[data-state]")?.getAttribute("data-state");

async function fillFoundation(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Campaign name/), "Ramadan Wheel");
  await user.type(screen.getByLabelText(/Brand name/), "Sunny");
}

describe("wizard rules", () => {
  it("lists what blocks saving, step by step", () => {
    const form = {
      ...initialWizardForm(null, null, []),
      name: "Eid Wheel",
      endDate: "2020-01-01T00:00",
    };
    const quiz = playingGame(form, "quiz");
    const errors = validateWizard(quiz, "draft", CONTEXT);
    expect(errors[1]).toMatchObject({
      name: "A campaign with this name already exists.",
      brandName: expect.any(String),
      endDate: "The end must be after the start.",
    });
    expect(Object.keys(errors[2] ?? {})).toContain("questions.0.questionText");
    expect(errors[4]).toMatchObject({
      "prizes.0.templateId": expect.any(String),
    });
  });

  it("asks for the sweepstake rules only to go live", () => {
    const base = initialWizardForm(null, null, TEMPLATES);
    const draw = {
      ...base,
      w: {
        ...base.w,
        method: "draw" as const,
        draw: { ...base.w.draw, at: "2999-01-01T10:00", manageStock: false },
      },
    };
    expect(validateWizard(draw, "draft", CONTEXT)[3]).toBeUndefined();
    expect(validateWizard(draw, "active", CONTEXT)[3]).toEqual({
      "draw.rules": "Sweepstake rules are required before going live.",
    });
    // The brand handles the prizes of this draw: nothing is saved for it.
    expect(savedPrizeLines(draw)).toEqual([]);
  });

  it("keeps the id of existing prize rows, which the save needs", () => {
    expect(initialWizardForm(LIVE, null, TEMPLATES).prizes[0].id).toBe("p1");
  });

  it("reads an older campaign's game as its two layers", () => {
    expect(initialWizardForm(LIVE, null, TEMPLATES).w).toMatchObject({
      category: "luck",
      revealId: "wheel",
    });
    const quiz = playingGame(initialWizardForm(null, null, []), "quiz").w;
    expect(quiz).toMatchObject({ category: "knowledge", engagementId: "quiz" });
  });

  it("gives a campaign started on a chosen day its usual length", () => {
    const now = new Date(2026, 10, 3, 15, 30);
    const form = startingOn(
      initialWizardForm(null, null, []),
      "2026-12-20",
      now,
    );
    expect(form.startDate).toBe("2026-12-20T00:00");
    expect(form.endDate).toBe("2027-01-19T23:59");
    // Today: it starts now, not at midnight.
    expect(startingOn(form, "2026-11-03", now).startDate).toBe(
      "2026-11-03T15:30",
    );
  });
});

describe("CampaignWizard", () => {
  it("opens on the date chosen on the Overview, and saves it", async () => {
    const { user, onSave, onCancel } = setup({
      initialStartDate: "2026-12-20",
    });
    expect((screen.getByLabelText(/Starts/) as HTMLInputElement).value).toBe(
      "2026-12-20T00:00",
    );
    expect((screen.getByLabelText(/Ends/) as HTMLInputElement).value).toBe(
      "2027-01-19T23:59",
    );

    // The date came with the window: leaving at once loses nothing.
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.queryByText("Leave without saving?")).toBeNull();

    await fillFoundation(user);
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      startDate: "2026-12-20T00:00",
      endDate: "2027-01-19T23:59",
    });
  });

  it("saves the description with the campaign, and reads it back", async () => {
    const { user, onSave } = setup();
    await fillFoundation(user);
    await user.type(
      screen.getByLabelText(/Description/),
      "  Drive store visits.  ",
    );
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave.mock.calls[0][0].gameLogicConfig).toMatchObject({
      brand_name: "Sunny",
      description: "Drive store visits.",
    });
    expect(
      initialWizardForm(
        {
          ...LIVE,
          gameLogicConfig: { description: "Drive store visits." },
        },
        null,
        [],
      ).description,
    ).toBe("Drive store visits.");
  });

  it("keeps the dates of a campaign being edited", () => {
    setup({ editingCampaign: LIVE, initialStartDate: "2026-12-20" });
    expect((screen.getByLabelText(/Starts/) as HTMLInputElement).value).toBe(
      "2026-10-01T00:00",
    );
  });

  it("opens a quick-start game on its layers", async () => {
    const { user } = setup({ initialGameType: "scratch_card" });
    await user.click(stepButton(/Engagement/));
    expect(
      screen.getByRole("radio", { name: /^Luck/ }).getAttribute("aria-checked"),
    ).toBe("true");
    await user.click(stepButton(/Reward/));
    expect(
      screen
        .getByRole("radio", { name: /Scratch Card/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("opens as a window with the five steps listed, green once finished", async () => {
    const { user } = setup();
    expect(screen.getByRole("dialog", { name: "New campaign" })).toBeTruthy();
    expect(
      steps()
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([
      expect.stringContaining("Foundation"),
      expect.stringContaining("Engagement"),
      expect.stringContaining("Reward"),
      expect.stringContaining("Prizes"),
      expect.stringContaining("Review"),
    ]);
    expect(circle(/Foundation/)).toBe("current");
    expect(circle(/Engagement/)).toBe("pending");

    await fillFoundation(user);
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(circle(/Foundation/)).toBe("done");
    expect(circle(/Engagement/)).toBe("current");

    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: /Continue/ }));
    }
    // The four steps are finished, so the review is too.
    expect(currentStep()).toContain("Review");
    expect(circle(/Prizes/)).toBe("done");
    expect(circle(/Review/)).toBe("done");
  });

  it("shows the steps of an existing campaign as already done", () => {
    setup({ editingCampaign: LIVE });
    expect(circle(/Foundation/)).toBe("done");
    expect(circle(/Prizes/)).toBe("done");
    expect(circle(/Review/)).toBe("done");
  });

  it("does not leave a step that still has something to fix", async () => {
    const { user } = setup({ existingNames: ["Ramadan Wheel"] });
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(currentStep()).toContain("Foundation");
    expect(
      screen.getAllByText("Campaign name must be at least 3 characters.")
        .length,
    ).toBeGreaterThan(0);

    await fillFoundation(user);
    expect(
      screen.getAllByText("A campaign with this name already exists.").length,
    ).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText(/Campaign name/));
    await user.type(screen.getByLabelText(/Campaign name/), "Eid Wheel");
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(currentStep()).toContain("Engagement");
  });

  it("builds quiz questions in the engagement step", async () => {
    const { user } = setup();
    await user.click(stepButton(/Engagement/));
    await user.click(screen.getByRole("radio", { name: /Knowledge-based/ }));
    expect(screen.getByText("Quiz settings")).toBeTruthy();
    expect(screen.getAllByText(/^Question \d$/)).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: "5" }));
    expect(screen.getAllByText(/^Question \d$/)).toHaveLength(5);

    const correct = screen.getAllByRole("radio", {
      name: "Mark answer 2 as correct",
    })[0];
    await user.click(correct);
    expect(correct.getAttribute("aria-checked")).toBe("true");
  });

  it("hides the game settings for luck", async () => {
    const { user } = setup();
    await user.click(stepButton(/Engagement/));
    await user.click(screen.getByRole("radio", { name: /^Luck/ }));
    expect(screen.getByText("No game settings for luck.")).toBeTruthy();
    expect(screen.queryByText("Game settings")).toBeNull();
  });

  it("saves a draft from any step, and sends the user to what is missing", async () => {
    const { user, onSave } = setup();
    await user.click(stepButton(/Prizes/));
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(currentStep()).toContain("Foundation");

    await fillFoundation(user);
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Ramadan Wheel",
      gameType: "hit_it",
      gameLogicConfig: {
        brand_name: "Sunny",
        win_threshold: 8,
        wizard: { category: "skill", method: "instant" },
      },
      autoPacePrizes: true,
      submitStatus: "draft",
      mode: "create",
      prizes: [{ templateId: "t1", quantity: 100, weight: 100 }],
    });
  });

  it("saves a guaranteed instant win at 100%", async () => {
    const { user, onSave } = setup();
    await fillFoundation(user);
    await user.click(stepButton(/Reward/));
    await user.click(screen.getByRole("radio", { name: /Guaranteed winning/ }));
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      winProbability: 100,
      autoPacePrizes: false,
    });
  });

  it("asks for the draw rules before going live, not for a draft", async () => {
    const { user, onSave } = setup();
    await fillFoundation(user);
    await user.click(stepButton(/Reward/));
    await user.click(screen.getByRole("radio", { name: /^Draw/ }));
    await user.type(
      screen.getByLabelText(/Draw date and time/),
      "2999-01-01T10:00",
    );
    await user.click(stepButton(/Prizes/));
    await user.click(screen.getByRole("radio", { name: /^No/ }));

    await user.click(stepButton(/Review/));
    await user.click(screen.getByRole("button", { name: /Publish campaign/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(currentStep()).toContain("Reward");
    expect(
      screen.getAllByText("Sweepstake rules are required before going live.")
        .length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      winProbability: 0,
      prizes: [],
      gameLogicConfig: { wizard: { method: "draw" } },
    });
  });

  it("reviews the real settings and confirms before saving a live campaign", async () => {
    const { user, onSave } = setup({ editingCampaign: LIVE, initialStep: 5 });
    expect(screen.getByText("2 plays")).toBeTruthy();
    expect(screen.getByText("Wheel of Fortune")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save draft/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(onSave.mock.calls[0][0]).toMatchObject({
      id: "c1",
      slug: "summer-spin",
      gameType: "lucky_wheel",
      winProbability: 40,
      mode: "edit",
      submitStatus: "active",
      prizes: [{ id: "p1", templateId: "t1" }],
    });
  });

  it("asks before discarding unsaved changes", async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1); // Nothing typed: leaves at once.

    await user.type(screen.getByLabelText(/Campaign name/), "Eid Wheel");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
