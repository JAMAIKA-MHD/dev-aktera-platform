# Merge Request: `fix/studio-preview` → `develop`

## Summary

On a laptop the Studio's own bars took almost half of the screen height, so the live preview was
small and hard to read (about 350 px tall on a 1290 × 606 viewport, a phone drawn at ~36 %). This
MR gives the preview its height back, and tidies the Studio along the way: one foldable preview
bar, a "Fit width" zoom, thinner bars on short screens, and a few controls removed or reworked.

There is **no database change and no migration**: the design is JSON, and the one new field is
read with a default (see "Compatibility").

## What changes

### 1. One preview bar, foldable (`e50767a`, `6be8634`)

- The language switch (FR / AR / EN), the screen tabs (Welcome … Status) and the device controls
  (device, size, zoom, rotation, frame, layout tiers) now live in **one bar** above the preview.
- The bar **folds into a one-line summary**, e.g. `Welcome · FR · 390 × 844 · One column · 53 % · iPhone 12–14`.
  The old status line under the preview is gone: the summary replaces it.
- It is **open by default, and folded by default on a short screen** (height under 720 px). The
  choice is remembered per browser, under a new key (`xp:studio:preview-bar:v1`), so nobody has
  their tabs hidden by an older preference.
- While folded, the screen can still be changed from the Sections panel's "Screen to edit" menu.

### 2. "Fit width (scroll)" zoom (`e50767a`)

- New option in the zoom menu: the device takes the **width of the pane** (up to 100 %) and a tall
  screen **scrolls**, as on a real phone, so its text stays readable. "Fit" (whole device) is
  unchanged and remains the default. The choice is remembered like the other zooms.

### 3. Thinner bars on short screens (`e50767a`)

- A `short:` Tailwind variant (`@media (max-height: 45rem)`, `src/index.css`) thins the Studio top
  bar (63 → 48 px) and the preview bar. The same threshold drives the "start folded" default
  (`studio/preview/shortScreen.ts`).

**Measured on a 1290 × 606 viewport:**

|                                                   | Preview pane | Phone zoom |
| ------------------------------------------------- | ------------ | ---------- |
| Before this MR                                    | ~350 px      | ~36 %      |
| Preview bar folded (new default on short screens) | **517 px**   | **53 %**   |
| Preview bar open                                  | 377 px       | 37 %       |
| Fit width, bar folded                             | scrolls      | **100 %**  |

### 4. Smaller changes (`c61f678`)

- **Template panel:** the "Layout / Eight zones" card is removed (there is one layout: nothing to
  choose). Only the Style presets remain.
- **Restart button removed** from the preview bar. The preview still redraws by itself when another
  screen or status message is picked. (The sandbox of the dashboard keeps its own Restart: it
  restarts a real journey and is not part of the Studio.)
- **Scrolling notice is now the client's choice.** The short line that scrolls above the footer
  links ("Free game, no purchase necessary…") can be switched off with **"Show the scrolling
  notice"** in the Legal panel. Off: the band disappears from the player and from the preview, the
  links and the organizer line stay, the "Short mention" field hides (its text is kept), and the
  text is no longer validated. It is one undoable step.
- **Rotate button icon:** the icon of the browsers' device mode (Inspect), a screen on its corner
  with two curved arrows (`ScreenRotationIcon`, from Material Design), replaces the reload-looking
  circular arrow.

## Compatibility

- New field `legal.showLegalLine` (boolean). The schema reads it with `.default(true)`: a design
  saved **before** this MR has no such key and is read as "shown", so nothing changes for existing
  campaigns. `schema.strict-check.ts` still proves the schema and `ExperienceConfig` match.
- The public player (`/play/:slug`) and the Studio parse designs through the same schema, so both
  get the default.
- Removed from the Studio only: the Layout card, the Restart button. Nothing removed from the
  runtime or the Edge Functions.

## Files worth reading

| What                          | Where                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| One foldable bar, summary     | `studio/layout/PreviewPane.tsx`                                                                                                      |
| Fold preference, short screen | `studio/preview/previewBarPrefs.ts`, `shortScreen.ts`                                                                                |
| Fit-width zoom                | `studio/preview/viewportMath.ts` (`computeFitWidthZoom`), `PreviewViewport.tsx`                                                      |
| Rotate icon                   | `studio/preview/ScreenRotationIcon.tsx`, `DeviceToolbar.tsx`                                                                         |
| Scrolling notice switch       | `domain/types.ts`, `schema.ts`, `defaults.ts`, `validation.ts`, `runtime/frame/slots/FooterSlot.tsx`, `studio/panels/LegalPanel.tsx` |
| Thinner bars                  | `src/index.css` (`short:` variant), `studio/layout/StudioTopBar.tsx`                                                                 |

## How to test

```bash
npm run verify        # lint + typecheck + tests + build
```

Manual, in the Studio (`/studio/<campaign>`), ideally in a window about 1300 × 600:

1. The preview bar starts **folded** (one line). Click it: language, tabs and device controls
   appear. Reload: the choice is remembered.
2. Zoom → **Fit width (scroll)**: the phone is readable and the pane scrolls.
3. Legal → switch **Show the scrolling notice** off: the band leaves the preview; on: it is back.
   Ctrl+Z undoes it. Open a design saved before this MR: the notice is still shown.
4. Template: no Layout card. Preview bar: no Restart. Rotate button: the same icon as the browsers' device mode.

## Tests

1096 tests pass (95 files), `tsc` (normal and strict) and ESLint clean, build OK. New or updated:

- the fit-width math, the fold preference and the short-screen default (`previewBarFold.test.tsx`,
  `viewportMath.test.ts`, `deviceBar.test.tsx`);
- the summary, the single bar, no Restart, a stable accessible name for the fold button;
- the notice switch: schema default and round trip, validation, Legal panel, the player footer;
- the Template panel without the Layout card; the rotate icon.

## Rules check

Prize selection, RLS, consent gating and duplicate protection are untouched (Studio and
presentation only).
