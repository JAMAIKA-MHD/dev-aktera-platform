# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: matrix.spec.ts >> quiz-show × lucky_wheel
- Location: tests\e2e\matrix.spec.ts:47:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.xp-frame[data-xp-screen="win"]')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.xp-frame[data-xp-screen="win"]') with timeout 30000ms
  - waiting for locator('.xp-frame[data-xp-screen="win"]')

```

```yaml
- banner
- heading "Oups !" [level=1]
- paragraph: Connexion impossible. Vérifiez votre réseau et réessayez.
- button "Réessayer"
- button "Retour"
- contentinfo:
    - button "Jeu gratuit sans obligation d'achat • Une participation par numéro"
    - list:
        - listitem:
            - button "Règlement"
        - listitem:
            - button "Confidentialité"
        - listitem:
            - button "Assistance"
```

# Test source

```ts
  64  |       await setPrimaryColor(page, color);
  65  |     });
  66  |
  67  |     let rows = await storedDesigns(campaign.id);
  68  |     expect(rows, "one design row per campaign").toHaveLength(1);
  69  |     const first = rows[0];
  70  |     expect(first.template_id).toBe(cell.template);
  71  |     const saved = first.config as {
  72  |       schemaVersion: number;
  73  |       templateId: string;
  74  |       game: { type: string };
  75  |       theme: { colors: { primary: string } };
  76  |       screens: { play: { title: Record<string, string> } };
  77  |     };
  78  |     expect(saved.schemaVersion, "a versioned design").toBeGreaterThanOrEqual(1);
  79  |     expect(saved.templateId).toBe(cell.template);
  80  |     expect(saved.game.type).toBe(cell.game);
  81  |     expect(Object.values(saved.screens.play.title)).toContain(title);
  82  |     expect(saved.theme.colors.primary.toUpperCase()).toBe(color);
  83  |
  84  |     // Saved again: the same row, updated in place.
  85  |     await saveEdits(page, [`${title}!`], () => editPlayTitle(page, `${title}!`));
  86  |     rows = await storedDesigns(campaign.id);
  87  |     expect(rows, "no duplicate after a second save").toHaveLength(1);
  88  |     expect(rows[0].updated_at).not.toBe(first.updated_at);
  89  |     await saveEdits(page, [`"${title}"`], () => editPlayTitle(page, title));
  90  |
  91  |     // A hard reload gives back exactly what was saved.
  92  |     await page.reload();
  93  |     await openStudio(page, campaign.id);
  94  |     expect(await playTitleValue(page)).toBe(title);
  95  |     expect((await primaryColorValue(page)).toUpperCase()).toBe(color);
  96  |     await chooseTemplate(page, cell.template); // already the one: nothing changes
  97  |     expect(await storedDesigns(campaign.id)).toHaveLength(1);
  98  |
  99  |     // The preview's play screen, at the phone's size: where every slot is drawn.
  100 |     await previewSize(page, VIEWPORTS.mobile);
  101 |     await showScreen(page, "play");
  102 |     const frame = preview(page);
  103 |     await expect(frame.locator(".xp-runtime").first()).toBeVisible();
  104 |     if (cell.template !== "eight-slot")
  105 |       await expect(frame.locator("[data-xp-themed]").first()).toHaveAttribute(
  106 |         "data-xp-themed",
  107 |         cell.template,
  108 |       );
  109 |     await expect(frame.locator('.xp-frame [data-xp-slot="title"]')).toContainText(title);
  110 |     const studioFrame = page.frames().find((f) => f.url().includes("/xp-frame"))!;
  111 |     await page.waitForTimeout(400); // the preview settles its size (ResizeObserver)
  112 |     const inStudio = await slotBoxes(studioFrame);
  113 |
  114 |     // ── 2. The player's page ─────────────────────────────────────────────────────
  115 |     // A player of its own, in French: the language the Studio edited.
  116 |     const players = await browser.newContext({ locale: "fr-DZ" });
  117 |     const player = await players.newPage();
  118 |     const playerErrors = watchErrors(player);
  119 |     // Which theme folders the player's page loads pictures, sounds and fonts from: its own
  120 |     // and the shared one. (The dev server also serves each theme's ?url import as a small
  121 |     // module, which is a URL string, not a file loaded: only real loads count.)
  122 |     const themeFolders = new Set<string>();
  123 |     player.on("request", (request) => {
  124 |       if (!["image", "media", "font"].includes(request.resourceType())) return;
  125 |       const folder = /\/player-experience\/themes\/([^/]+)\/assets\//.exec(request.url());
  126 |       if (folder) themeFolders.add(folder[1]);
  127 |     });
  128 |     await player.setViewportSize(VIEWPORTS.mobile);
  129 |     await player.goto(`/play/${campaign.slug}`);
  130 |     await expect(player.locator(".xp-runtime").first()).toBeVisible({ timeout: 30_000 });
  131 |     if (cell.template !== "eight-slot")
  132 |       await expect(player.locator("[data-xp-themed]").first()).toHaveAttribute(
  133 |         "data-xp-themed",
  134 |         cell.template,
  135 |       );
  136 |     else await expect(player.locator("[data-xp-themed]")).toHaveCount(0);
  137 |
  138 |     await registerPlayer(player, nextPhone(fixture.tag + cell.key));
  139 |     await expect(player.locator('.xp-frame [data-xp-slot="title"]')).toContainText(title);
  140 |     await player.waitForTimeout(400);
  141 |
  142 |     // Parity: the very slots, at the very places, as in the Studio's preview.
  143 |     const onPage = await slotBoxes(player);
  144 |     for (const [slot, box] of Object.entries(inStudio)) {
  145 |       if (slot === "header") continue; // the preview's DEMO chip is the Studio's own
  146 |       expect(onPage[slot], `slot ${slot}`).toBeDefined();
  147 |       onPage[slot]!.forEach((value: number, index: number) =>
  148 |         expect(
  149 |           Math.abs(value - box[index]),
  150 |           `slot ${slot} [x, y, w, h][${index}]: page ${JSON.stringify(onPage)} vs studio ${JSON.stringify(inStudio)}`,
  151 |         ).toBeLessThanOrEqual(2),
  152 |       );
  153 |     }
  154 |
  155 |     await player.screenshot({ path: `${SHOTS}/${cell.key}__play__mobile.png` });
  156 |     await player.setViewportSize(VIEWPORTS.desktop);
  157 |     await player.waitForTimeout(500);
  158 |     await player.screenshot({ path: `${SHOTS}/${cell.key}__play__desktop.png` });
  159 |     await player.setViewportSize(VIEWPORTS.mobile);
  160 |
  161 |     // Played to its end; the outcome is select-prize's.
  162 |     await playGame(player, cell.game);
  163 |     const result = cell.winning ? "win" : "lose";
> 164 |     await expect(player.locator(`.xp-frame[data-xp-screen="${result}"]`)).toBeVisible({
      |                                                                           ^ Error: expect(locator).toBeVisible() failed
  165 |       timeout: 30_000,
  166 |     });
  167 |     if (cell.template !== "eight-slot")
  168 |       await expect(player.locator("[data-xp-themed]").first()).toHaveAttribute(
  169 |         "data-xp-themed",
  170 |         cell.template,
  171 |       );
  172 |     await player.waitForTimeout(800);
  173 |     await player.screenshot({ path: `${SHOTS}/${cell.key}__${result}__mobile.png` });
  174 |
  175 |     await players.close();
  176 |     const allowed = new Set([cell.template, "_shared"]);
  177 |     expect(
  178 |       [...themeFolders].filter((folder) => !allowed.has(folder)),
  179 |       "files of another template fetched by the player's page",
  180 |     ).toEqual([]);
  181 |     expect(errors, "Studio: console errors and failed requests").toEqual([]);
  182 |     expect(playerErrors, "player: console errors and failed requests").toEqual([]);
  183 |   });
  184 | }
  185 |
```
