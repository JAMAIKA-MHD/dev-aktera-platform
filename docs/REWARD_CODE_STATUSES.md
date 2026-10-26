# Reward Library — statuses of codes, wins and deliveries

Reference for what "available", "used", "redeemed", "expired", "empty", "delivered" mean in the
Reward Library, where each one comes from in the database, and every combination a code can be in.

Related: `ai-assistance-prompts-reports/reward library/` (plan, rules, tasks, merge request) and
`docs/DATABASE_AND_TESTING_GUIDE.md` (local database, seed, tests).

---

## Naming of the two kinds of reward

Naming convention of the product, used on every screen and in every file:

| Kind                     | Name shown                                 | Stored value (`prize_templates.category`) |
| ------------------------ | ------------------------------------------ | ----------------------------------------- |
| Virtual (made of codes)  | **Digital Item** (plural: Digital Items)   | `voucher`                                 |
| Handed over by the brand | **Physical Item** (plural: Physical Items) | `physical`                                |

The stored values do not change (database, API). The names come from one module,
`src/lib/rewardTypes.ts`; a test (`src/lib/rewardTypes.test.ts`) fails if a screen of the Reward
Library, or any screen that shows the type of a reward, uses another name (digital code, physical
reward, voucher, merch...) or prints the stored value.

---

## 1. The three vocabularies

| Where                                                   | Values                                             | What it describes                           |
| ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Codes table of a reward (`/prizes/local/:rewardId`)     | **Prepared** / **Empty** / **Redeemed**            | the state of a code slot                    |
| Export file, "X available · Y used · Z expired" summary | **Available** / **Used** / **Expired** / **Empty** | the state of a code as stock                |
| Physical Items                                          | **Not delivered** / **Delivered**                  | the delivery, per **winner** (not per code) |

> **"Redeemed" / "Used" means "given to a winner".** It does **not** mean "used in a shop". AKTERA does
> not track in-store use.

---

## 2. What makes a code "given"

A code is given as soon as a row exists in `coupon_redemptions` for its id. That row is the proof.

| Column                                        | Role                                                                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coupon_redemptions` (one row per code given) | **The proof.** Created by `claim_campaign_prize_coupon`. `UNIQUE (prize_template_item_id)`: a code can be given once. `entry_id` cascades: deleting the entry removes the proof.               |
| `coupon_redemptions.expires_at`               | The deadline fixed at delivery, for a reward valid "N days after delivery".                                                                                                                    |
| `coupon_redemptions.redeemed_by_player`       | Always `false`. Nothing sets it to `true`. Dead column.                                                                                                                                        |
| `entries.redeemed_coupon_value`               | The code the winner received. `NULL` for a reward without a code.                                                                                                                              |
| `entries.coupon_confirmed`                    | The player pressed "I copied my code" on the result screen (`confirm-coupon`). Not an in-store use.                                                                                            |
| `prize_template_items.is_used`, `redeemed_at` | Set by `select-prize` after the claim. A **duplicate of the proof**: the dashboard recomputes the state from `coupon_redemptions`, so this flag can be out of step (the seed does not set it). |
| `prize_template_items.item_value`             | Empty or `NULL` = a slot without a code.                                                                                                                                                       |
| `prize_template_items.expires_at`             | The code's own date.                                                                                                                                                                           |
| `prize_templates.expires_at` / `expiry_days`  | The reward's fixed date, or its validity period after delivery. Never both (CHECK), Digital Items only (CHECK).                                                                                |

The dashboard (`fetchTemplateItemsService`) treats a code as given when it is in `coupon_redemptions`
**or** when an entry of the organization received exactly that code text.

### Which date counts

For a code, in order: **its own date** → **the deadline fixed at delivery** → **the reward's date**.
In SQL, `is_code_assignable` uses `COALESCE(item.expires_at, reward.expires_at)`; a code not yet given
under a validity period has no deadline until it is given.

---

## 3. Every case of a code of a Digital Item

| #   | Situation in the database                           | Codes table                    | Export / summary | Can still be given?                 | "Expires" column                                                              |
| --- | --------------------------------------------------- | ------------------------------ | ---------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `item_value` empty                                  | **Empty**                      | Empty            | no                                  | "—"                                                                           |
| 2   | Code, never given, no date anywhere                 | **Prepared**                   | Available        | **yes**                             | empty                                                                         |
| 3   | Never given, own date in the future                 | Prepared                       | Available        | yes                                 | that date                                                                     |
| 4   | Never given, own date **in the past**               | Prepared + **Expired** badge   | **Expired**      | **no**                              | that date                                                                     |
| 5   | Never given, no own date, reward date in the future | Prepared                       | Available        | yes                                 | the reward's date, "from reward"                                              |
| 6   | Same, reward date **in the past**                   | Prepared + Expired badge       | Expired          | no                                  | the reward's date                                                             |
| 7   | Never given, reward valid N days after delivery     | Prepared                       | Available        | yes (the countdown has not started) | "1 month after delivery"                                                      |
| 8   | **Given**, no deadline                              | **Redeemed** (red row, locked) | **Used**         | no (taken)                          | empty                                                                         |
| 9   | Given, reward valid N days after delivery           | Redeemed                       | Used             | no                                  | the deadline fixed at delivery (end of that day in Algiers), "after delivery" |
| 10  | Given, own date or reward date                      | Redeemed                       | Used             | no                                  | that date                                                                     |
| 11  | Cases 8–10 whose deadline has **passed**            | Redeemed + Expired badge       | **Used**         | no                                  | the past deadline                                                             |

Rules:

- **Used wins over Expired.** A given code whose deadline passes stays "Used" (the row shows the badge).
- **A code not yet given never expires under a validity period**: the countdown starts at delivery, and
  the deadline is frozen then. Changing the reward afterwards does not move it.
- **An own date wins over the reward's**, in both directions.
- The draw leaves out a reward whose codes are all given or expired. A reward with **no code loaded at
  all** stays drawable (the "You Won!" without a reward).

---

## 4. The status of a win (`entries`)

| Case                                                                     | `is_winner` | `redeemed_coupon_value` | Notes                                                                           |
| ------------------------------------------------------------------------ | ----------- | ----------------------- | ------------------------------------------------------------------------------- |
| Loser                                                                    | false       | `NULL`                  | no prize                                                                        |
| Winner of a Digital Item                                                 | true        | the code                | one row in `coupon_redemptions`                                                 |
| Winner of a Digital Item, last code taken between the draw and the claim | true        | `NULL`                  | `metadata.reward_unavailable = true`: to settle by hand                         |
| Winner of a reward without code ("You Won!")                             | true        | `NULL`                  | normal, not flagged                                                             |
| Winner of a **physical** reward                                          | true        | `NULL`                  | `delivery_status`: `not_delivered` (default) → `delivered`, with `delivered_at` |

Only `set_entry_delivery_status` changes the delivery (signed in, member of the entry's organization,
not a `viewer`, a winning entry of a Physical Item). A trigger refuses direct updates of
`delivery_status` and `delivered_at`.

---

## 5. Query the status yourself

Same order of priority as the export (Empty → Used → Expired → Available):

```sql
select pt.name,
       count(*) filter (where status = 'Available') as available,
       count(*) filter (where status = 'Used')      as used,
       count(*) filter (where status = 'Expired')   as expired,
       count(*) filter (where status = 'Empty')     as empty
