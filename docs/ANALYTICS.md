# Analytics

The analytics page of the dashboard (`/analytics`, `/analytics/:campaignId`): what it shows, where each number comes from, and the rules to follow when changing it.

## The one rule

**Every figure comes from a Supabase RPC.** The browser never downloads raw entries, prizes or payments to add them up, and there is no client-side fallback: when an RPC fails, the section shows an error instead of numbers computed some other way. The front end only formats, slices (time ranges) and draws what the RPC returned.

## Page structure

`AnalyticsCenter` (`src/components/AnalyticsCenter.tsx`) shows one section at a time, named in the URL with `?section=`. Build the links with `PATHS.analyticsSection(section)` (`src/dashboard/paths.ts`); the sections are listed in `ANALYTICS_SECTIONS`.

| Section          | URL                          | Component                                                                   | RPC(s)                                                      |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Campaigns        | `/analytics`                 | `ProgramAnalyticsDashboard` (all campaigns) or `CampaignAnalyticsDashboard` | `get_program_analytics`, `get_campaign_dashboard_analytics` |
| Reward Analytics | `/analytics?section=rewards` | `RewardAnalyticsDashboard`                                                  | `get_reward_analytics`, `get_reward_stock_usage`            |
| Billing          | `/analytics?section=billing` | `BillingAnalyticsDashboard`                                                 | `get_billing_usage_analytics`                               |

A campaign's own URL (`/analytics/:id`) always opens the Campaigns section on that campaign. An unknown `section` value falls back to Campaigns.

### Campaigns section

