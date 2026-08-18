# Live Campaigns Editing & Voucher Inventory Resolution

## Summary of Issues & Root Causes

1. **Live Campaign Edit Stock Lock**:
   - _Problem_: When editing an active or paused campaign (or creating an update draft), stock already allocated to the campaign was double-counted against the parent reward template's pool, causing the UI to report `0 available stock` and blocking changes.
   - _Fix_: Introduced `getEffectiveAvailableStock` in `campaignService.ts`, `usePrizeTemplates.ts`, and `CampaignWizard.tsx` to credit existing allocations back to the active editing pool up to `template.totalStock`.

2. **Bulk Voucher Import (Append vs Replace Mode & Conflicts)**:
   - _Problem_: Re-importing vouchers over an existing template would overwrite previous codes without giving an option to fill remaining empty slots or resolve collisions.
   - _Fix_:
     - Added **Append (Fill Empty)** [Default] and **Replace All** modes in `inventoryService.ts`.
     - Built pure batch/existing duplicate detection returning 1-indexed line conflict objects.
     - Created inline Duplicate Conflict Fixer Modal, persistent warning alerts, and collision-free uppercase alphanumeric random code auto-fill (`generateRandomVoucherCodesService`).

3. **Unique Voucher Sequential Delivery & Anti-Duplicate Winner Codes**:
   - _Problem_: Consecutive winners received identical voucher codes (repeating code #1) due to anonymous player RLS restrictions on `coupon_redemptions`.
   - _Fix_:
     - Created `claim_campaign_prize_coupon` PostgreSQL RPC function with `SECURITY DEFINER` and `FOR UPDATE SKIP LOCKED`.
     - Integrated sequential code assignment in `select-prize/index.ts` and `PlayerFlowPage.tsx` so each winning player claims the next unused voucher code sequentially (#1, then #2, #3...).

4. **1000+ Codes Pagination & URL Buffer Limits**:
   - _Problem_: PostgREST default 1,000-row limit caused large voucher tables (1,000+ codes) to truncate and crash during initialization.
   - _Fix_: Implemented paginated `.range()` chunking in `fetchTemplateItemsService` and chunked 100-ID queries for `coupon_redemptions` to prevent HTTP 414 URI Too Long errors.

5. **Campaign Stock Depletion & Closed State Gate**:
   - _Problem_: Gameplay continued beyond total allocated prize stock (e.g. 12 winners on a 10-voucher campaign).
   - _Fix_: Centralized campaign stock checks in `select-prize/index.ts` comparing winning entries against `prizes.quantity`. Once 0 vouchers remain, the system terminates the draw and displays the dedicated bilingual **"This Campaign is Closed"** player screen.

6. **Voucher Table Used Status Display**:
   - _Problem_: Redeemed codes showed as green "Prepared" in the admin modal.
   - _Fix_: `fetchTemplateItemsService` cross-references both `coupon_redemptions` and `entries.redeemed_coupon_value`, rendering used codes in bold red with `border-l-4 border-l-red-500`, strikethrough text, `[🔒 Redeemed]` badge, and disabled inputs.
