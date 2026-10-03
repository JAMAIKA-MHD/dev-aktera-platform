# Replace state-based dashboard navigation with real routes

## Problem

The dashboard has a single page in the router. `src/AppRouter.tsx` declares `/login`,
`/register`, `/play/:slug`, `/xp-frame`, `/xp-studio` (dev only), `/studio` and a catch-all
`/*`. Both `/studio` and `/*` render the same `<App>` component.

Everything else is decided inside `src/App.tsx` (917 lines) with React state:

- `activeTab` (`useState<TabType>`) switches between `home`, `campaigns`, `creator`,
  `prizes`, `analytics`, `billing`, `playerScreen` and `account` with
  `{activeTab === "…" && …}` blocks.
- `studioCampaignId` (a second `useState`) decides whether the Studio shows the campaigns
  table or the editor of one campaign.
- `/studio` is only `<App initialTab="playerScreen" />`.

In practice the whole dashboard lives at one URL, as if every page shared one root.

## Impact

**Navigation**

- The URL does not change when the user clicks the sidebar: no shareable link, no bookmark
  for "the Studio of campaign X" or "Billing".
- Refreshing the page (F5) returns to `home` (or to the Studio table) and loses the open
  tab, the selected campaign and the table filters.
- The browser Back button leaves the dashboard instead of returning to the previous screen.
- No deep links (e-mails, notifications), no real `<a href>` (no right-click, no new tab).

**Architecture**

- `App.tsx` is a god component: it holds all shared state (campaigns, wizard, Studio, theme,
  drawers) plus every page condition. Each new page makes it bigger.
- Data hooks are mounted for every page, even those the user never opens.
- No per-page loaders or guards (role, plan, organization): checks are hand-written
  conditions.
- Code splitting is limited to `lazy` calls inside `App.tsx`, not route-level bundles.
- Scroll restoration, focus management and page transitions are manual.
- Testing one page requires mounting the whole `App` (see `App.studio.test.tsx`).
- No automatic page-view analytics, since no URL change is emitted.

**Edge cases**

- `/studio` and `/*` mount two separate `App` instances; moving between them resets all state.
- Full-screen overlays (campaign Studio, wizard) are `fixed inset-0` elements inside `App`
  with no route, so Back does not close them.

## Goal

Every dashboard screen has its own URL. Back, Refresh, bookmarks and shared links work.
`App.tsx` stops owning page selection and page data.

## Proposed solution

Use React Router v7 nested routes under one shared layout.

```
/login, /register              public (unchanged)
/play/:slug                    public player (unchanged)
/xp-frame, /xp-studio          unchanged

<ProtectedRoute>
  <DashboardProvider>          shared data, loaded once
  <DashboardShell>            sidebar + header + theme/language, renders <Outlet />
    /                          home
    /campaigns                 campaigns list
    /campaigns/new             creator / wizard
    /studio                    campaigns table before the Studio
    /prizes
    /analytics
    /billing
    /account
```

Key decisions:

1. **`DashboardShell`** keeps only what is truly shared (sidebar, header, theme, language,
   organization context). Page selection moves to the router.
2. **Shared state moves to a `DashboardProvider` context** (`useDashboard()`): campaigns,
   rewards, entries and their writes are loaded once for the whole dashboard, so moving
   between screens never refetches. Decisions about where to go next stay in each page.
3. **Each page is a lazy route component** with its own tests.
4. **`studioCampaignId` becomes the `:id` route param.** Opening a campaign from the table
   is `navigate("/studio/:campaignId")`; closing the Studio is `navigate(-1)` or back to
   `/studio`.
5. **Sidebar items become `<NavLink>`** (real links, active state from the URL). `TabType`
   is kept temporarily as a mapping to paths, then removed.
6. **Backwards compatibility:** `/ui-maker` keeps redirecting to `/studio`; unknown paths
   redirect to `/`.

## Migration plan (incremental, one PR per step)

1. **Layout extraction:** create `DashboardShell` + `<Outlet />`, keep `activeTab` inside it
   as is. No behavior change.
2. **Studio route first:** add `/studio/:campaignId` and replace `studioCampaignId`.
   This fixes the worst symptoms (Back button, Refresh in the Studio).
3. **Page-by-page:** move `campaigns`, `prizes`, `analytics`, `billing`, `account`, `home`,
   then `creator` to routes. Each step removes one `activeTab` block and moves its data
   hooks into the page.
4. **Cleanup:** remove `activeTab`, `initialTab` and `TabType` navigation; delete dead state
   from `App.tsx`.

## Acceptance criteria

- [ ] Each dashboard screen has a distinct URL and can be opened directly after login.
- [ ] Refresh keeps the user on the same screen (and the same campaign in the Studio).
- [ ] Browser Back/Forward move between screens, including opening and closing the Studio.
- [ ] Sidebar entries are real links (open in a new tab works).
- [ ] Shared data (campaigns, rewards, entries) is loaded once by a provider, not by `App`; each page is a lazy route chunk.
- [ ] `App.tsx` no longer contains `activeTab` page switching.
- [ ] Public routes (`/play/:slug`, `/xp-frame`) and the auth redirects are unchanged.
- [ ] `npm run verify` passes; existing tests are updated and each migrated page has a test.

## Risks and mitigations

- **State currently shared through `App`** (campaigns, wizard, simulator drawer) may be
  missed → inventory it in step 1 and move it to contexts before splitting pages.
- **Regression in the Studio flow** (it was just reworked) → migrate it first, behind the
  existing `App.studio.test.tsx` scenarios.
- **Firebase hosting** must rewrite all paths to `index.html` so deep links work after a
  refresh → verify `firebase.json` before step 2.
- **Non-negotiable rules are untouched:** no change to prize selection, RLS, consent or
  duplicate protection.

## Out of scope

- Visual redesign of pages.
- Changes to the player runtime or Edge Functions.
- Server-side rendering.
