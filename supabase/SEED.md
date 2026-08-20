# Local Database Seed Documentation

## Overview

The local database seed script generates deterministic, realistic sample data for local development, manual QA, and UI testing of the DZENGAGE platform.

It is designed to be **safe**, **deterministic**, and **idempotent**:

- **Strict Safety Guardrail**: Refuses to run against non-local database hosts.
- **Deterministic**: Uses fixed PostgreSQL random seeds (`setseed(0.42)`) so every run produces identical data for consistent debugging.
- **Unified Franchise Naming**: All campaigns within each organization share a single cohesive campaign franchise name (e.g. `[Org Name] Mega Grand Challenge — Lucky Spin Wheel`, `[Org Name] Mega Grand Challenge — Trivia & Culture Quiz`).
- **All Organizations Seeded**: Automatically seeds the developer's logged-in active organization (e.g. `dz`) as well as the two standalone demo organizations (`Ooredoo Algeria Demo` and `Yassir SuperApp Demo`).

---

## 1. Quick Start: How to Run

### Option A: Via NPM (Recommended for everyday development)

To populate or refresh sample data on your running local database without resetting everything:

```bash
npm run db:seed
```

### Option B: Via Supabase CLI (Full Reset)

When rebuilding the local database from scratch:

```bash
supabase db reset
```

_(Supabase CLI automatically executes `supabase/seed.sql` after applying migrations)._

---

## 2. What Gets Created

### A. Organizations Seeded

1. **Your Active Developer Organization (e.g. `dz`)**
   - Clean sample campaigns, prize templates, voucher code stockroom, and entries attached directly to your logged-in organization.
2. **Ooredoo Algeria (Demo)** (`ooredoo-demo`)
3. **Yassir SuperApp (Demo)** (`yassir-demo`)

### B. Prize Templates & Voucher Code Inventory (Per Organization)

- `500 DA Recharge Voucher` (100 pre-loaded codes: `[ORG]-500-0001-...`)
- `10 GB High-Speed Data Pass` (50 pre-loaded codes: `[ORG]-10GB-001-...`)
- `1,000 DA Discount Coupon` (60 pre-loaded codes: `[ORG]-1K-001-...`)
- `Official Branded Premium Mug` (Physical reward, 30 stock)

### C. Unified Franchise Campaigns (Per Organization)

| Campaign Name                                          | Type          | Status   | Features                                                  |
| :----------------------------------------------------- | :------------ | :------- | :-------------------------------------------------------- |
| **[Org] Mega Grand Challenge — Lucky Spin Wheel**      | `lucky_wheel` | `active` | 3 allocated prizes, 60 realistic participant entries      |
| **[Org] Mega Grand Challenge — Trivia & Culture Quiz** | `quiz`        | `active` | 3 trivia questions, allocated vouchers, pass/fail entries |
| **[Org] Mega Grand Challenge — Weekend Flash Special** | `lucky_wheel` | `paused` | Paused campaign testing                                   |
| **[Org] Mega Grand Challenge — Ramadan Night Rewards** | `lucky_wheel` | `draft`  | Draft campaign testing                                    |

### D. Participant Entries (60+ Entries per Organization)

- **Real Algerian Mobile Carriers**:
  - Mobilis (`0661xxxxxx`, `0662xxxxxx`) ~40%
  - Djezzy (`0770xxxxxx`, `0771xxxxxx`) ~35%
  - Ooredoo (`0550xxxxxx`, `0555xxxxxx`) ~25%
- **Rolling Timeline**: Timestamps spread across the last **14 days** so rolling window charts in Analytics and Overview show realistic time series.
- **Relational Integrity**:
  - `quantity_won <= quantity` strictly maintained.
  - `prize_inventory.remaining` matches `quantity - quantity_won`.
  - Claimed vouchers recorded in `coupon_redemptions`.

---

## 3. Reset & Re-seeding

To reset the sample data at any time, simply run:

```bash
npm run db:seed
```
