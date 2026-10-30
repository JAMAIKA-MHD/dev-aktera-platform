# Player Experience module

Everything players see and play (welcome, registration, game, result) and the Studio that brands use to customize it.
It replaced the former Player UI Maker, Player Editor and `PlayerScreenConfig.tsx` (removed in T7.3).

The rest of the app imports **only** from `index.ts`. ESLint enforces this rule.

## The five module rules

1. **Configuration is serializable data.** `ExperienceConfig` is plain JSON: no functions, no `ReactNode`, no callbacks. Content comes from the configuration, behavior comes from the flow state machine.
2. **Layout is code.** A template is a responsive React component (the 8-slot frame). Brands pick and fill; they never position anything.
3. **The outcome comes from an authority.** Game engines never decide who wins. They receive the outcome from a `ParticipationGateway` and only animate towards it. Rules that decide a win (prizes, weights, stock, correct answers, thresholds) never live in `ExperienceConfig`.
4. **Every port is asynchronous.** Storage, participation, assets, analytics and human verification go through interfaces that return promises, even with local adapters. Moving to the network changes adapters, not the UI.
5. **`domain/` never imports React**, nor anything from `services/`, `runtime/` or `studio/`. It is pure TypeScript and fully unit-tested. It may read the pure-data presets (default texts, styles, demo campaign) to build default configurations.

## Layers

| Folder               | Content                                               | May import                                             | Must never import                                |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `domain/`            | Types, schema, rules, flow state machine              | `zod`, pure-data `presets/`, `src/types.ts`            | React, `services`, `runtime`, `studio`, Supabase |
| `services/`          | Ports and adapters (`local/` now, `supabase/` later)  | `domain` (+ pure-data presets in the composition root) | `runtime`, `studio`                              |
| `theme/`, `presets/` | Design tokens, style presets, default content         | `domain`, `themes/`                                    | `services`, `studio`                             |
| `themes/`            | One folder per theme: `theme.json` and its assets     | nothing (data only)                                    | everything                                       |
| `runtime/`           | What players see: layout, host, frame, screens, games | `domain`, `theme`, `presets`, `services/ports`         | `studio`, concrete adapters (`services/local`)   |
| `studio/`            | The editor                                            | the whole module                                       | concrete adapters (injected by the provider)     |

ESLint blocks three of these rules: deep imports from outside the module, `services/local` imports inside `runtime/`, and React (including `presets/icons.ts`), upper-layer or Supabase imports inside `domain/`.

## How the app uses it

| Entry point (`index.ts`) | Mounted by                                         | What it does                                                                                                              |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `CampaignStudio`         | `App.tsx`, tab `playerScreen` and route `/studio`  | The Studio on the app's own campaigns; it never shows or edits the rules (odds, stock, answers), which stay in the Wizard |
| `CampaignSimulator`      | `App.tsx`, "Interactive Player Sandbox" drawer     | The runtime at 390 × 844 in its own iframe, full journey on the demo gateway                                              |
| `FrameHost`              | `AppRouter.tsx`, route `/xp-frame`                 | The runtime's own document: driven by the Studio through the preview bridge, or by `?fixture=` for checks                 |
| `PlayerExperience`       | `src/pages/play/PublicPlayPage.tsx`, `/play/:slug` | The runtime itself, always rendered in a document of its own, never inside another page's `div`                           |

- **Storage**: on a real campaign, the design is saved in Supabase (table `campaign_experiences`,
  function `save_experience_config`) and images in Storage (bucket `campaign-media`); a design made
  in this browser before the wiring is imported once. The standalone Studio and `/xp-frame` keep
  `localStorage`. Compositions: `services/createSupabaseServices.ts`, details in
  `services/supabase/README.md`.
- **Gateways**: the Studio and the sandbox always draw on the demo gateway (`DEMO-…` codes, never
  real stock). `/play/:slug` accepts only the live gateway, which calls `select-prize`: real prize
  selection stays server-side.
