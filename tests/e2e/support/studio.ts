import { expect, type FrameLocator, type Page } from "@playwright/test";
import { TEMPLATE_LABELS, type TemplateId } from "./matrix";

// The Studio of a real campaign (/studio/:campaignId), driven the way a brand would.

export async function openStudio(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.goto(`/studio/${campaignId}`);
  await expect(
    page.getByRole("radiogroup", { name: "Template library" }),
  ).toBeVisible({
    timeout: 30_000,
  });
}

// Makes the edits, then waits for the write that carries them: save_experience_config
// answering 200 with every expected value in what it was sent, and "Saved" in the top bar
// afterwards (the Studio says so only once the database has confirmed it, useAutosave).
export async function saveEdits(
  page: Page,
  expected: string[],
  edit: () => Promise<void>,
): Promise<void> {
  const written = page.waitForResponse(
    (response) => {
      if (!response.url().includes("/rpc/save_experience_config")) return false;
      const body = response.request().postData() ?? "";
      return expected.every((value) =>
        body.toLowerCase().includes(value.toLowerCase()),
      );
    },
    { timeout: 30_000 },
  );
  await edit();
  const response = await written;
  expect(response.status(), await response.text()).toBe(200);
  const bar = page
    .getByRole("status")
    .filter({ hasText: /Saved|Saving|Autosave/ });
  await expect(bar).toHaveText(/Saved/, { timeout: 20_000 });
}

export async function chooseTemplate(
  page: Page,
  template: TemplateId,
): Promise<void> {
  await page.getByRole("button", { name: /^Template(\s\d+)?$/ }).click();
  const card = page.getByRole("radio", { name: TEMPLATE_LABELS[template] });
  if ((await card.getAttribute("aria-checked")) !== "true") {
    await card.click();
    // The Studio asks first when the brand has changed the style: apply the template.
    const confirm = page.getByRole("alertdialog", {
      name: "Replace your style changes?",
    });
    await expect(async () => {
      if (await confirm.isVisible())
        await confirm.getByRole("button", { name: /^Apply/ }).click();
      await expect(card).toHaveAttribute("aria-checked", "true", {
        timeout: 500,
      });
    }).toPass({ timeout: 10_000 });
  }
  await expect(card).toHaveAttribute("aria-checked", "true");
}

export async function editPlayTitle(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: /^Sections/ }).click();
  await page.getByLabel("Screen to edit").selectOption("play");
  const title = page.getByLabel("Title", { exact: true });
  await title.fill(text);
  await expect(title).toHaveValue(text);
}

export async function playTitleValue(page: Page): Promise<string> {
  await page.getByRole("button", { name: /^Sections/ }).click();
  await page.getByLabel("Screen to edit").selectOption("play");
  return page.getByLabel("Title", { exact: true }).inputValue();
}

export async function setPrimaryColor(page: Page, hex: string): Promise<void> {
  await page.getByRole("button", { name: /^Brand Identity/ }).click();
  const field = page.getByLabel("Primary", { exact: true });
  await field.fill(hex);
  await field.blur();
  await expect(field).toHaveValue(new RegExp(`^${hex}$`, "i"));
}

export async function primaryColorValue(page: Page): Promise<string> {
  await page.getByRole("button", { name: /^Brand Identity/ }).click();
  return page.getByLabel("Primary", { exact: true }).inputValue();
}

// The preview: the runtime in its own document (/xp-frame), at the device's exact size.
export function preview(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Player screen preview"]');
}

// The preview at an exact size with no device around it (Responsive): no simulated notch
// or home bar, so it lays out like a plain browser window of that size.
export async function previewSize(
  page: Page,
  size: { width: number; height: number },
): Promise<void> {
  await page
    .getByLabel("Device", { exact: true })
    .selectOption({ label: "Responsive" });
  for (const [label, value] of [
    ["Width", size.width],
    ["Height", size.height],
  ] as const) {
    const input = page.getByLabel(label, { exact: true });
    await input.fill(String(value));
    await input.press("Enter");
  }
  const frame = page.locator('iframe[title="Player screen preview"]');
  await expect(frame).toHaveAttribute("width", String(size.width));
  await expect(frame).toHaveAttribute("height", String(size.height));
}

export async function showScreen(
  page: Page,
  screen: "play" | "welcome",
): Promise<void> {
  await page
    .getByRole("tablist", { name: "Screen" })
    .getByRole("tab", {
      name: screen === "play" ? "Play" : "Welcome",
      exact: true,
    })
    .click();
  await expect(
    preview(page).locator(`.xp-frame[data-xp-screen="${screen}"]`),
  ).toBeVisible();
}
