# YOUENGAGE MVP - Phase 2 Source of Truth

Last updated: 2026-07-06
Status: Phase 2 implementation complete in codebase, with one operational cloud action pending (edge-function redeploy).

---

## 1) Purpose of this file

This file is the canonical, concise status snapshot for Phase 2.

Use this file to quickly answer:
- what was delivered in Phase 2,
- what rules must not be broken,
- what cloud/runtime actions are still pending,
- where Phase 3 should start.

For full handoff detail, use:
- `ai-assistance-prompts-reports/phase-2-closeout-report.md`

---

## 2) Non-negotiable product and security rules

These rules stay mandatory in all future phases:

1. **Server-side prize decision only**
   - Win/loss and prize allocation are decided in Supabase Edge Function (`select-prize`), never in frontend logic.

2. **RLS-first data model**
   - All core tables (`campaigns`, `prizes`, `quiz_questions`, `entries`, plus inventory/template/coupon tables) remain protected with RLS.

3. **Coupon flow remains server-backed**
   - Coupon assignment and confirmation continue through backend flow (`select-prize`, `confirm-coupon`), not local-only state.

4. **Duplicate participation enforcement is required**
   - Duplicate checks must remain enforced per campaign and per configured max entries.

5. **Consent gating (Loi 18-07) remains strict**
   - Player CTA must stay disabled until consent checkbox is explicitly checked.

6. **Localization boundary**
   - UI labels/buttons remain in English.
   - Arabic/Darija content fields must render safely with `dir="auto"`.

---

## 3) Architecture baseline (Phase 2 final)

- **Frontend:** React + Vite + TypeScript + Tailwind.
- **Backend:** Supabase (Postgres, RLS, Storage, Edge Functions).
- **Key screens now wired to live data:** campaigns, campaign workspace, prize templates, stock room, analytics, billing, account settings, player portal.
- **Storage bucket in use for media uploads:** `campaign-media`.

---

## 4) Phase 2 milestone ledger (M1 -> M11)

## Milestone M1 - Foundation and auth/router wiring
### Scope delivered
- Core app skeleton stabilized.
- Authentication and protected dashboard routing wired.
- Base context/hooks foundations recovered.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M2 - Dashboard data wiring
### Scope delivered
- Dashboard switched from static placeholders to live Supabase-backed data hooks.
- Campaigns, rewards, and lead lists wired into operational views.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M3 - Player flow integration
### Scope delivered
- Public player flow connected to live campaign data.
- Submission flow integrated with edge-function-backed participation logic.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M4 - Quiz flow hardening
### Scope delivered
- Quiz campaign path implemented and stabilized.
- Quiz-to-spin progression connected to server evaluation path.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M5 - Campaign operator workspace parity
### Scope delivered
- Campaign detail workspace restored.
- Open/copy live link actions restored.
- Participant context and campaign configuration visibility restored.
- In-context pause/resume operations restored.
- Draft edit entry flow restored.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M6 - Update-draft lifecycle parity
### Scope delivered
- Update-draft flow added for active/paused campaigns.
- Publish-update-live flow implemented with lineage via `source_campaign_id`.
- Safety behavior added: source status restoration if final activation fails.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M7 - Prize template management parity
### Scope delivered
- Prize template create/edit/delete workflow rebuilt.
- Dependency-aware delete blocking restored.
- Reserved-stock safety checks added for stock reductions.
- Template usage context surfaced before destructive actions.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M8 - Inventory hardening
### Scope delivered
- Stock room visibility clarified (prepared/reserved/distributed).
- Template-level campaign usage and historical wins surfaced.
- Historical overflow rows preserved read-only for audit traceability.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M9 - Analytics and billing parity
### Scope delivered
- Analytics moved to uncapped live aggregate data.
- Campaign breakdown table added.
- Billing page moved to live billing rows + plan usage calculations.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M10 - Account/schema cleanup
### Scope delivered
- Added `campaigns.arabic_name` migration path.
- Campaign read/write layers migrated to `arabic_name`.
- Account settings persistence flow cleaned (org contact vs auth email responsibilities).
- Temporary migration compatibility fallback introduced during rollout, then removed post-migration confirmation.

### Validation
- `npm run lint` passed during delivery.
- `npm run build` passed during delivery.

---

## Milestone M11 - Final parity bugfix and polish pass
### Scope delivered
- Campaign delete parity added with history-safe guards (draft/archived only, participant history protected).
- Campaign save hardening added (slug collision checks + stock-safe allocation checks).
- Duplicate participation hardening improved:
  - normalized DZ phone handling in `select-prize`,
  - max-entry-aware participation limit logic.
- Player duplicate UX improved (business duplicate flows no longer surface technical connection copy).
- Image parity completed:
  - campaign image upload + display (dashboard and player surfaces),
  - prize image upload + display (library and stock room),
  - generic fallback images when user image is missing.

### Validation (latest run)
- `npm run lint` ✅
- `npm run build` ✅
- `npm run typecheck` is not defined separately in this repo (lint already runs `tsc --noEmit`).

---

## 5) Manual Supabase actions status

### Completed
- Core DB reset/recovery actions and migrations were previously completed.
- `campaigns.arabic_name` migration was manually applied and confirmed.

### Pending now
- **Redeploy edge function `select-prize`** to publish latest duplicate-participation hardening to cloud runtime.
  - Local code is updated.
  - MCP deploy was unavailable in-session due missing API key context.

---

## 6) Current capabilities (Phase 2 baseline)

### Campaign operations
- Create draft/live campaigns.
- Relaunch existing campaigns.
- Create update drafts from active/paused campaigns.
- Publish update drafts with lineage preservation.
- Pause/resume/archive campaigns.
- Safe delete for draft/archived campaigns without participant history.

### Rewards and inventory
- Full prize template CRUD with dependency guards.
- Per-template stock management with reserved-stock protection.
- Per-item voucher/reference value preparation (manual + CSV) inside stock room.
- Historical stock rows retained for audit continuity.

### Player flow
- Live wheel + quiz campaign support.
- Consent-gated registration path.
- Server-side result determination.
- Duplicate participation handling with user-safe messaging.

### Media
- Campaign and prize image upload via Supabase Storage (`campaign-media`).
- Display wiring across key dashboard/player surfaces.
- Generic fallback visuals when no media is uploaded.

### Analytics, billing, account
- Live aggregated analytics.
- Billing history/usage visibility from live data.
- Account/org settings persistence cleanup delivered.

---

## 7) Known limits at Phase 2 close

- Automated billing checkout/plan-upgrade flow is still not implemented.
- Optional legal identity fields (e.g. NIF/RC) are not fully productized server-side.
- Chunk-size warning remains in production build output (non-blocking for MVP).

---

## 8) Phase 3 recommended start checklist

1. Redeploy `select-prize` so cloud runtime matches latest local duplicate-protection logic.
2. Run operator regression pass across:
   - campaigns lifecycle,
   - player duplicate flows,
   - image upload/render paths,
   - inventory value workflows,
   - analytics/billing/account.
3. Prioritize business gaps (billing automation, legal fields, optional UX/perf polish).

---

## 9) Companion context files and usage

- `phase-2-closeout-report.md`  
  Full detailed baseline and handoff narrative for Phase 3.

- `phase-1-closeout-report.md`  
  Historical baseline and style reference for milestone documentation.

- `context-migration-bridge.md`  
  Core migration principle: new UI should reuse validated old business logic/security model rather than rebuild from scratch.