from (
  select pti.prize_template_id,
         case
           when coalesce(btrim(pti.item_value), '') = '' then 'Empty'
           when cr.id is not null then 'Used'
           when coalesce(pti.expires_at, pt.expires_at) <= now() then 'Expired'
           else 'Available'
         end as status
  from public.prize_template_items pti
  join public.prize_templates pt on pt.id = pti.prize_template_id
  left join public.coupon_redemptions cr on cr.prize_template_item_id = pti.id
) s
join public.prize_templates pt on pt.id = s.prize_template_id
group by pt.name
order by pt.name;
```

Whether the server would give a given code right now:

```sql
select pti.item_index, public.is_code_assignable(pti.id) as assignable
from public.prize_template_items pti
where pti.prize_template_id = '<reward id>'
order by pti.item_index;
```

(`is_code_assignable` is executable by `authenticated` and `service_role` only.)

---

## 6. Where it is in the code

| What                                             | File                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Which codes are given                            | `src/services/inventoryService.ts` (`fetchTemplateItemsService`)              |
| Codes table states (Prepared / Empty / Redeemed) | `src/components/rewards/rewardCodeColumns.tsx` (`codeRowState`)               |
| Export statuses and columns                      | `src/lib/codeExport.ts` (`codeExportStatus`, `codeExportColumns`)             |
| Summary counts                                   | `src/lib/codeExpiry.ts` (`computeCodeCounts`)                                 |
| Expiry setting (none / date / after delivery)    | `src/lib/expiryPolicy.ts`                                                     |
| Giving a code, the deadline at delivery          | `claim_campaign_prize_coupon` (migrations `20261012090000`, `20261015090000`) |
| What can be given, what the draw may pick        | `is_code_assignable`, `prize_has_assignable_reward`                           |
| Delivery                                         | `set_entry_delivery_status`, `src/services/deliveryService.ts`                |

---

## 7. Known inconsistencies

1. **Order of priority differs.** The codes table puts "Redeemed" before "Empty"; the export and the
   summary put "Empty" before "Used". A given code whose value was cleared by hand shows "Redeemed" in
   the table and "Empty" in the export. The interface forbids clearing a given code, the database does not.
2. **Detection by code text.** Besides `coupon_redemptions`, the dashboard marks a code as given when an
   entry of the organization received the same text. Two rewards sharing the same code text mark each
   other, and only the first 1000 winning entries are read (the proof does not have that limit).
3. **Dead or doubled columns.** `redeemed_by_player` is never set; `prize_template_items.is_used` can be
   out of step with `coupon_redemptions` (for instance after an entry is deleted, which removes the proof
   and makes the code available again).
