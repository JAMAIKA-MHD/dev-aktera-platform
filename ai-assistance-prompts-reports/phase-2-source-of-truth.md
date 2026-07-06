# YOUENGAGE MVP - Phase 2 Source of Truth

This file is the only active Phase 2 reference.
It should stay short and reflect the current usable state only.

---

## 1) Working rules

1. Use this file as the canonical Phase 2 status.
2. Work in small milestones.
3. Validate after each code milestone:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
4. If Supabase migrations or edge-function deploys are needed, list them here and mention them in chat.
5. Do not keep outdated milestone history or failed early attempts in this file.

---

## 2) Product and architecture baseline

### Runtime source of truth
- Production app stays in `src/`.
- Keep:
  - `src/App.tsx` routing
  - `AuthContext`
  - `PlayerContext`
  - current hooks in `src/hooks/*`
  - current Supabase flows and edge functions
- The generated Phase 2 UI was recovered from git history (`ff51f0d` on `origin/new-ui-google-ai-studio`) and applied into `src/`.

### Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Routing: React Router v6
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions)
- Core edge functions:
  - `select-prize`
  - `create-organization`
  - `confirm-coupon`

### Non-negotiable constraints
- Prize outcome stays server-side only.
- RLS/security behavior must stay intact.
- Existing duplicate-participation protection must stay intact.
- Coupon assignment and confirmation flows must stay intact.
- Campaign draft/edit/update/relaunch lifecycle must stay intact.
- Template-level inventory allocation safeguards must stay intact.
- All UI labels stay English.
- Arabic-capable dynamic content must use `dir="auto"`.
- Player screens stay mobile-first with max width 480px and 48px minimum touch targets.
- Player CTA stays disabled until consent is checked.

---

## 3) Milestone Status

### M1 — Foundation ✅
- Packages: `@supabase/supabase-js`, `react-router-dom` installed; `@google/genai` removed.
- `src/lib/supabase.ts` — Supabase client from env vars.
- `src/lib/errorMessages.ts` — toFriendlyErrorMessage() mapper.
- `src/contexts/AuthContext.tsx` — session + profile + org loading.
- `src/contexts/PlayerContext.tsx` — player game state tracking.
- `src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx` — auth pages.
- `src/AppRouter.tsx` — BrowserRouter with protected + public routes.
- `vite.config.ts` fixed (host: `0.0.0.0`, no unicode corruption).
- `tsconfig.json` fixed (vite/client types, supabase/functions excluded).
- **Validation:** `lint ✅  build ✅`

### M2 — Dashboard Data Wiring ✅
- `src/hooks/useCampaigns.ts` — fetches campaigns + prizes + quiz_questions + entry counts.
- `src/hooks/usePrizeTemplates.ts` — fetches prize templates, computes stock, and counts prepared per-item values from `prize_template_items`.
- `src/hooks/useEntries.ts` — fetches entries with prize/campaign join.
- `src/App.tsx` — all handlers made async + Supabase-wired:
  - `handleAddPrize`, `handleUpdateStock` → prize_templates mutations.
  - `handleSaveCampaign`, `handleToggleCampaignStatus`, `handleArchiveCampaign`, `handleRelaunchTrigger` → campaigns mutations.
  - Sandbox `handleSandboxGameComplete` — now visual-only, no mock DB writes.
  - Header: org name display, signout button, actionError banner.
- `src/components/AccountSettings.tsx` — wired to `useAuth()`: loads real org name, full_name, email; saves via Supabase.
- **Validation:** `lint ✅  build ✅`

### M3 — Player Flow ✅
- `src/types.ts` — `Prize.id?: string` added; `BrandPreset.prizes` changed to `Prize[]`.
- `src/components/PlayerGame.tsx` — `targetPrize?: Prize` prop added: when server provides outcome, wheel lands on that exact slice; sandbox fallback to `forcedOutcome` logic preserved.
- `src/components/PlayerResult.tsx` — `entryId?` and `onCouponConfirmed?` props added; confirm button calls `confirm-coupon` edge function.
- `src/pages/play/PlayerFlowPage.tsx` — full real player flow:
  - Loads campaign by slug (anon public read; see RLS note below).
  - State machine: `loading → landing → submitting → game → result` (plus `not-found`, `inactive`, `duplicate`, `error`).
  - `handleRegister` calls `select-prize` edge function; handles duplicate, inactive, and error states.
  - `handleGameComplete` transitions to result after wheel animation.
  - `handleCouponConfirmed` calls `confirm-coupon` edge function.
  - Loser slot (`LOSER_SLOT`) added as fixed wheel segment for non-winners.
- **Validation:** `lint ✅  build ✅`

### M4 — Quiz Game Screen ✅
- `src/components/PlayerQuiz.tsx` — new mobile-first quiz challenge screen:
  - One question at a time, animated slide between questions
  - Progress bar tracks current question
  - Instant feedback: green flash for correct, red for wrong (1.2s before advancing)
  - Summary screen: pass/fail based on majority score (>50%), Arabic bilingual text
  - "Spin the Wheel!" / "Spin Anyway" CTA — always proceeds to wheel after quiz
- `src/pages/play/PlayerFlowPage.tsx` updated:
  - New `quiz` state in the screen state machine
  - Loads `require_quiz` + `quiz_questions` when fetching campaign by slug
  - Quiz campaigns: `landing → quiz → submitting → game → result`
  - Non-quiz campaigns: unchanged (`landing → submitting → game → result`)
  - `callSelectPrize()` shared helper passes `quiz_passed` boolean to edge function