- **`/play/:slug`**: `src/pages/play/PublicPlayPage.tsx` reads `get_public_experience` through
  `loadPublicExperience` (safe fields only), composes `createPublicServices` and renders
  `PlayerExperience` with `allowedGatewayModes={["live"]}`. A closed or sold-out campaign shows the
  closed screen from the start; an unknown slug shows "not found" in fr / ar / en.
- **Checks**: `npm run xp:responsive -- <url>… [--quick | --full]` sweeps every size with the runtime's
  own layout audit (run it on `npm run build` + `vite preview` for long sweeps: the dev server reloads
  on any file change). The audit is exposed by `/xp-frame` only, not by `/play/:slug`, which renders
  the same runtime. `npm run xp:resize` resizes each game mid-play.

## Template library

A brand picks the look of its player screens from a closed library, in the Studio's
Theme panel and nowhere else: `templateId` accepts only the ids of `domain/templates.ts`
(the schema repairs any other one to `eight-slot`), and the database refuses them too
(`save_experience_config` answers `INVALID`, and a CHECK guards `campaign_experiences.template_id`,
migration `20261020120000_experience_templates.sql`).

| Id             | Label        | Theme                            | Assets from (`src/templates/`)              |
| -------------- | ------------ | -------------------------------- | ------------------------------------------- |
| `eight-slot`   | Classic      | — (the brand's theme presets)    | —                                           |
| `comic-burst`  | Cartoon Pop  | `themes/comic-burst/theme.json`  | `style1-cartoon-style/cartoon-screens.zip`  |
| `quiz-show`    | Quiz Show    | `themes/quiz-show/theme.json`    | `style4-quiz-style/trivia-quiz-screens.zip` |
| `arcade-night` | Arcade Night | `themes/arcade-night/theme.json` | `style3-nightgaming-style/game-night.zip`   |
| `pixel-quest`  | Pixel Quest  | `themes/pixel-quest/theme.json`  | `style2-pixel-style/pixel-screens.zip`      |

### A theme is data: `themes/<id>/theme.json`

Every template but the classic one is a folder: `theme.json` and its `assets/` (backgrounds,
9-slice frames, decor, prize art, characters, sounds). Its contract is
`domain/themeManifest.ts` (zod): palette, fonts, radii, spacing, font sizes, shadows, the panel,
card, HUD, button and field styles, the title, the stage (a background per game and per screen,
decorations), the wheel, prize art, characters and sounds. A color may name a role (`@primary`,
`@ink`, `@primary-light`…) instead of repeating it; values are plain CSS, never `url()`, and images
only come in through `assets/` paths. `presets/themeManifests.ts` loads and checks every manifest;
`presets/themes.test.ts` fails on a broken one, a missing file, or unreadable text.

- **Tokens → CSS variables.** `ThemeScope` is the theme provider: it reads the template's
  `theme.json` and sets the shell variables on the runtime root (`theme/shellVars.ts`):
  `--xp-panel-*`, `--xp-card-*`, `--xp-hud-*`, `--xp-btn-*` / `--xp-btn2-*`, `--xp-field-*`,
  `--xp-title-*`, `--xp-font-display` / `--xp-font-ui`, `--xp-fs-*`, `--xp-space-*`, `--xp-radius-*`,
  `--xp-stage-*`, `--xp-wheel-*`, with the palette as `--xp-primary`… It also hands the resolved
  files to the shell (`useGameTheme()`). The classic template sets none: each component falls
  back to the classic look, in the brand's colors.
- **The brand's colors.** On a template, the brand may change **primary and accent** only (the
  Brand panel shows just those two); panels, frames and the stage are the theme's. A theme still
  on the template's own palette follows today's `theme.json` (`themedTokens`).
