# OCTOREACH

OCTOREACH is an Algeria-focused gamification marketing SaaS MVP for B2B brands.  
This repository is wired to the validated Supabase business logic model.

This README describes the **current Phase 2 version**: what works, what is still limited, and how to continue safely in Phase 3.

---

## 1) Core stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Supabase (Postgres, RLS, Storage, Edge Functions)
- Key edge functions:
  - `select-prize`
  - `confirm-coupon`
  - `create-organization`

---

## 2) Current capabilities (Phase 2)

## Campaign management

- Create draft/live campaigns
- Edit draft campaigns
- Relaunch campaigns
- Create update drafts from active/paused campaigns
- Publish update drafts live with source lineage
- Pause/resume/archive campaigns
- Safe delete for draft/archived campaigns (history-protected)

## Rewards and inventory

- Prize template create/edit/delete
- Dependency-safe delete blocking
- Stock adjustment with reserved-stock protection
- Per-item voucher/reference values in Stock Room (manual + CSV)
- Historical overflow rows preserved read-only for audit

## Player flow

- Wheel and quiz campaign support
- Consent-gated participation (Loi 18-07 behavior)
- Server-side outcome enforcement
- Duplicate participation handling with player-safe duplicate UX

## Analytics, billing, account

- Live analytics aggregate dashboard and campaign breakdown
- Live billing history and plan-usage visualization
- Account/org persistence cleanup (organization vs profile/auth responsibilities)

## Media support

- Campaign image upload + display
- Prize template image upload + display
- Fallback generic visuals when no image is uploaded

---

## 3) Current limits (known non-blocking gaps)

1. Automated checkout/payment upgrade flow is not implemented yet.
2. Optional legal business fields (NIF/RC) are not fully productized end-to-end.
3. Build output warns about large chunk size (functional behavior unaffected).
4. Edge-function deployment is a separate cloud operation (local code changes do not auto-publish).

---

## 4) Critical behavioral rules (must not be broken)

1. **Prize decision must remain server-side.**
2. **RLS must stay enabled and respected on all core data paths.**
3. **Duplicate participation protection must remain enforced.**
4. **Consent gating must remain strict before participation submit.**
5. **UI labels remain English; Arabic content fields render with `dir="auto"`.**

---

## 5) Context files guide (important)

These files are the baseline context for future AI/human contributors:

- `ai-assistance-prompts-reports/phase-2-closeout-report.md`  
  Full Phase 2 closeout + Phase 3 handoff baseline (primary document).

- `ai-assistance-prompts-reports/phase-2-source-of-truth.md`  
  Condensed canonical status snapshot.

- `ai-assistance-prompts-reports/phase-1-closeout-report.md`  
  Historical context and milestone style reference.

- `ai-assistance-prompts-reports/context-migration-bridge.md`  
  Migration doctrine (new UI + existing validated business logic/security model).

---

## 6) Local development

Prerequisites:

- Node.js 18+ recommended
- npm
- Supabase project credentials in `.env`

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Validation commands:

```bash
npm run lint
npm run build
```

---

## 7) Sample Data & Local Seeding

To quickly populate realistic sample data for local development (2 demo organizations, 8 campaigns, prize inventory, and 125 realistic entries with Algerian mobile numbers across the last 14 days):

```bash
npm run db:seed
```

Or when running a full database reset via the Supabase CLI:

```bash
supabase db reset
```

For full details on seed data structure and test URLs, see [`supabase/SEED.md`](supabase/SEED.md).

---

## 8) Supabase operational notes

- Database migrations are in `supabase/migrations`.
- Full reset reference is in `supabase/FULL_RESET.sql`.
- Storage/media relies on bucket `campaign-media`.

If you change edge function code (example: `supabase/functions/select-prize/index.ts`), you must redeploy function runtime to cloud:

- Supabase Dashboard or Supabase CLI deployment flow.

---

## 8) Phase 3 recommended first step

1. Redeploy `select-prize` `create-organization` `confirm-coupon` (if local changes were made and not yet deployed).
2. Run regression across campaign lifecycle, player duplicate behavior, stock-room value workflows, and media upload/display paths.
3. Continue with product gaps (billing automation, legal-field support, optional UX/perf polish).
