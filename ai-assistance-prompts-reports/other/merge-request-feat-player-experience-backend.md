# Merge Request: `feat/player-experience-backend` → `refactor/PlayerEditor`

## Summary

This branch wires the new Player Experience (Studio + runtime) to Supabase, hardens the
backend, and adds a shadcn-based campaigns table as the entry point to the Studio.
It builds on `refactor/PlayerEditor`, which is already an ancestor of this branch
(0 commits behind, 29 ahead), so the merge is a fast-forward-equivalent with no conflicts.

## What changes

### 1. Backend hardening (Supabase)

- **New table `campaign_experiences`** (one row per campaign, org members only), written
  through `save_experience_config` with optimistic concurrency (`CONFLICT` on stale `updated_at`).
- **Safe public read**: `get_public_experience(p_slug)` (`SECURITY DEFINER`) exposes only safe
  fields: no correct answers, weights, stock or probability.
- **Anonymous access closed** on `entries` and internal functions; anonymous table reads
  (`campaigns`, `prizes`, `quiz_questions`, `campaign_experiences`) removed.
- **`select-prize` Edge Function rewritten**: strict consent gating (Law 18-07), Algerian
  phone normalization, idempotent retries via `client_request_id` (`replayed: true`),
  campaign period check, typed error `code`s.
- **Atomic coupon claim**: a coupon code is never handed to two simultaneous winners.
- **Skill games**: no prize is drawn after a failed quiz / hit-it game.
- All new SQL functions use `SET search_path = public`, `REVOKE ALL` from
  `PUBLIC, anon, authenticated`, then an explicit `GRANT` to a single role.

### 2. Player Experience wiring

- Supabase adapters: experience repository, Storage image upload, live participation
  gateway on `select-prize`; composed in `createStudioServices` (demo gateway, never real
  stock) and `createPublicServices` (live gateway, read-only design).
- Studio saves its design to Supabase and imports designs previously stored in `localStorage`.
- `/play/:slug` now renders the new runtime (`PublicPlayPage`); a closed campaign is shown
  before registration.
- **Legacy removed**: `PlayerFlowPage`, `PlayerGame`, `PlayerQuiz`, `PlayerScratch`,
  `PlayerHitIt`, `PlayerMysteryBox`, `PlayerLanding`, `PlayerResult`, `PhoneFrame`.

### 3. Studio and dashboard UX

- shadcn campaigns table (`StudioCampaignsPage`) opens the Studio for a campaign.
- Panels renamed: Brand → **Brand Identity**, Share → **Export**; preview Mode → **Scenario**.
- Screen tabs moved to the top bar; duplicate tabs removed from the Content panel.
- Languages section is now a dropdown; dark/light choice removed from Brand Identity.
- Dedicated **Back to dashboard** button in the Studio top bar.
- Signed-in users are redirected away from the login and register pages.
- **Phone is a regular form field**: required only when the form says so. The server still
  refuses a participation without a phone, and the design check now warns when the phone is
  not shown and required.

### 4. Docs

- Backend wiring plan and tasks, local end-to-end acceptance record, and the cloud
  deployment runbook (`ai-assistance-prompts-reports/backend/deploiement.md`).

## Deployment notes (order matters)

1. Deploy the front end first.
2. Apply the migrations and deploy the hardened `select-prize` Edge Function
   (Edge Function deploys are manual).
3. Remove anonymous reads last (`20260929160000_remove_anonymous_table_reads.sql`).

Follow `ai-assistance-prompts-reports/backend/deploiement.md`.

## Non-negotiable rules check

- Prize selection stays server-side only (`select-prize`).
- RLS remains enabled on all tables.
- Consent gating and duplicate participation protection are enforced.

## How to test

```bash
npm run verify          # lint + typecheck + test + build
npm run backend:probe   # what the anon key must not reach
npm run backend:smoke   # end-to-end select-prize (needs `npx supabase functions serve`)
```

Manual: open the Studio from the campaigns table, edit and save a design, then open
`/play/:slug` and play through registration, game and result.

## Merge instructions

```bash
git switch refactor/PlayerEditor
git merge --no-ff feat/player-experience-backend
```

Both branches must be kept after the merge (no branch deletion).
