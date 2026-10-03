# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OCTOREACH** — Algeria-focused gamification marketing SaaS MVP. B2B brands create game-based campaigns (Wheel of Fortune, Quiz, Scratch Card, Mystery Box, Hit It); players access via public `/play/:slug` link and win prizes. Phase 2 complete, Phase 3 in progress.

## Commands

```bash
npm run dev          # Vite dev server on :3000, host 0.0.0.0
npm run build        # Production build → dist/
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run verify       # lint + typecheck + test + build (runs on pre-push)
npm run db:seed      # Seed local Supabase DB via scripts/seed.cjs
npm run backend:probe  # Local security probe: what the anon key must not reach (+ member checks with BACKEND_PROBE_EMAIL/PASSWORD)
npm run backend:smoke  # Local end-to-end check of select-prize (needs `npx supabase functions serve --env-file .env.local`)
```

Tests run with Vitest + Testing Library (jsdom): `npm test` (single run), `npx vitest run <file>` for one file.

Pre-commit runs `lint-staged` (ESLint --fix + Prettier) on staged files. Pre-push runs `npm run verify`.

### Local Supabase

```bash
npx supabase start          # Start local Supabase stack
npx supabase db reset       # Reset DB + run migrations
npx supabase functions serve # Serve Edge Functions locally (Deno)
```

Edge Function deploys to Supabase Cloud are **manual** — local code changes do NOT auto-publish.

### Firebase Deploy

```bash
firebase deploy --only hosting:demo    # Deploy to demo channel
firebase deploy --only hosting:stable  # Deploy to stable channel
```

## Architecture

### Two separate UIs in one SPA

- **Dashboard** (`src/dashboard/` + `src/components/`) — Protected B2B interface, **one URL per screen**: `dashboardRoutes.tsx` holds the route tree (`/`, `/campaigns`, `/campaigns/:id`, `/create`, `/create/:id/edit|relaunch`, `/prizes`, `/analytics[/:id]`, `/billing`, `/account`, `/studio`, `/studio/:campaignId`). `DashboardProvider` (`DashboardContext.tsx`, `useDashboard()`) loads campaigns/prizes/entries once and owns the writes; `DashboardShell` is the sidebar (real `NavLink`s) + top bar + sandbox drawer; each screen is a lazy page in `dashboard/pages/`. Build paths with `PATHS` (`dashboard/paths.ts`), never by hand. Requires auth + organization setup.
- **Player Portal** (`src/pages/play/PublicPlayPage.tsx`, lazy-loaded) — Public-facing gamified experience, accessed via `/play/:slug`. No auth required. It renders the Player Experience runtime (see below) with the design saved in the Studio and the live gateway only.

Routing is in `src/AppRouter.tsx` (React Router v7). `ProtectedRoute` wraps all dashboard paths; missing org setup redirects to `CompleteOrganizationSetupPage`.

### State & data layers

| Layer            | Pattern                               | Location            |
| ---------------- | ------------------------------------- | ------------------- |
| Global app state | React Context (Auth, Theme, Language) | `src/contexts/`     |
| Server state     | Custom hooks with Supabase queries    | `src/hooks/`        |
| Mutations        | Service functions (pure async)        | `src/services/`     |
| Undo/redo        | Zundo (wraps Zustand)                 | Player Studio store |

Custom hooks (`useCampaigns`, `usePrizeTemplates`, `useEntries`, etc.) return mapped data (DB snake_case → app camelCase) plus a `refetch` function. Services perform DB writes and validate business rules before querying.

### Supabase Edge Functions (Deno)

Located in `supabase/functions/`. Three functions:

- **`select-prize`** — Core server-side prize selection. POST with `campaign_id`, `phone_number`, game payload and `metadata` (consent proof, `client_request_id`, `source`, `wilaya`). Normalizes Algerian phone numbers (`0541234567` / `+213541234567`), refuses a participation without consent, replays the same answer for the same `client_request_id` (`replayed: true`), checks the campaign period, and claims the coupon atomically (`claim_campaign_prize_coupon`). Every error has a `code` (`INVALID_INPUT`, `CONSENT_REQUIRED`, `CAMPAIGN_CLOSED`, `ALREADY_PARTICIPATED`, `DRAW_FAILED`, `SERVER_ERROR`). Returns winner status, prize, coupon code.
- **`create-organization`** — Gated by `REGISTRATION_ENABLED` env var.
- **`confirm-coupon`** — Coupon redemption confirmation.

**Prize selection must always happen in `select-prize`, never client-side.** This is a security invariant.

### Database access for players

- **Anonymous visitors read nothing directly**: no RLS policy opens `campaigns`, `prizes`, `quiz_questions`, `entries` or `campaign_experiences` to `anon`. The public page calls `get_public_experience(p_slug)` (`SECURITY DEFINER`, safe fields only: no correct answers, weights, stock or probability), `record_campaign_impression` for visits, and the Edge Functions for participations.
- **The Studio design** lives in its own table, `campaign_experiences` (one row per campaign, org members only), written through `save_experience_config` (`authenticated`, optimistic concurrency on `updated_at`, returns `CONFLICT`). The Wizard never touches it.
- **Every new SQL function**: `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`, then an explicit `GRANT EXECUTE` to the one role that needs it. Internal draw functions (`draw_and_claim_campaign_prize`, `resolve_game_outcome`, `claim_campaign_prize_coupon`) are `service_role` only. Check with `npm run backend:probe`.
- **Deployment order matters** (front before the hardened `select-prize`, anonymous-read removal last): follow `ai-assistance-prompts-reports/backend/deploiement.md`.

