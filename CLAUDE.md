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
```

No test framework is configured yet — `npm test` echoes a placeholder.

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

- **Dashboard** (`src/App.tsx` + `src/components/`) — Protected B2B interface, tab-based (`TabType`). Requires auth + organization setup.
- **Player Portal** (`src/pages/play/PlayerFlowPage.tsx`) — Public-facing gamified experience, accessed via `/play/:slug`. No auth required.

Routing is in `src/AppRouter.tsx` (React Router v7). `ProtectedRoute` wraps all dashboard paths; missing org setup redirects to `CompleteOrganizationSetupPage`.

### State & data layers

| Layer            | Pattern                                       | Location            |
| ---------------- | --------------------------------------------- | ------------------- |
| Global app state | React Context (Auth, Theme, Language, Player) | `src/contexts/`     |
| Server state     | Custom hooks with Supabase queries            | `src/hooks/`        |
| Mutations        | Service functions (pure async)                | `src/services/`     |
| Undo/redo        | Zundo (wraps Zustand)                         | Player editor store |

Custom hooks (`useCampaigns`, `usePrizeTemplates`, `useEntries`, etc.) return mapped data (DB snake_case → app camelCase) plus a `refetch` function. Services perform DB writes and validate business rules before querying.

### Supabase Edge Functions (Deno)

Located in `supabase/functions/`. Three functions:

- **`select-prize`** — Core server-side prize selection. POST with `campaign_id`, `phone_number`, game payload. Normalizes Algerian phone numbers (`0541234567` / `+213541234567`). Returns winner status, prize, coupon code.
- **`create-organization`** — Gated by `REGISTRATION_ENABLED` env var.
- **`confirm-coupon`** — Coupon redemption confirmation.

**Prize selection must always happen in `select-prize`, never client-side.** This is a security invariant.

### Player UI Maker / Player Editor

`src/components/player-ui-maker/` and `src/components/player-editor/` — drag-and-drop visual editor for customizing player-facing screens. Uses `@dnd-kit`. Rendered output is in `player-ui-maker/runtime/`. Preview via `PlayPreviewModal`.

### Game engines

`src/components/player-editor/engines/` — individual game renderers (Wheel, Quiz, ScratchCard, MysteryBox, HitIt, etc.). Each game reads campaign config and dispatches results back to `PlayerContext`.

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