- **All campaigns** (program view): totals (entries, prizes distributed, campaigns by state), campaign leaderboard, performance by game mechanic, decay curve (entries by day since each campaign's first entry), unique audience, new vs returning participants, repeat participation rate, stock at risk, plan usage, and wilaya / hour / weekday / device segmentation. Period switch: 30 days, 90 days, 12 months, All time (`PROGRAM_PERIODS`).
- **One campaign**: entries, participants over time (1 week / 1 month / 3 months / 6 months, limited to what the campaign's lifespan can fill), dwell time, win rate, completion rate, OS distribution, prize burn rate and distribution over time, Algeria wilaya map, hour-of-day and weekday segmentation.
- **Players table** (`PlayerParticipantsTable`): every participation, 10 rows per page, search, filters (result, time spent in game, wilaya, device), sortable columns. On one campaign it lists that campaign's players only.
- **Exports**: _Export Data_ downloads the table on screen as Excel (every row, search and filters applied). _Download report_ generates a DOCX report for one campaign (`src/lib/campaignReportDocx.ts`, from `get_campaign_analytics_report`); the combined view has no report.

### Reward Analytics section

Where the reward stock stands. A unit of stock is in exactly one of three places:

- **won**: already won by a player (`prizes.quantity_won`, every campaign);
- **reserved**: committed to a draft, active or paused campaign and not won yet;
- **unallocated**: the rest, free to put in a campaign.

`remaining` = reserved + unallocated. The section shows the totals, a split by type (physical gifts and vouchers, with voucher codes loaded / missing), the list of rewards ordered by urgency (`risk`: out, critical, warning), the pace (wins per day over the last 7 days) and the days left at that pace.

The **Stock usage over time** chart (`get_reward_stock_usage`) shows stock used and left day by day, for every reward or one type. Stock has no history table, so the stock left at the end of a past day is rebuilt from today: what is left now plus everything won after that day. Its last point is the "Left in stock" figure of the section.

### Billing section

What the organization used of its plan: entries of the calendar month with the projected month total, entries last month, active campaigns, month-by-month usage, usage by campaign this month, the current subscription and the payment history. Plan allowances are in `src/lib/planAllowances.ts`; `src/lib/billingUsageTransforms.ts` turns them into quota rows.

## Data flow

```
Component (src/components/analytics/*)
  → hook (src/hooks/useCampaignAnalytics, useProgramAnalytics, useOrganizationAnalytics, useAnalytics, useCampaignReport)
    → service (src/services/analyticsService.ts: one fetch… function per RPC, throws on error)
      → Supabase RPC (supabase/migrations/*)
```

- **Types**: every payload is typed in `src/types.ts` (`CampaignDashboardAnalytics`, `ProgramAnalytics`, `RewardAnalytics`, `RewardStockUsage`, `BillingUsageAnalytics`, …). Payload fields stay snake_case, as the RPC returns them.
- **Live refresh**: `useOrganizationAnalytics` reloads when one of the tables it watches changes and every 60 s in the background, keeping the previous numbers on screen while the new ones load.
- **Stale answers**: `useAnalytics` only applies the answer to the latest request, so a slow answer for the previous campaign never replaces the current one.
- **Formatting and slicing** live in `src/lib/campaignAnalyticsTransforms.ts`, `programAnalyticsTransforms.ts` and `billingUsageTransforms.ts` (unit tested). Shared controls (section titles, period toggles, loading and error states) are in `AnalyticsControls.tsx`; chart panels, stat cards and the chart theme in `CampaignAnalyticsCharts.tsx`.
- **Time zone**: all bucketing by day, hour and weekday happens in the RPC, in `Africa/Algiers` by default.

## RPC reference

| Function                           | Migration                                              | Arguments                                                      | Security         |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- | ---------------- |
| `get_campaign_dashboard_analytics` | `20261005120000_campaign_dashboard_analytics_rpc.sql`  | `campaign_id`, `timezone`                                      | definer, members |
| `get_campaign_analytics_report`    | `20261005130000_campaign_analytics_report_rpc.sql`     | `campaign_id`, `timezone` (participants capped at 5000)        | definer, members |
| `get_program_analytics`            | `20261009120000_program_analytics_rpc.sql`             | `organization_id`, `from`, `to`, `timezone`                    | definer, members |
| `get_reward_analytics`             | `20261012120000_reward_and_billing_analytics_rpcs.sql` | `organization_id`, `from`, `to`, `timezone`                    | definer, members |
| `get_billing_usage_analytics`      | `20261012120000_reward_and_billing_analytics_rpcs.sql` | `organization_id`, months, `timezone`                          | definer, members |
| `get_reward_stock_usage`           | `20261014130000_reward_stock_usage_rpc.sql`            | `organization_id`, `category` (null = all), `from`, `timezone` | definer, members |
| `get_campaign_participants`        | `20261014140000_participants_wilaya_and_device.sql`    | `organization_id`, `campaign_id`                               | invoker (RLS)    |

Notes:

- _definer, members_: `SECURITY DEFINER`, checks that the caller is a member of the organization before reading anything. _invoker (RLS)_: RLS limits the rows to the caller's organization.
- Every function has `SET search_path = public`, is revoked from `PUBLIC, anon, authenticated` and granted to `authenticated, service_role` only.
- A participant is a phone number, normalized so `0541234567` and `+213541234567` are one person. Entries without a phone number count as entries, not as audience.
- `get_campaign_participants` returns entries only (a page view is not a participation), plus each player's `wilaya` (`metadata.wilaya`, else `metadata.ip_city`) and `os` (`android`, `ios`, `desktop`, `other`, from the user agent, the same rule as the device chart). Its columns changed, so the migration drops and recreates it.

## Security checks

`npm run backend:probe` covers the analytics RPCs: the anonymous key must be refused by each of them, and a member (with `BACKEND_PROBE_EMAIL` / `BACKEND_PROBE_PASSWORD`) must read their own organization but be refused another one. Run it after every change to an analytics migration.

## Changing analytics

1. **New number** → add it to the RPC's JSON payload (new migration, never edit a shipped one), then to the type in `src/types.ts`, then display it. Do not compute it in the browser from raw rows.
2. **New RPC** → `SET search_path = public`, membership check first, `REVOKE ALL … FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE … TO authenticated, service_role`; add a `fetch…` function in `analyticsService.ts` that throws on error, a hook, and probe checks in `scripts/backend/anon-probe.mjs` (anon refused, other organization refused).
3. **Changed return columns** → `DROP FUNCTION` then `CREATE FUNCTION` and repeat the grants (Postgres cannot change a function's return type with `CREATE OR REPLACE`).
4. Run `npm run verify` and `npm run backend:probe` locally.

## Deployment

The front end reads the new payload fields as soon as it ships, so apply the migrations **before** deploying the front end:

```bash
npx supabase db push        # or the project's migration pipeline
npm run backend:probe       # anon and cross-organization access refused
firebase deploy --only hosting:demo
```

No Edge Function changes and no environment variables are involved.

## Known limits

- The Billing section reports the number of active campaigns, but the per-plan limit is not enforced on the server yet: that work (`enforce_active_campaign_limit` trigger and the matching `planAllowances.ts` values) ships separately with the campaign changes.
- Monthly entry allowances are display only.
- Stock history is rebuilt from today's stock and past wins: a manual stock correction moves the whole past curve with it.
- The campaign report caps the participant list at the 5000 most recent entries (`participants_total` keeps the real count).