### Player Experience (`src/features/player-experience/`)

Everything players see and play (welcome, registration, game, result) and the **Studio** brands use to customize it. The rest of the app imports **only** from its `index.ts` (ESLint enforces it). Its own `README.md` holds the detailed rules.

- **Layers**: `domain/` (types, zod schema + migrations, flow state machine, validation — pure TypeScript, no React), `services/` (ports and adapters), `theme/` + `presets/`, `runtime/` (player UI: layout, 8-slot frame, screens, game engines), `studio/` (editor).
- **Configuration is data**: `ExperienceConfig` is plain JSON (content and style only). Rules that decide a win (prizes, weights, stock, correct answers) never enter it; they stay in the campaign and the Wizard.
- **Ports and adapters**: `ExperienceRepository`, `ParticipationGateway`, `AssetStorage`, `AnalyticsTracker`, `HumanVerification`. Adapters in `services/supabase/` and `services/local/`, composed in `services/createSupabaseServices.ts`: `createStudioServices` (Studio and sandbox on a real campaign: design in Supabase, images in Storage, **demo** gateway — never real stock) and `createPublicServices` (`/play/:slug`: **live** gateway on `select-prize`, read-only design). The standalone Studio and `/xp-frame` keep `localStorage` and the demo gateway (`DEMO-…` codes; a runtime mounted with `allowedGatewayModes={["live"]}` refuses it).
- **Outcome authority**: game engines receive the outcome from the gateway and only animate towards it. In production the outcome comes from `select-prize` — never computed in the browser.
- **The runtime always renders in a document of its own**: the page itself in production, or a same-origin iframe (`/xp-frame`) at the device's exact CSS size in the Studio and the dashboard sandbox, zoomed with `transform: scale()` around the iframe. Never render `PlayerExperience` inside another page's `div`.
- **Responsive rules**: it must work at every size from 280–2560 × 320–1600 px, portrait and landscape. Breakpoints live only in `runtime/layout/breakpoints.ts` (variants `split:`, `tight:`, `roomy:`, `compact:`, `wide:`); no `sm:`/`md:`/`lg:`/`xl:`, no fixed pixel sizes, no `100vh`, no hard-coded colors in `runtime/` (tests fail otherwise). Game engines size on their container (`cqw`/`cqh`), never on the screen.
- **In the app**: `CampaignStudio` renders on `/studio/:campaignId` (full screen, outside the shell; `/studio/standalone` is the demo experience; `/studio` is the campaigns table; `/ui-maker` redirects there); its "Edit in campaign settings" opens `CampaignWizard` over the Studio on the right step. `CampaignSimulator` renders the "Interactive Player Sandbox" drawer (390 × 844). Both are lazy-loaded.
- **Checks**: `npm run xp:responsive -- <url>… [--quick | --full]` sweeps sizes with the runtime's own layout audit (e.g. `http://localhost:3000/xp-frame?fixture=all-games`; for long sweeps use `npm run build` + `npx vite preview --port 4173`, since the dev server reloads on any file change). `npm run xp:resize` resizes each game mid-play.
- **`/play/:slug`**: `PublicPlayPage` loads `get_public_experience` (`loadPublicExperience`), then renders `PlayerExperience` directly in the page with `createPublicServices` and `allowedGatewayModes={["live"]}`. The audit used by `xp:responsive` is exposed by `/xp-frame` only.

Planning documents (French): `ai-assistance-prompts-reports/playereditor/` (`rules.md`, `plan&tasks/plan.md`, `plan&tasks/tasks.md`, one doc per task in `tasks_docs/`) and, for the Supabase wiring, `ai-assistance-prompts-reports/backend/` (`rules.md`, `tasks.md`, `tasks_docs/`, deployment runbook `deploiement.md`).

## Non-Negotiable Rules

1. **Prize selection is server-side only** — never compute outcomes in the browser.
2. **RLS must remain enabled** on all Supabase tables.
3. **Consent gating is strict** before any participation (Algerian Law 18-07 compliance).
4. **Duplicate participation protection** must stay enforced.
5. **UI labels are English**; Arabic content uses `dir="auto"` and the `Noto Sans Arabic` font.
6. **Vite dev server host must stay `0.0.0.0`** (VM/container access).

## Key Context Documents

When doing significant work, read these for background:

- `ai-assistance-prompts-reports/phase-2-source-of-truth.md` — Current status snapshot
- `ai-assistance-prompts-reports/phase-2-closeout-report.md` — Full handoff with migration doctrine
- `docs/DATABASE_AND_TESTING_GUIDE.md` — DB seeding & testing guide
- `supabase/SEED.md` — Seed data inventory

## Environment Variables

```
VITE_SUPABASE_URL          # Supabase project URL (client-safe)
VITE_SUPABASE_ANON_KEY     # Supabase anon key (client-safe)
SUPABASE_SERVICE_ROLE_KEY  # Service role key (Edge Functions only, never expose to browser)
VITE_REGISTRATION_ENABLED  # "true"/"false" — gates /register route
REGISTRATION_ENABLED       # "true"/"false" — gates create-organization Edge Function
```

Local dev values are in `.env.local` pointing to `http://127.0.0.1:54321`.

## Type System

`src/types.ts` is the single source of truth for shared types. DB rows use snake_case; app interfaces use camelCase. The mapping happens in hooks. When adding new tables or columns, update `types.ts` and the corresponding hook mapping first.

## Font Stack

```css
font-family: "Poppins", "Noto Sans Arabic", sans-serif;
```

Dark theme for player-facing screens; light (Soft UI Neumorphic) theme for the dashboard.