- `supabase/functions/select-prize/index.ts` updated:
  - Quiz campaigns with `quiz_passed=true` → run wheel probability + weighted prize selection
  - Quiz campaigns with `quiz_passed=false` → always loser (entry still recorded)
  - Non-quiz campaigns: unchanged behavior
- **Validation:** `lint ✅  build ✅`

---

## 4) Manual Supabase Actions Required

### ✅ Supabase actions already executed by agent
- Full clean reset performed via Supabase Management API (not MCP — MCP tools were broken).
- All 10 migrations applied in order. All RLS policies confirmed.
- All 3 edge functions redeployed: `select-prize`, `confirm-coupon`, `create-organization`.
- Anon read policies applied to `campaigns`, `prizes`, `quiz_questions`, and anon insert on `entries`.
- `supabase/FULL_RESET.sql` committed — can be used in Supabase SQL editor for future resets.
- **Post-reset fix:** raw schema reset had removed PostgREST grants, which broke dashboard CRUD and `create-organization`. A follow-up migration restores API grants/default privileges and adds an authenticated organization-recovery RPC for orphaned auth users.
- Follow-up migration `20260706091000_restore_api_grants_and_add_org_recovery.sql` was also applied directly to the live Supabase project.
- **Status: no manual Supabase action currently required. When the agent can do Supabase work directly, it should do it and record it here.**

### Pending (known technical debt):
- **Migration needed:** `ALTER TABLE campaigns ADD COLUMN arabic_name TEXT;`
  - Currently, `arabicName` is stored in `campaigns.description` as a workaround.
  - After this migration, update `useCampaigns.ts` and `PlayerFlowPage.tsx` to read from `arabic_name`.

---

## 5) Key Data/Mapping Notes
- `campaigns.win_probability`: stored as DECIMAL 0–1; multiply ×100 for UI display, ÷100 for DB writes.
- `campaigns.status`: DB has `'ended'` → mapped to `'archived'` in `useCampaigns`.
- `prize_templates.stock_quantity`: total coupon item count.
- `prize_template_items.item_value`: actual coupon code string.
- `prize_template_items` is now the intended place for:
  - real voucher/coupon codes for digital rewards
  - optional serial/reference/warehouse IDs for physical rewards
- Prize template creation stores the reusable display value only; item-by-item values are prepared inside Stock Room per reward template.
- `entries.redeemed_coupon_value`: the coupon code assigned to a winning entry.
- `entries.coupon_confirmed`: boolean; set true by `confirm-coupon` edge function.

---

## 6) Current Journey Snapshot
- **Completed and working**
  - M1 foundation/auth/router
  - M2 dashboard data wiring
  - M3 player portal live flow
  - M4 quiz game flow
  - post-reset auth/org recovery
  - Supabase DB reset, grants restore, and edge-function redeploy
  - prize template stock-room value preparation UI (manual + CSV per selected reward)
- **Current remaining work**
  - `campaigns.arabic_name` DB column migration + frontend switch away from the temporary `description` workaround
  - any additional UI polish or bugs discovered during real operator testing
- **Important product rule**
  - reward outcome still stays server-side; stock-room value preparation only manages which code/reference can later be attached to a winning entry

---

## 7) Known Bugs / Discovered Issues (updated)
- ✅ **Fixed (490ad18):** `AccountSettings` and `BillingUsage` were using dark player-portal
  color tokens (`#161625`, `#0F0F1A`, `text-slate-100`) inside the white dashboard — they
  appeared as broken dark panels. Both converted to light dashboard theme (white bg,
  `border-gray-200`, `text-slate-800`).
- ✅ **Fixed (490ad18):** `CampaignWizard` step 3 had stale prize `templateId` (`''`) when
  prizes hadn't loaded at wizard mount time. Added `useEffect` to sync empty slots when
  prizes load. Added empty-state placeholder option. Added validation to block save with
  zero valid prizes.
- ✅ **Fixed (632b8b7):** Prize creation form was silently failing (fire-and-forget). `PrizesManager.handleSubmit` now async, shows inline error, keeps form open on failure.
- ✅ **Fixed (632b8b7):** `handleAddPrize` in `App.tsx` now rethrows Supabase errors so the form catches them.
- ✅ **Fixed (799fc95):** DB fully reset and clean — all migrations + RLS applied. No leftover state from Phase 1 reset attempts.
- ✅ **Fixed (current):** reset process now restores missing API grants/default privileges, which were required for authenticated CRUD and edge-function database access.
- ✅ **Fixed (current):** authenticated users whose `auth.users` account survived a reset but lost `profiles`/`organizations` now see a recovery screen and can recreate their organization setup without manual SQL.
- ✅ **Fixed (current):** stock room now supports prize-specific per-unit values:
  - voucher templates can store real coupon/code values per unit
  - physical templates can store optional serial/reference IDs per unit
  - CSV import is now done inside the selected reward room instead of as a global stock-room action
- Sandbox PlayerResult "TEST ANOTHER BRAND" button has sandbox-only label; real flow uses same component with "Back to Campaign" label. No bug, but label is shared — acceptable for MVP.
- Chunk size warning in Vite build (>500 kB) — cosmetic only, no functional impact for MVP.