- **The shell** (`runtime/shell/`, styled by `shell.css` from the variables only, no rule per
  theme): `GameFrame` (the stage: background for the game and screen, veil, decorations, mood),
  `Hud` / `HudChip`, `Panel` (a card, flat or in the theme's 9-slice card frame), `GameButton`,
  `Modal` (scrim, focus trap; the legal sheet uses it), `ResultScreen` (the prize popping over
  rays, or the theme's sad character) and `RewardPopup` (the prize card with its code). The big
  panel behind the 8 slots is `.xp-frame::before`, drawn from the panel frame.
- **9-slice frames.** A frame is one small SVG stretched to any size with CSS `border-image`
  (`slice` in the image's pixels, `width` the drawn thickness). A framed popup's shadow is a
  `drop-shadow`, so it follows the frame's own corners.
- **Same layout, every screen.** A template never moves a slot: the 8-slot frame stays the layout
  of the welcome, form, game, result and status screens, at every size.
- **All four themed templates are spotlights.** Each opens on its texts alone and lays its
  screens out like its own template pack: the cloud (Cartoon Pop), the open sky over a pixel
  landscape (Pixel Quest), the marquee board between LED walls and podiums (Quiz Show), the
  night city with its dice and arcade cabinet (Arcade Night). The parts a pack drew as SVG are
  kept as they are; the parts it drew in CSS (Quiz Show's walls, podiums and bulb frame) are
  redrawn once as SVG in the theme folder.
- **Template pictures and lines.** `heroes` is the template's own picture above a screen's
  title (a trophy, a sad face), shown whatever the brand set there (the Studio says so in place
  of that choice); `layout.characters: "body"` keeps a result's character in its body instead.
  `copy` styles the line under the title (color, font, case, size, a rule under it).
  `button.screens` and `title.shadows` restyle the main button and the title per screen (a gold
  button on a win), `panel.frameScreens` swaps the frame per screen (red bulbs on a loss),
  `panel.room` gives a wide board its own room around the texts, `button.notch` cuts pixel
  corners, `stage.footerText` writes the footer on the stage's ground. On the wheel:
  `rimStripes`, `bulbShape`, `hubShape` and `pointerSize`; `layout.playCta` puts the game's
  button beside the wheel (round or block) or under it (`round-below`).
- **Sprite buttons.** `button.primary.frame` / `button.secondary.frame` draw a button from a
  picture as a 9-slice (its bevel, gloss and base in place of bg, border and shadow; `pixelated`
  keeps pixel art sharp). The button's `borderWidth` then only places the label on the
  picture's face. Pixel Quest uses two tiles of `style2-pixel-style/Pixel Buttom.png` (gold and
  silver, column 4 of its wide buttons); Quiz Show uses `b_3` and `b_5` of
  `style4-quiz-style/cga_ui_gold.zip`, at half size.
- **Per-screen dressing, still data.** A theme may dress each screen its own way: decorations
  limited to some screens (`stage.decor[].screens`), some drawn over the panel (`front`,
  landscape only), a title color per screen (`title.screens`), a backdrop behind the title
  (`title.backdrop`), a stage image kept whole (`stage.fit: "stretch"`) and no win/lose mood
  (`stage.moods: false`).
- **Panel shapes.** `panel.shape` replaces the rectangle or the 9-slice frame with one picture
  stretched behind the slots (Cartoon Pop's cloud), with the room it needs around the texts
  (`padInline`, `padBlock`, `columnMax`), another picture per screen (the dimmer cloud of a
  loss), screens without it (`hiddenOn`: the game, on the stage) and, in one column, a bleed past
  the screen's sides and top (`stack`) so that its narrow corners never pinch the texts. With
  `draw` (fill, ink, outline, a fill per screen) the shell draws the shape itself on one column,
  at the panel's exact size (`usePanelCloud`, `theme/cloudShape.ts`): round bumps of one size
  as big as the room around the texts, an outline of one width, however tall the form or the
  win screen grows. Those screens (register, statuses) then take their content's height and the
  page scrolls; nothing is cut inside a box. The picture stays the thumbnail and the fallback.
- **Painted stages.** A stage can be painted instead of a picture, sharp at any size and on any
  screen shape (no stretched or blurred PNG): `stage.paint` is a burst of rays in CSS
  (`repeating-conic-gradient`, 2 to 4 colors, the first the widest) with optional halftone dots
  in two corners, and `stage.frame` a cut-corner frame in vector: a polygon in percent for wide
  screens and its own for one column (`stackPoints`), a band and an outline of constant width
  (non-scaling stroke), its own sky inside, a paint per win/lose screen, and `stackInset`, the
  room kept between the screen's edges and the texts on one column. Decorations take a phone
  place of their own (`decor[].stack`) or their wide one at `stage.decorScale`.
- **Layouts.** `layout.kind` is `panes` (texts beside the game in landscape, the default) or
  `spotlight` (one column in the middle at every size; on the game screen, the CTA becomes a
  round button beside the game). `layout.welcomeTeaser: false` opens the welcome screen on its
  texts alone: the game is first seen on its own screen (Cartoon Pop: the template's login).
- **Game 1, the wheel.** `WheelFace` reads `--xp-wheel-*` (slice palette and their text colors,
  blank slice, rim, lights blinking while it turns, pointer, hub) and shows the theme's prize art
  on prize slices. It still lands only where the gateway's outcome says (`useWheelSpin`).
  A theme may also give it its own pointer art drawn above the rim (`wheel.pointerArt`), one
  outlined light per slice line (`bulbsPerSlice`, `bulbInk`), a flat hub (`hubShine: false`) and
  a hard shadow under the still wheel (`wheel.shadow`). In the spotlight layout the game screen
  packs its slots tight so the wheel takes the middle; on a landscape screen its CTA (round) and
  the line under the title sit beside it. The win and lose screens follow the template's own:
  the theme's character (`characters.happy`, a star; `characters.sad`) in slot 2 over the title
  instead of the medallion (`useResultHeroArt`), the prize and its code flat on the cloud, the
  coupon confirmation as the light button under the CTA, and the cloud growing with the content
  rather than scrolling the code inside it.
- **Sounds.** A theme's recordings (click, tick, win, lose, reward) replace the synthesized
  sounds of `feedback/audio.ts`; a sound it lacks, or one the browser refuses, is synthesized.
- **Music.** Every template, the classic one included, loops `src/sounds/the_mountain-retro-game-593063.mp3`
  under the sounds (`feedback/music.ts`, `runtimeAudio.setMusic`): it starts with the player's first
  gesture (autoplay rules), pauses while the page is hidden, and stops with `features.sound`. The
  sound button in the header (or on the status row without one, `frame/SoundToggle.tsx`) mutes
  music and sounds together; it shows "off" until that first gesture.
- **Motion.** `motion` in `theme.json` says how a template moves, each part off by default
  (`runtime/shell/motion.css`, read through `data-xp-fx-*` on the root and `--xp-fx-*`):
  `rays` turns the painted rays on a layer of their own (a new sky fades in over the old one),
  `vignette` lets the edges breathe, `entrance: "pop"` pops the panel, drops the title and
  assembles the decorations (decor `motion`: `sparkle`, `bob`), `buttons: "squish"`,
  `fields: "lively"`, `wipe` (a burst over the screen while it changes,
  `shell/ScreenTransition.tsx`: zoom into the game, flash and shake into a win, soft into a
  loss), `impact`, `confetti: "cartoon"`, `games: "lively"` (the wheel's pull-back, flicking
  pointer, crawl, bounce and lit slice — still landing only where the outcome says, a tap
  skips the landing; flakes on the scratch card; a stamp on the chosen quiz answer, never
  "right" or "wrong", which the browser cannot know; a box that leans and bursts; "POW!" on
  Hit It) and `words`. Reduced motion or the brand's animations off stop all of it (a screen
  only fades in); a device that drops frames loses the ambient part first (`data-xp-lite`).
  Cartoon Pop turns every part on.
- **A stepped, living scene.** `motion.feel: "stepped"` plays every effect above frame by frame
  (steps(), hard flashes) instead of with overshoot; `chiptune` turns the synthesized sounds into
  square waves with a victory jingle. The stage comes alive from its own layers: decor `motion`
  `wind` (a cloud crossing the screen in `seconds`, coming back round), `sway` (a 1 px lean),
  `hover` (a stepped bob), and `sprite` (a sprite sheet: `frames`, `fps`, `aspect`).
  `motion.flyers` sends sprites across now and then (`shell/Flyers.tsx`: birds in the sky, a
  snail on the ground; a flock scatters on a win, none on a loss, a few at most). `rain` falls on
  a loss, `countdown` counts "Continue? 10…" down on it (it never acts by itself), `pipe` slides
  the welcome down into the form, `wipe.kind: "iris"` closes and reopens a circle between
  screens, and a stepped error arrives in a glitch. Pixel Quest turns every part on, with its
  sprites in `themes/pixel-quest/assets/sprites/`.
- **Arabic.** Display fonts have no Arabic letters: an Arabic text (`data-xp-script="arabic"`)
  keeps the body font, its own size and spacing, never capitals.
- **A new theme** is a new folder and an id in `domain/templates.ts` (plus the database CHECK):
  no component, no CSS. `theme/themeLoader.test.tsx` renders the whole shell on a made-up theme.
- **Checks.** `/xp-frame?fixture=<name>&template=<id>` dresses any fixture in a template, for the
  responsive sweep.

## Responsive rules (plan §8.3)

The runtime is rendered in an iframe at the exact size of the simulated device (`/xp-frame`),
and must work at every size from 280 to 2560 px wide and 320 to 1600 px high.

- **No screen variants** (`sm:`, `md:`, `lg:`, `xl:`): use the runtime's own variants from
  `runtime/layout/layout.css`: `split:`, `tight:`, `roomy:`, `compact:`, `wide:`. Their
  values live in `runtime/layout/breakpoints.ts` only.
- **No fixed sizes** in pixels (`w-[260px]`, `min-h-[620px]`…) and no `100vh`; only the
  runtime root uses `100dvh` (`.xp-runtime`). Exceptions: borders and touch targets
  (`min-h-[44px]` to `min-h-[56px]`). `runtime/layout/noFixedSizes.test.ts` fails otherwise.
- **The game zone (slot 5) is a size container**: engines size themselves with
  `cqw`/`cqh`/`cqmin` (or `useElementSize`), never on the screen.
- **The primary CTA is sticky** at the bottom when the content is taller than the screen.
- **Pointer Events everywhere**: mouse, finger and pen share the same code.
- **Live resizing** (rotation, preview handle) never resets the state or breaks the display.
- **No `ltr:` / `rtl:` variants**: they match the `dir` of any ancestor, so a French scope
  around an Arabic one would apply both. Use logical properties (`start`/`end`, `ps`/`pe`,
  `ms`/`me`, `text-start`).
- **Safe areas**: pad with `--xp-safe-top|right|bottom|left`.

## Theme rules (plan §8.2)

- **No written colors** in `runtime/`: no hex value, no `rgb()`/`hsl()`, no Tailwind palette
  class (`text-white`, `bg-slate-900`…). Use the theme variables (`var(--xp-primary)`…) and,
  for transparency, `color-mix()` on them (`tint` in `theme/recipes.ts`).
  `runtime/noHardcodedColors.test.ts` fails otherwise.
- **Brand-typed text** gets `dir="auto"`; Arabic never gets letter spacing or capitals
  (`runtime/frame/text.ts` reads the script from the text itself).

## References

The planning documents are in French: `ai-assistance-prompts-reports/playereditor/`.

- `rules.md`: rules for every task.
- `plan&tasks/plan.md`: target architecture.
- `plan&tasks/tasks.md`: task-by-task execution.
