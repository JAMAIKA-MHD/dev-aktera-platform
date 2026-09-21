# Player Experience module

Everything players see and play (welcome, registration, game, result) and the Studio that brands use to customize it.
It replaces `src/components/player-ui-maker/`, `src/components/player-editor/` and `src/components/PlayerScreenConfig.tsx`, which are removed at the end of the refactor.

The rest of the app imports **only** from `index.ts`. ESLint enforces this rule.

## The five module rules

1. **Configuration is serializable data.** `ExperienceConfig` is plain JSON: no functions, no `ReactNode`, no callbacks. Content comes from the configuration, behavior comes from the flow state machine.
2. **Layout is code.** A template is a responsive React component (the 8-slot frame). Brands pick and fill; they never position anything.
3. **The outcome comes from an authority.** Game engines never decide who wins. They receive the outcome from a `ParticipationGateway` and only animate towards it. Rules that decide a win (prizes, weights, stock, correct answers, thresholds) never live in `ExperienceConfig`.
4. **Every port is asynchronous.** Storage, participation, assets, analytics and human verification go through interfaces that return promises, even with local adapters. Moving to the network changes adapters, not the UI.
5. **`domain/` never imports React**, nor anything from `services/`, `runtime/` or `studio/`. It is pure TypeScript and fully unit-tested.

## Layers

| Folder               | Content                                               | May import                                     | Must never import                                |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `domain/`            | Types, schema, rules, flow state machine              | nothing (except `zod`)                         | React, `services`, `runtime`, `studio`, Supabase |
| `services/`          | Ports and adapters (`local/` now, `supabase/` later)  | `domain`                                       | `runtime`, `studio`                              |
| `theme/`, `presets/` | Design tokens, style presets, default content         | `domain`                                       | `services`, `studio`                             |
| `runtime/`           | What players see: layout, host, frame, screens, games | `domain`, `theme`, `presets`, `services/ports` | `studio`, concrete adapters (`services/local`)   |
| `studio/`            | The editor                                            | the whole module                               | concrete adapters (injected by the provider)     |

ESLint blocks two of these rules: deep imports from outside the module, and `services/local` imports inside `runtime/`.

## References

The planning documents are in French: `ai-assistance-prompts-reports/playereditor/`.

- `rules.md`: rules for every task.
- `plan&tasks/plan.md`: target architecture.
- `plan&tasks/tasks.md`: task-by-task execution.
