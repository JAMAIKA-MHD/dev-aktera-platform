# AKTERA — Technical Context & Engineering Doctrine

**Version:** 1.0  
**Last updated:** 2026-09-19  
**Status:** Technical source for AI-assisted development

---

## 1. Current stack

The current MVP repository uses:

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router v6
- Framer Motion for result-reveal flows only
- `react-custom-roulette` for wheel-based campaigns
- `qrcode.react` for QR generation

### Backend / platform services currently used

- Supabase
- PostgreSQL
- Supabase Row Level Security (RLS)
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions

The current MVP uses Supabase heavily to accelerate development and validation.

This is a **current implementation choice**, not a guarantee that Supabase is the permanent architecture.

---

## 2. Why the MVP architecture looks this way

During the MVP stage, speed of validation was a priority.

The team intentionally used Supabase for substantial backend/data/auth capabilities so that product and frontend development could move quickly and the core idea could be demonstrated without prematurely investing large amounts of time in custom backend infrastructure.

As AKTERA moves toward real client deployments, the project intends to strengthen its sovereign/controlled backend, hosting, deployment, security, and infrastructure capabilities.

The transition should be treated as an engineering evolution, not as a reason to destabilize the validated MVP unnecessarily.

---

## 3. Architectural principles

### Server authority

Critical business rules must be authoritative on the server.

The browser must never be trusted to decide:

- prize outcomes;
- eligibility;
- critical reward assignment;
- anti-fraud-sensitive decisions;
- other business rules whose manipulation would compromise campaign integrity.

### Database as source of product state

The application is not a pure frontend. A substantial amount of validation and business logic is enforced through the database and edge-function layer.

### RLS is mandatory

Core tables must remain protected by Row Level Security.

### Incremental change

Prefer narrow, validated changes over broad rewrites.

### Fail honestly

Do not hide real database, security, or backend failures through broad client-side fallback logic.

### Explicit deployment boundaries

Local changes to edge functions do not automatically publish to the cloud runtime. Any required migration/deploy step must be explicitly stated.

---

## 4. Current application structure

Important files/folders from the project context:

- `src/App.tsx` — dashboard shell and operational application.
- `src/AppRouter.tsx` — route setup and protected routing.
- `src/types.ts` — domain types and schema contracts.
- `src/lib/supabase.ts` — Supabase client initialization.
- `src/contexts` — auth, player, theme, and language state.
- `src/hooks` — data-fetching hooks for campaigns, inventory, entries, and prizes.
- `src/services` — server calls and transactional business wrappers.
- `src/components` — dashboard/player UI components.
- `src/pages` — auth/public pages.
- `src/i18n` — translation system.
- `supabase/migrations` — SQL migrations.
- `supabase/functions` — edge functions.

Relevant service:

- `src/services/campaignService.ts`

Relevant edge functions:

- `supabase/functions/select-prize`
- `supabase/functions/confirm-coupon`
- `supabase/functions/create-organization`

---

## 5. Core domain entities

The current context identifies entities including:

- `Organization`
- `Profile`
- `PrizeTemplate`
- `PrizeInventory`
- `QuizQuestion`
- `Campaign`
- `LeadEntry`
- `CouponRedemption`
- `BillingPlan`

The actual repository remains authoritative for current schema details.

---

## 6. Campaign lifecycle

The current application context describes support for:

- creating draft/live campaigns;
- editing draft campaigns;
- relaunching campaigns;
- creating update drafts from active/paused campaigns;
- publishing update drafts with lineage through `source_campaign_id`;
- pause/resume/archive flows;
- safe delete restrictions for draft/archived campaigns;
- history-protected behavior when entries exist.

Any changes to campaign lifecycle should preserve history and business-integrity assumptions unless explicitly redesigned.

---

## 7. Prize and inventory integrity

The system currently supports concepts including:

- prize templates with stock/value metadata;
- reserved stock protection;
- campaign allocation tracking;
- per-item voucher/reference values;
- historical overflow rows preserved for audit;
- dependency-safe delete/update guardrails.

Prize selection is server-authoritative through `select-prize`.

Do not calculate win/loss in frontend code.

Do not create client-side fallback logic that invents a prize result if the backend fails.

---

## 8. Duplicate participation and consent

Duplicate participation enforcement is a required business rule.

Consent gating is also required before participation.

The public player CTA must remain disabled until explicit consent is obtained according to the current product implementation.

These are product/security requirements, not optional UX polish.

---

## 9. Localization boundary

Current UI labels are intended to remain in English.

Localized Arabic/Darija content may be rendered with `dir="auto"` for correct directionality.

Current font stack:

`'Poppins', 'Noto Sans Arabic', sans-serif`

---

## 10. Player experience

Public player routing is separated from the operator dashboard.

Current public route:

`/play/:slug`

Player-facing components include concepts such as:

- landing;
- game;
- quiz;
- scratch;
- mystery box;
- hit-it;
- result.

Player experiences should remain mobile-first and consent-aware.

---

## 11. Validation commands

From the current engineering context:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:seed
npm run verify
```

Recommended milestone validation:

```bash
npm run lint
npm run typecheck
npm run build
```

The repository is the final authority for the exact available scripts.

---

## 12. Future infrastructure direction

The current Supabase-backed MVP should be evolved carefully toward a more sovereign/controlled backend and deployment foundation.

The future direction includes areas such as:

- stronger backend ownership;
- cloud hosting/deployment capability;
- production operational controls;
- security hardening;
- performance and reliability improvements;
- local-market integrations;
- a deployment model suitable for real client campaigns.

These should be implemented incrementally and validated against actual customer/pilot needs.

---

## 13. Production maturity principle

The immediate goal is **production-grade pilot capability**, not premature maximum scale.

The engineering bar should therefore be high enough to safely operate a small number of real campaigns while leaving room for iterative improvement.

Do not over-engineer speculative scale before the product needs it.

Do not under-engineer critical integrity boundaries merely because the system is still an MVP.

---

## 14. AI coding doctrine

When working on AKTERA code:

1. Inspect the repository before assuming behavior.
2. Read `AKTERA_CURRENT_STATE.md` for product-state context.
3. Preserve server authority for critical business rules.
4. Preserve RLS.
5. Preserve duplicate-participation enforcement.
6. Preserve consent gating.
7. Prefer narrow changes.
8. Validate with lint/typecheck/build after milestones.
9. Call out migrations and edge-function redeployments explicitly.
10. Do not turn future architecture into current architecture by assumption.
11. Do not treat Supabase as untouchable if an explicit architectural migration is being planned, but do not rewrite it gratuitously.

---

## 15. Security-sensitive material

Never place secrets, passwords, API keys, service-role credentials, database secrets, production tokens, or demo credentials in this document or any other reusable AI context file.

The repository should use appropriate secret-management mechanisms for sensitive values.
