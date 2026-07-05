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
