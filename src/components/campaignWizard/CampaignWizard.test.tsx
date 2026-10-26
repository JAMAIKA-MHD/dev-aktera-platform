import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../../contexts/LanguageContext";
import type { Campaign, PrizeTemplate } from "../../types";
import { CampaignWizard } from "../CampaignWizard";
import { initialWizardForm, slugify, validateWizard } from "./wizardForm";

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
  status: "active",
  winProbability: 40,
  maxEntries: "2",
  prizes: [{ id: "p1", templateId: "t1", quantity: 50, weight: 100 }],
  questions: [],
  participantsCount: 12,
  rewardsClaimed: 3,
  startDate: "2026-10-01",
  endDate: "2026-10-31",
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

const currentStep = () =>
  screen
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-current") === "step")
    ?.textContent;

describe("wizard rules", () => {
  it("turns a name into a link", () => {
    expect(slugify("Ramadan Super Spin 2026!")).toBe("ramadan-super-spin-2026");
  });

  it("lists what blocks saving, step by step", () => {
    const form = {
      ...initialWizardForm(null, null, []),
      type: "quiz" as const,
      endDate: "2020-01-01",
      questions: [
        {
          id: "q1",
          questionText: "",
          options: ["a", "", "c", "d"],
          correctIndex: 0,
        },
      ],
    };
    expect(
      validateWizard(form).map((issue) => [issue.step, issue.field]),
    ).toEqual([
      [1, "name"],
      [1, "slug"],
      [1, "dates"],
      [2, "question-q1"],
      [3, "prizes"],
    ]);
  });

  it("keeps the id of existing prize rows, which the save needs", () => {
    expect(initialWizardForm(LIVE, null, TEMPLATES).prizes[0].id).toBe("p1");
  });
});

// State of the circle of a part in the left list: pending, current, done or error.
const circle = (label: RegExp) =>
  screen
    .getByRole("button", { name: label })
    .querySelector("[data-state]")
    ?.getAttribute("data-state");

describe("CampaignWizard", () => {
  it("opens as a window with the four parts listed, green once finished", async () => {
    const { user } = setup();
    expect(screen.getByRole("dialog", { name: "New campaign" })).toBeTruthy();
    const parts = within(
      screen.getByRole("navigation", { name: "Parts of the campaign" }),
    ).getAllByRole("button");
    expect(parts.map((part) => part.textContent)).toEqual([
      expect.stringContaining("Basics"),
      expect.stringContaining("Game rules"),
      expect.stringContaining("Prizes"),
      expect.stringContaining("Review"),
    ]);
    expect(circle(/Basics/)).toBe("current");
    expect(circle(/Game rules/)).toBe("pending");

    await user.type(screen.getByLabelText(/Campaign name/), "Eid Wheel");
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(circle(/Basics/)).toBe("done");
    expect(circle(/Game rules/)).toBe("current");
    expect(circle(/Review/)).toBe("pending");

    await user.click(screen.getByRole("button", { name: /Continue/ }));
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    // The three parts are finished, so the review is too.
    expect(circle(/Prizes/)).toBe("done");
    expect(circle(/Review/)).toBe("done");
  });

  it("shows the parts of an existing campaign as already done", () => {
    setup({ editingCampaign: LIVE });
    expect(circle(/Basics/)).toBe("done");
    expect(circle(/Prizes/)).toBe("done");
    expect(circle(/Review/)).toBe("done");
  });

  it("does not leave a step that still has something to fix", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(currentStep()).toContain("Basics");
    expect(screen.getByText("Give the campaign a name.")).toBeTruthy();

    await user.type(screen.getByLabelText(/Campaign name/), "Eid Wheel");
    // The link follows the name until it is typed by hand.
    expect(
      (screen.getByLabelText(/Player link/) as HTMLInputElement).value,
    ).toBe("eid-wheel");
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(currentStep()).toContain("Game rules");
  });

  it("builds quiz questions in the game rules step", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: /Quiz Challenge/ }));
    await user.click(screen.getByRole("button", { name: /Game rules/ }));
    expect(screen.getByText("Quiz questions")).toBeTruthy();
    await user.click(
      screen.getByRole("radio", { name: "Mark answer 2 as correct" }),
    );
    expect(
      screen
        .getByRole("radio", { name: "Mark answer 2 as correct" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("saves a draft from any step, and sends the user to what is missing", async () => {
    const { user, onSave } = setup();
    await user.click(screen.getByRole("button", { name: /Prizes/ }));
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(currentStep()).toContain("Basics");

    await user.type(screen.getByLabelText(/Campaign name/), "Eid Wheel");
    await user.click(screen.getByRole("button", { name: /Save draft/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Eid Wheel",
      slug: "eid-wheel",
      submitStatus: "draft",
      mode: "create",
      prizes: [{ templateId: "t1", quantity: 100, weight: 100 }],
    });
  });

  it("reviews the real settings and confirms before saving a live campaign", async () => {
    const { user, onSave } = setup({ editingCampaign: LIVE, initialStep: 4 });
    // The review used to always say "1 play per phone number".
    expect(screen.getByText("2 spins")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save draft/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(onSave.mock.calls[0][0]).toMatchObject({
      id: "c1",
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
