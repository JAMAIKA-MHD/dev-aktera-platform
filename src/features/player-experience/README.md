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
| `theme/`, `presets/` | Design tokens, style presets, default content         | `domain`                                               | `services`, `studio`                             |
| `runtime/`           | What players see: layout, host, frame, screens, games | `domain`, `theme`, `presets`, `services/ports`         | `studio`, concrete adapters (`services/local`)   |
| `studio/`            | The editor                                            | the whole module                                       | concrete adapters (injected by the provider)     |

ESLint blocks three of these rules: deep imports from outside the module, `services/local` imports inside `runtime/`, and React (including `presets/icons.ts`), upper-layer or Supabase imports inside `domain/`.

## How the app uses it

| Entry point (`index.ts`) | Mounted by                                         | What it does                                                                                              |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `CampaignStudio`         | `App.tsx`, tab `playerScreen` and route `/studio`  | The Studio on the app's own campaigns; "Edit in campaign settings" opens the Wizard over it               |
| `CampaignSimulator`      | `App.tsx`, "Interactive Player Sandbox" drawer     | The runtime at 390 × 844 in its own iframe, full journey on the demo gateway                              |
| `FrameHost`              | `AppRouter.tsx`, route `/xp-frame`                 | The runtime's own document: driven by the Studio through the preview bridge, or by `?fixture=` for checks |
| `PlayerExperience`       | `src/pages/play/PublicPlayPage.tsx`, `/play/:slug` | The runtime itself, always rendered in a document of its own, never inside another page's `div`           |

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
