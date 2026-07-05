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

## 3) Phase 2 Part-one status

### Objective
Replace the old app UI with the recovered Phase 2 design while preserving product logic, routing, live data flow, and security.

### Status
- **Phase 2 Part-one: done**
- New UI integration is now the active app UI.
- Exact visual parity pass has been completed.
- Latest polish pass tightened the player frame, wheel presentation, sidebar scroll behavior, and account Telegram toggle alignment.

### What is already integrated

#### Dashboard and shell
- New sidebar/header/dashboard shell is active.
- Home, Analytics, Account, Billing, Campaign Radius, Reward Library, and Stock Room were rebuilt toward the `new-ui` design.

#### Campaign management
- Campaign list, detail, creator, edit, update, and relaunch flows remain live.
- Validation and allocation safeguards remain intact.

#### Player flow
- Landing, Game, and Result now follow the new UI direction much more literally.
- Live behavior preserved:
  - duplicate participation pre-check
  - consent gating
  - server-backed `select-prize`
  - quiz gating where required
  - instant coupon reveal for winners
  - server-backed `confirm-coupon`

#### Sandbox
- Interactive Player Sandbox exists as `/dashboard/sandbox`.
- It remains preview-only by design.
- It must not:
  - create entries
  - confirm coupons
  - mutate stock

### Important hardening completed
- The landing duplicate-check no longer falls through if verification fails.
- If the pre-check cannot be verified, the player is blocked with a friendly error instead of continuing unsafely.

---

## 4) Current validation state

Latest verified state:
- `npm run lint` passed
  - only 2 pre-existing warnings remain:
    - `src/context/AuthContext.tsx`
    - `src/context/PlayerContext.tsx`
    - warning type: `react-refresh/only-export-components`
- `npm run typecheck` passed
- `npm run build` passed

Known build note:
- Vite still reports the existing large main chunk warning.

---

## 5) Remaining Phase 2 concerns and next priorities

These are not blockers for Part-one completion.

### Open investigation
- **Wheel win-probability perception issue**
  - instrumentation already exists in `select-prize`
  - next step is validating real spins against function logs before changing any logic

### Candidate next priorities
1. Coupon lifecycle observability improvements
2. Additional anti-fraud hardening beyond per-campaign phone deduplication
3. Stability/performance pass for larger datasets
4. Backend wiring for currently preview-only new UI surfaces where needed later

---

## 6) Manual cloud actions required

Ensure these are applied in the target Supabase project if not already:
- migrations:
  - `supabase/migrations/20260703172325_add_coupon_tracking.sql`
  - `supabase/migrations/20260704111917_fix_redeem_and_duplicate_check.sql`
- edge functions:
  - `select-prize`
  - `create-organization`
  - `confirm-coupon`

---

## 7) Handoff rule for the next AI session

If another Phase 2 session starts:
1. Read this file first.
2. Treat this file as current state, not historical notes.
3. Only append new meaningful state changes.
4. Do not reintroduce old milestone-by-milestone noise.
