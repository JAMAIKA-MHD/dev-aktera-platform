# In-Place Campaign Editing & Safeguards for Vouchers, Stock & Quiz Assets

## Overview

This documentation details the architecture, database migrations, server-side safeguards, and UI enhancements implemented to support **direct in-place editing** of campaigns (`draft`, `active`, `paused`) across the MVP Octoreach platform while protecting already-won vouchers, live stock allocations, and participant answers from data corruption.

---

## 1. Problem Statement & Root Cause

Previously, when an admin edited an active or paused campaign:

1. **Unwanted Duplicate Campaigns**: The system created a cloned "Update Draft" (`name (Update Draft)` with a `-update-xxxxx` slug) with a new ID, instead of updating the existing campaign record directly.
2. **Broken Public Links & QR Codes**: The newly generated slug broke existing player links, active sessions, and printed marketing QR codes.
3. **Data Loss & Over-Allocation Risks**:
   - Sequential client-side writes deleted and re-inserted `prizes` and `quiz_questions`, which could wipe `entries` relationships or reset `prize_inventory.remaining`.
   - Admins could inadvertently reduce a prize allocation below the number of vouchers already won by players.
   - Deleted quiz questions with participant answers could cause foreign key issues or destroy historical submission logs.

---

## 2. Solution Architecture

```
                                Admin Edits Campaign
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │   CampaignWizard (UI Validation)      │
                     │  - Clamps quantity min to quantity_won│
                     │  - Warns on low voucher secret codes  │
                     │  - Confirms live modifications        │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │ campaignService.ts (Wrapper Layer)    │
                     │  - Calls save_campaign_full_in_place  │
                     │  - Returns structured errors / status │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
    ═════════════════════════════════════════════════════════════════════════════
    POSTGRESQL RPC TRANSACTION: save_campaign_full_in_place (SECURITY DEFINER)
    ═════════════════════════════════════════════════════════════════════════════
       │
       ├─► 1. Slug Uniqueness: Check slug is unique across org campaigns.
       │
       ├─► 2. Live Stock Ceiling Check: Requested qty <= (Template stock - other active allocations).
       │
       ├─► 3. Live Prize Floor Check: Requested qty >= prize.quantity_won.
       │      (Rejects if qty < won with structured error).
       │
       ├─► 4. In-Place Campaign Update: UPDATE campaigns SET ... WHERE id = p_campaign_id.
       │
       ├─► 5. In-Place Prize & Inventory Sync:
       │      - Retained Prize: UPDATE prizes SET quantity = req, weight = req;
       │                        UPDATE prize_inventory SET remaining = GREATEST(0, req - won).
       │      - New Prize: INSERT prizes + INSERT prize_inventory.
       │      - Removed Prize with wins: Mark is_active = false, weight = 0, quantity = won.
       │      - Removed Prize without wins: Safe DELETE from prizes & prize_inventory.
       │
       ├─► 6. Quiz Question Protection Sync:
       │      - Upserts questions by UUID.
       │      - If campaign has participant entries: omitted questions set to is_active = false.
       │      - If 0 participant entries: omitted questions safe to hard-delete.
       │
       └─► Returns: { "success": true, "campaign_id": "...", "errors": [] }
                    (Any validation failure cleanly rolls back the entire transaction)
```

---

## 3. Database Migration Details

**File**: `supabase/migrations/20260819120000_save_campaign_full_in_place_rpc.sql`

### Key Functionalities:

- **Function**: `save_campaign_full_in_place(...)`
- **Security**: `SECURITY DEFINER` with search path controls.
- **Atomic Operations**:
  - Validates all business rules simultaneously before mutating any tables.
  - Returns structured error array `{ field, message }` instead of throwing raw database exceptions.

### Quantity Floor Verification Snippet:

```sql
IF p_campaign_id IS NOT NULL THEN
  SELECT id, quantity, quantity_won
  INTO v_existing_prize
  FROM prizes
  WHERE campaign_id = p_campaign_id
    AND prize_template_id = v_template_id
  LIMIT 1;

  IF FOUND THEN
    v_retained_prize_ids := array_append(v_retained_prize_ids, v_existing_prize.id);
    IF v_req_qty < COALESCE(v_existing_prize.quantity_won, 0) THEN
      v_errors := v_errors || jsonb_build_object(
        'field', 'prizes',
        'message', 'Cannot reduce allocation for "' || v_template_record.name || '" to ' || v_req_qty || ' because ' || v_existing_prize.quantity_won || ' units have already been won by players.'
      );
    END IF;
  END IF;
END IF;
```

---

## 4. Frontend & Service Enhancements

1. **`src/services/campaignService.ts`**:
   - Replaced all legacy draft update / parent-crediting logic with a clean RPC call to `save_campaign_full_in_place`.
   - Returns typed `CampaignSaveResult`: `{ success: boolean, errors?: { field: string, message: string }[], campaignId?: string }`.

2. **`src/components/CampaignWizard.tsx`**:
   - Direct in-place editing across all statuses (`draft`, `active`, `paused`).
   - Clean URLs: Preserves existing `/play/[slug]` portal slugs across edits.
   - Real-time prize metrics: Displays `Won: X / Total` and `Remaining: Y` on each prize card.
   - Voucher code stock warning: Displays non-blocking alerts when template code preparation is lower than allocation.
   - Live confirmation modal: Prompts the admin when editing an active campaign, notifying them of immediate live effects and mechanic adjustments.

3. **`src/components/CampaignWorkspace.tsx` & `CampaignsList.tsx`**:
   - Added direct **"Edit Campaign"** action button in the campaign workspace header.
   - Unified all edit handlers across the application to open the wizard in direct in-place edit mode.

4. **`src/hooks/useCampaigns.ts` & `usePrizeTemplates.ts`**:
   - Included `quantity_won` directly on `campaign.prizes`.
   - Simplified global stock calculation since standalone in-place updates eliminate duplicate draft stock reservations.

---

## 5. Verification & Test Coverage

All 6 core scenarios were verified via automated integration tests:

1. **In-place Draft Editing**: Verified in-place field updates preserving campaign ID.
2. **Floor Constraint Rejection**: Verified server blocks reducing prize quantity below `quantity_won`.
3. **Live Stock Increase**: Verified increasing quantity correctly computes `remaining = new_quantity - quantity_won`.
4. **Quiz Answer Protection**: Verified questions with existing answers are soft-deactivated (`is_active = false`) rather than hard-deleted.
5. **Atomic Rollback**: Verified validation failure rolls back the entire transaction with 0 partial mutations.
6. **Concurrency Protection**: Verified live re-check at write-time prevents stale form submissions from bypassing stock limits.
