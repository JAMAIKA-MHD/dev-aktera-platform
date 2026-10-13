# Merge Request: `feat/inventory-reward-library` → `develop`

## Summary

Implements **Reward Types & Inventory Logic** for the Reward Library: digital codes can expire,
a reward whose codes ran out is no longer drawn, physical rewards get a delivery status the brand
updates, and the partner libraries are announced as "Coming soon" (a brand can also register its own partners).

The existing Reward Library logic (upload, generate and import codes, duplicate detection,
allocation to campaigns, atomic assignment of one unique code per winner) is **kept**. Existing
code was only extended: the one removed line is the `select(...)` string of
`fetchTemplateItemsService`, which now also reads `expires_at`.

## What changes

### Database — one migration, `20261012090000_reward_expiry_and_delivery.sql`

- `prize_template_items.expires_at` (nullable: `NULL` = never expires).
- `entries.delivery_status` (`not_delivered` | `delivered`, default `not_delivered`) and `delivered_at`.
- `is_code_assignable(item)`: the **single** rule for "this code can be given to a winner" (has a
  value, never given, not expired). Used by the assignment and by the draw.
- `claim_campaign_prize_coupon`: same function as before, plus the rule above. The dead fallback on
  `prize_templates.item_value` (a column that does not exist, so the function raised an error
  whenever a reward had no code left) is removed: it now returns `NULL`.
- `draw_and_claim_campaign_prize`: same function as before (still `SECURITY INVOKER`, same grants),
  plus one eligibility condition in both candidate loops (probability and auto-pace). A reward is
  eligible when it has **no code loaded at all** (a plain "You Won!" or a physical reward) or when
  **at least one code is still assignable**. A reward whose codes are all used or expired is no
  longer drawn, so nobody is declared the winner of a code that does not exist.
- `set_entry_delivery_status(entry, status)`: the only way to change a delivery status. Checks:
  signed in, valid status, winning entry of a **physical** reward, member of the entry's
  organization, role is not `viewer`. A trigger (`guard_entry_delivery_status`) refuses direct
  updates of these two columns from the browser (the existing RLS lets a member update entries).
- All new functions: `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`,
  then an explicit `GRANT`. Nothing is granted to `anon`.

### Edge Function — `select-prize`

- If a win has codes but none could be given (the last code went to another winner between the
  draw and the claim), the entry is flagged `metadata.reward_unavailable = true` and a warning is
  logged, so the brand can settle it by hand. Error codes and response shape are unchanged.

### Dashboard — Reward Library (`/prizes`)

- **A hub of libraries** at `/prizes`: a Local Library card (summary of the brand's rewards, opens
  `/prizes/local`, the previous screen with a way back) and Gifty, Yassir and Chargily as Coming soon.
- **"Add a partner"**: a button and a form (name, what they offer, website, contact person, phone,
  email) to register a partner the brand works with. New table `reward_partners`
  (migration `20261013090000_reward_partners.sql`): members of the organization read, anyone but a
  viewer writes, unique name per organization, email and website checked in the database, nothing
  for `anon`. The partners appear as "Not connected yet" cards; nothing is connected to them.
- **Local Library** (`/prizes/local`): the previous screen, unchanged.
- **Digital codes:** an "Expires" column (date per code, valid until the end of that day in Algeria,
  stored in UTC), an "Expired" badge (the code stays visible), a summary
  "X available · Y used · Z expired", a warning when the codes will run out, and "Expiry for all
  codes" (keeps dates already set unless asked to replace them).
- **Physical rewards:** a "Winners & delivery" panel listing the winners with a
  `Not delivered / Delivered` selector (rollback and message on refusal, read-only for a `viewer`).
  The panel says plainly: "You handle delivery. AKTERA only records the status." No address,
  carrier, tracking or notification.

## Compatibility and risk

- Additive: existing rows keep today's behavior (`expires_at` is `NULL`, `delivery_status` defaults
  to `not_delivered`). The old front and the old `select-prize` keep working with the new database,
  so the deployment order is not critical; recommended: migration → Edge Function → front
  (see `ai-assistance-prompts-reports/backend/deploiement.md`, section 11).
- **Residual risk (accepted for the MVP):** in the few milliseconds between the draw and the code
  assignment, the last code can be taken by another winner. The entry is then flagged
  `reward_unavailable` (not cancelled). Cancelling the win would need more SQL; to decide if this
  shows up in production.
- **Known gap, outside this MR:** the existing `update_org_entries` policy lets any member update
  other columns of `entries` (`is_winner`, `prize_id`…). Only the delivery columns are protected
  here. Tracked in `ai-assistance-prompts-reports/other/analyse-organisations.md`.
- **Known edge case:** replacing a code through the import's "replace" mode keeps the row's
  `expires_at`.
- Deploying the Edge Function is manual (see the runbook).

## How to test

Local stack (`npx supabase start`, then `npx supabase db reset`, `npm run db:seed`):

```bash
npm run backend:probe     # anon cannot reach the new functions            (21 checks)
npm run backend:rewards   # expiry, concurrency, exhausted draw, delivery   (21 checks)
npx supabase functions serve --env-file .env.local   # in another terminal
npm run backend:smoke     # select-prize end to end                         (15 scenarios)
npm run verify
```

Manual, in the dashboard (`/prizes`):

1. Digital reward: add codes, set one date in the past → "Expired" badge and counts; the player never
   receives it. Use "Expiry for all codes".
2. Allocate 3 wins to a campaign with only 1 valid code: one winner gets the valid code, then nobody
   wins this reward; the warning in the reward explains why.
3. Reward with no code at all: the player wins and sees "You Won!" without a code.
4. Physical reward: after a win, open it → "Winners & delivery" → `Delivered`, reload, still
   delivered; a `viewer` account sees it read-only.
5. `/prizes`: the hub with Gifty, Yassir and Chargily as "Coming soon"; "Add a partner" opens the form and
   the new partner shows as "Not connected yet"; a `viewer` sees the list but no button.

## Tests

- SQL/API: `backend:rewards` (21), `backend:probe` (21), `backend:smoke` (15; new scenarios T11–T14).
- Unit/UI (Vitest): expiry helpers, services (expiry, delivery), `RewardLibrary`, `CodeExpiryCell`,
  `CodeStockSummary`, `PhysicalDeliveryPanel`, and the real code modal of `PrizesManager`.
- `npm run verify` on a clean checkout: lint and typecheck clean, 1160 tests green (2 tests of other
  features timed out once under load and pass when run alone), build OK.

## Rules check

Prize selection stays server-side only; RLS untouched on every table (only columns, functions and
one trigger added); consent and duplicate-participation checks untouched; UI labels in English.

## Files worth reading

| What                          | Where                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Migration                     | `supabase/migrations/20261012090000_reward_expiry_and_delivery.sql`                     |
| Edge Function                 | `supabase/functions/select-prize/index.ts` (`flagMissedReward`)                         |
| Expiry rules and date helpers | `src/lib/codeExpiry.ts`                                                                 |
| Services                      | `src/services/inventoryService.ts`, `src/services/deliveryService.ts`                   |
| UI                            | `src/components/rewards/*`, `src/components/PrizesManager.tsx` (three insertion points) |
| Probes                        | `scripts/backend/rewards-probe.mjs`, `anon-probe.mjs`, `select-prize-smoke.mjs`         |
| Plan, rules, tasks            | `ai-assistance-prompts-reports/reward library/`                                         |
