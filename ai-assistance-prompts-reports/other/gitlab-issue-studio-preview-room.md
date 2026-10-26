# Give the Studio preview more room on laptop screens

> Suggested labels: `Feature` · `Player Studio` · `UX`. Fixed by the branch `fix/studio-preview`.

## Problem

On a laptop screen the live preview of the Player Studio is too small to read.

On a 1290 × 606 viewport (a 1920 × 1080 laptop at 150 % scaling) the preview pane is only about
**350 px tall**, so a phone is drawn at about **36 %** and a tablet at about 22 %: texts, buttons
and the game are barely legible.

The height is eaten by the Studio's own bars, stacked above the preview:

| Bar                                                  | Height      |
| ---------------------------------------------------- | ----------- |
| Studio top bar                                       | ~63 px      |
| Language switch + screen tabs + Restart              | ~65 px      |
| Device bar (device, size, zoom…) + layout tier ruler | ~97 px      |
| Status line under the preview                        | ~31 px      |
| **Left for the preview**                             | **~350 px** |

The width is not the limit: a portrait phone is fitted by its height, so making the preview wider
(for example narrowing the settings panel) would change nothing for phones and tablets.

A few controls also got in the way:

- the Template panel shows a "Layout / Eight zones" card with nothing to choose (there is one layout);
- the **Restart** button of the preview is redundant (the preview already redraws when another
  screen is picked);
- the short line that scrolls above the footer links cannot be removed by the client;
- the rotate button uses an arrow that looks like "reload", not the rotate icon that designers
  know from the browsers' device mode (Inspect).

## Proposed Solution

1. **One foldable preview bar.** Put the language switch, the screen tabs and the device controls
   in a single bar that folds into a one-line summary (`Welcome · FR · 390 × 844 · One column ·
53 % · iPhone 12–14`). The summary replaces the status line. Open by default, folded by default
   on a short screen, and the choice is remembered.
2. **A "Fit width (scroll)" zoom**, so a tall screen is shown readable (up to 100 %) and scrolls in
   the pane like on a real phone.
3. **Thinner Studio bars on short screens** (a `short:` variant, height under 720 px).
4. **Smaller clean-ups:** remove the Layout card and the Restart button, add a switch to hide the
   scrolling notice, and use the browsers' own rotate icon.

## User / Business Value

- Brands can actually read and check what their players will see, on the laptops most of them use.
- Less scrolling and zooming while designing: faster, fewer mistakes before a campaign goes live.
- The client decides whether the scrolling legal notice is shown.
- A calmer, simpler Studio: fewer controls that do nothing.

## Scope

**In:** the Studio's preview bars and zoom, the Template and Legal panels, the rotate icon, the
`legal.showLegalLine` setting (a boolean, read with a default).

**Out:** the player runtime and its layout rules, the Edge Functions, the database (no migration),
the sandbox of the dashboard (it keeps its own Restart, which restarts a real journey), and
narrowing or resizing the settings panel (it would not help portrait devices).

## Acceptance Criteria

- [x] Language, screen tabs and device controls are in **one** bar above the preview.
- [x] The bar folds into a one-line summary (screen, language, size, layout tier, zoom, device) and
      opens again with one click; the status line under the preview is gone.
- [x] The bar starts open, and starts **folded on a short screen**; the brand's choice is remembered
      and wins over that default.
- [x] A **"Fit width (scroll)"** zoom fills the width of the pane (never above 100 %) and lets a tall
      screen scroll; it is remembered like the other zooms.
- [x] On a short screen the Studio top bar and the preview bar are thinner.
- [x] On a 1290 × 606 viewport the preview pane goes from ~350 px to **517 px** with the bar folded
      (phone zoom 36 % → 53 %), and the phone is readable at 100 % in Fit width.
- [x] The Template panel has no Layout card.
- [x] The preview bar has no Restart button, and the preview still redraws when another screen or
      status message is picked.
- [x] A **"Show the scrolling notice"** switch in the Legal panel hides the notice in the player and
      in the preview, keeps the footer links and the organizer line, and is undoable.
- [x] Designs saved before the switch keep showing their notice.
- [x] The rotate button shows the same icon as the browsers' device mode (Inspect).
- [x] `npm run verify` passes (1096 tests, typecheck normal and strict, lint, build).

## Dependencies

None. No database migration, no change to the Edge Functions.

## Notes

- Fixed in `fix/studio-preview`: `e50767a` (foldable device bar, fit-width zoom, thinner bars),
  `6be8634` (one preview bar), `c61f678` (Layout card, Restart, scrolling notice switch, rotate icon).
- Considered and **not done**: narrowing the settings panel to widen the preview. The preview is
  already ~780 px wide for a 390 px phone; the height is the limit.
- Backward compatibility: `legal.showLegalLine` is read with `.default(true)`, so a saved design with
  no such key is read as "notice shown".
- The fold choice uses a new storage key (`xp:studio:preview-bar:v1`), so nobody has their tabs
  hidden by an older preference.
