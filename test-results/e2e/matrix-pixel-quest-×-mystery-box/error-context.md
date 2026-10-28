# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: matrix.spec.ts >> pixel-quest × mystery_box
- Location: tests\e2e\matrix.spec.ts:47:3

# Error details

```
TimeoutError: page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response"
```

```
Error: locator.fill: Test ended.
Call log:
  - waiting for getByLabel('Title', { exact: true })
    - locator resolved to <input lang="fr" dir="auto" placeholder="" aria-invalid="false" id="screens-play-title-fr" value="Choisissez une boîte" class="min-h-11 w-full rounded-xl border border-card-border bg-card-bg px-3 text-sm text-brand-text shadow-sm transition placeholder:text-brand-text-muted/70 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-slate-600  aria-[invalid=true]:border-red-400"/>
    - fill("E2E pixel-quest-mystery-box")
  - attempting fill action
    - waiting for "http://localhost:3000/studio/7367f651-66e5-4bf0-8a14-11f773ef4d2e" navigation to finish...
    - navigated to "http://localhost:3000/studio/7367f651-66e5-4bf0-8a14-11f773ef4d2e"
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying

```

# Test source

```ts
  1   | import { expect, type FrameLocator, type Page } from "@playwright/test";
  2   | import { TEMPLATE_LABELS, type TemplateId } from "./matrix";
  3   |
  4   | // The Studio of a real campaign (/studio/:campaignId), driven the way a brand would.
  5   |
  6   | export async function openStudio(page: Page, campaignId: string): Promise<void> {
  7   |   await page.goto(`/studio/${campaignId}`);
  8   |   await expect(page.getByRole("radiogroup", { name: "Template library" })).toBeVisible({
  9   |     timeout: 30_000,
  10  |   });
  11  | }
  12  |
  13  | // Makes the edits, then waits for the write that carries them: save_experience_config
  14  | // answering 200 with every expected value in what it was sent, and "Saved" in the top bar
  15  | // afterwards (the Studio says so only once the database has confirmed it, useAutosave).
  16  | export async function saveEdits(
  17  |   page: Page,
  18  |   expected: string[],
  19  |   edit: () => Promise<void>,
  20  | ): Promise<void> {
  21  |   const written = page.waitForResponse(
  22  |     (response) => {
  23  |       if (!response.url().includes("/rpc/save_experience_config")) return false;
  24  |       const body = response.request().postData() ?? "";
  25  |       return expected.every((value) => body.toLowerCase().includes(value.toLowerCase()));
  26  |     },
  27  |     { timeout: 30_000 },
  28  |   );
  29  |   await edit();
  30  |   const response = await written;
  31  |   expect(response.status(), await response.text()).toBe(200);
  32  |   const bar = page.getByRole("status").filter({ hasText: /Saved|Saving|Autosave/ });
  33  |   await expect(bar).toHaveText(/Saved/, { timeout: 20_000 });
  34  | }
  35  |
  36  | export async function chooseTemplate(page: Page, template: TemplateId): Promise<void> {
  37  |   await page.getByRole("button", { name: /^Template(\s\d+)?$/ }).click();
  38  |   const card = page.getByRole("radio", { name: TEMPLATE_LABELS[template] });
  39  |   if ((await card.getAttribute("aria-checked")) !== "true") {
  40  |     await card.click();
  41  |     // The Studio asks first when the brand has changed the style: apply the template.
  42  |     const confirm = page.getByRole("alertdialog", { name: "Replace your style changes?" });
  43  |     await expect(async () => {
  44  |       if (await confirm.isVisible())
  45  |         await confirm.getByRole("button", { name: /^Apply/ }).click();
  46  |       await expect(card).toHaveAttribute("aria-checked", "true", { timeout: 500 });
  47  |     }).toPass({ timeout: 10_000 });
  48  |   }
  49  |   await expect(card).toHaveAttribute("aria-checked", "true");
  50  | }
  51  |
  52  | export async function editPlayTitle(page: Page, text: string): Promise<void> {
  53  |   await page.getByRole("button", { name: /^Sections/ }).click();
  54  |   await page.getByLabel("Screen to edit").selectOption("play");
  55  |   const title = page.getByLabel("Title", { exact: true });
> 56  |   await title.fill(text);
      |               ^ Error: locator.fill: Test ended.
  57  |   await expect(title).toHaveValue(text);
  58  | }
  59  |
  60  | export async function playTitleValue(page: Page): Promise<string> {
  61  |   await page.getByRole("button", { name: /^Sections/ }).click();
  62  |   await page.getByLabel("Screen to edit").selectOption("play");
  63  |   return page.getByLabel("Title", { exact: true }).inputValue();
  64  | }
  65  |
  66  | export async function setPrimaryColor(page: Page, hex: string): Promise<void> {
  67  |   await page.getByRole("button", { name: /^Brand Identity/ }).click();
  68  |   const field = page.getByLabel("Primary", { exact: true });
  69  |   await field.fill(hex);
  70  |   await field.blur();
  71  |   await expect(field).toHaveValue(new RegExp(`^${hex}$`, "i"));
  72  | }
  73  |
  74  | export async function primaryColorValue(page: Page): Promise<string> {
  75  |   await page.getByRole("button", { name: /^Brand Identity/ }).click();
  76  |   return page.getByLabel("Primary", { exact: true }).inputValue();
  77  | }
  78  |
  79  | // The preview: the runtime in its own document (/xp-frame), at the device's exact size.
  80  | export function preview(page: Page): FrameLocator {
  81  |   return page.frameLocator('iframe[title="Player screen preview"]');
  82  | }
  83  |
  84  | // The preview at an exact size with no device around it (Responsive): no simulated notch
  85  | // or home bar, so it lays out like a plain browser window of that size.
  86  | export async function previewSize(
  87  |   page: Page,
  88  |   size: { width: number; height: number },
  89  | ): Promise<void> {
  90  |   await page.getByLabel("Device", { exact: true }).selectOption({ label: "Responsive" });
  91  |   for (const [label, value] of [
  92  |     ["Width", size.width],
  93  |     ["Height", size.height],
  94  |   ] as const) {
  95  |     const input = page.getByLabel(label, { exact: true });
  96  |     await input.fill(String(value));
  97  |     await input.press("Enter");
  98  |   }
  99  |   const frame = page.locator('iframe[title="Player screen preview"]');
  100 |   await expect(frame).toHaveAttribute("width", String(size.width));
  101 |   await expect(frame).toHaveAttribute("height", String(size.height));
  102 | }
  103 |
  104 | export async function showScreen(page: Page, screen: "play" | "welcome"): Promise<void> {
  105 |   await page
  106 |     .getByRole("tablist", { name: "Screen" })
  107 |     .getByRole("tab", { name: screen === "play" ? "Play" : "Welcome", exact: true })
  108 |     .click();
  109 |   await expect(preview(page).locator(`.xp-frame[data-xp-screen="${screen}"]`)).toBeVisible();
  110 | }
  111 |
```
