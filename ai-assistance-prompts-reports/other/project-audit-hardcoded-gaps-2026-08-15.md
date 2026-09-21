# YOUENGAGE project audit after latest changes

Date: 2026-08-15

## 1) Validation status at time of audit

The project currently has the following state when validated in the workspace:

- `npm run lint`: fails because ESLint v9 is configured to look for `eslint.config.js`, but the repo does not include that config file.
- `npm run typecheck`: passes.
- `npm run build`: passes.

This means the app is building correctly, but the repo is not yet in a clean lint-ready state and some config-level issues still need to be fixed before a team-wide CI pass can be trusted.

---

## 2) What is hard coded

The project still contains a significant amount of hard-coded logic and placeholder UI content. These are the main categories.

### 2.1 Frontend business rules that are still hard coded

- The wheel color palette is hard coded in [src/pages/play/PlayerFlowPage.tsx](../src/pages/play/PlayerFlowPage.tsx).
  - `WHEEL_COLORS` is defined in the component.
  - Segment identities and display styling are fixed in code rather than driven by DB configuration.

- The loser slot is hard coded in the same file.
  - `LOSER_SLOT` is inserted as an always-present fallback prize, which is acceptable as a UI fallback, but it should never be used as the main backend decision path in production.

- The “winning” and “losing” fallback logic in the player flow is partly hard coded.
  - When the edge function is unreachable, the client performs a direct fallback insert into `entries` and rolls a win probability locally.
  - This is a critical product/security risk because the rules say win/loss outcomes must be server-side only.

### 2.2 Brand and content defaults hard coded in the UI

- Default campaign branding and slogans are fixed in [src/pages/play/PlayerFlowPage.tsx](../src/pages/play/PlayerFlowPage.tsx).
  - Example: `slogan: "Spin & Win"`, `arabicSlogan: "العب واربح 🎁"`.

- Default organization/account examples are hard coded in [src/components/AccountSettings.tsx](../src/components/AccountSettings.tsx) and [src/pages/auth/RegisterPage.tsx](../src/pages/auth/RegisterPage.tsx).
  - Examples include "Djezzy SPA", "contact@djezzy.dz", "0555123456", and all the static placeholders for legal entity fields.

- Branding strings such as “Aktera” still appear in the auth UI footer, even though the app is a different product identity.
  - See [src/pages/auth/LoginPage.tsx](../src/pages/auth/LoginPage.tsx) and [src/pages/auth/RegisterPage.tsx](../src/pages/auth/RegisterPage.tsx).

### 2.3 Dashboard mock/illustrative data still in the app

The overview pages still use mock data and sample structures rather than real dynamic data in several places:

- [src/components/overview/OverviewMockData.ts](../src/components/overview/OverviewMockData.ts)
- [src/components/overview/OverviewKpiCards.tsx](../src/components/overview/OverviewKpiCards.tsx)
- [src/components/overview/CampaignAudienceCard.tsx](../src/components/overview/CampaignAudienceCard.tsx)
- [src/components/overview/CampaignInsightsCard.tsx](../src/components/overview/CampaignInsightsCard.tsx)
- [src/components/overview/VisitorStatsChart.tsx](../src/components/overview/VisitorStatsChart.tsx)

The file itself explicitly says this data is hard coded and intended as a template rather than live data. This is not a bug by itself, but it means the overview dashboard is still not production-real yet.

### 2.4 Sample analytics data generation

- [src/components/AnalyticsCenter.tsx](../src/components/AnalyticsCenter.tsx) includes `handleGenerateSampleData`, which stores synthetic campaign entries into the database for demo purposes.
- That is a useful demo feature, but it is still a manual/test-style feature in production UI and should never be exposed silently in a live operator account without a clear flag.

### 2.5 Translation text still in English in many screens

The i18n layer exists and supports `en`, `fr`, and `ar`, but many pages still use raw English strings instead of translation keys.

Examples:

- [src/components/AccountSettings.tsx](../src/components/AccountSettings.tsx)
- [src/pages/auth/CompleteOrganizationSetupPage.tsx](../src/pages/auth/CompleteOrganizationSetupPage.tsx)
- [src/pages/auth/LoginPage.tsx](../src/pages/auth/LoginPage.tsx)
- [src/pages/auth/RegisterPage.tsx](../src/pages/auth/RegisterPage.tsx)
- [src/pages/play/PlayerFlowPage.tsx](../src/pages/play/PlayerFlowPage.tsx)

This means the translation system is partially implemented, but not globally enforced.

---

## 3) Functions/UI features that are expected in Supabase but are not fully implemented yet

This is the main gap list for the team.

### 3.1 Already present and expected

These appear to exist or are directly called:

- `select-prize` edge function: present in [supabase/functions/select-prize/index.ts](../supabase/functions/select-prize/index.ts)
- `confirm-coupon` edge function: present in [supabase/functions/confirm-coupon/index.ts](../supabase/functions/confirm-coupon/index.ts)
- `create-organization` edge function: present in [supabase/functions/create-organization/index.ts](../supabase/functions/create-organization/index.ts)
- `complete_current_user_onboarding`: present in SQL migrations and linked from onboarding UI
- `record_campaign_impression`: present in migration SQL and called by the player flow
- `get_campaign_analytics_v2`: present in migration SQL and called by analytics service

### 3.2 UI is showing functionality that does not have a proper backend contract yet

These are the major missing or unverified server-side pieces:

1. Personal notification settings persistence
   - The notification tab in [src/components/AccountSettings.tsx](../src/components/AccountSettings.tsx) shows toggles for:
     - Email alerts
     - quota warnings
     - Telegram alerts
     - weekly digest
   - There is no visible server table or RPC to persist those preferences.
   - This is UI-only and currently not backed by a real `notification_preferences` or equivalent table.

2. Real personal settings persistence for profile details
   - The profile form includes fields like:
     - organization name
     - contact email
     - phone
     - NIF / RC / NIS / AI
     - address / wilaya / website / industry
     - representative name / role
   - In the save flow, only a subset is persisted (`organizations.name`, `organizations.contact_email`, `organizations.phone_number`, and `profiles.full_name`).
   - Several fields are not saved at all.

3. Avatar upload system
   - The UI supports uploading a profile image in [src/components/AccountSettings.tsx](../src/components/AccountSettings.tsx).
   - The selected file only creates a local preview; it is not uploaded to Supabase Storage or persisted to the profile row.

4. Real password reset / current password verification flow
   - The “Current Password” field is shown but not actually checked against the user’s current password before updating.
   - This is a UX issue and a security issue if it looks like real validation while it is not implemented.

5. Email change verification flow
   - The UI updates auth email, but it relies on Supabase auth email change behavior.
   - That is acceptable only if the workflow is fully tested and the app message is clear about the confirmation step.

6. Billing plan / checkout flow
   - Billing UI exists, but there is no visible live checkout, payment status workflow, or plan-upgrade server contract in the current codebase.
   - This was already flagged in the Phase 2 source-of-truth as still pending.

7. Legal / Algerian business metadata persistence
   - The UI asks for NIF, RC, NIS, AI, industry, address, wilaya, and website, but the current DB model in [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx) only exposes a limited `DbOrganization` shape with:
     - `id`
     - `name`
     - `slug`
     - `contact_email`
     - `phone_number`
     - `logo_url`
     - `plan`
     - `is_active`
   - These legal and admin fields are currently not part of the typed organization model.

8. Personalized operator settings / preferences table
   - A general user settings area is clearly designed, but there is no visible database schema for a personal preferences table yet.
   - This is a required backend piece for true personalization.

---

## 4) Current bugs and issues

### 4.1 Critical / high-priority issues

1. Security-risk fallback in player flow
   - [src/pages/play/PlayerFlowPage.tsx](../src/pages/play/PlayerFlowPage.tsx) contains a direct client fallback that creates a database `entries` record and rolls a local win outcome if the edge function fails.
   - This contradicts the non-negotiable product rule: prize outcome must be server-side, never in frontend logic.

2. Lint is failing due to missing ESLint config
   - This breaks basic repo quality gates.
   - The project is not currently in a clean lint state.

3. Translation coverage is incomplete
   - The app supports `fr` and `ar`, but the actual UI still uses a lot of untranslated strings.
   - Arabic and French content are not yet reliable for full product localization.

4. Account settings save is inconsistent with the fields shown
   - The form accepts many organization/legal/account inputs, but the update logic saves only a subset of them.
   - This produces a misleading “settings saved” experience even though the full data set is not actually persisted.

### 4.2 Medium-priority issues

5. Notification settings are not real
   - The toggles do not persist anywhere and the button only shows an in-memory success toast.

6. Avatar upload does not persist
   - The local preview is not uploaded to storage.

7. `currentPassword` is a fake validation field
   - It is rendered in the UI but not checked against the current password before a password update.

8. Hard-coded examples and placeholders may confuse operators
   - Many “e.g.” values look production-ready but are not validated against actual DB-backed values.

9. Some onboarding flows still assume a broader organization schema than the code actually models
   - The UI expects more legal and contact fields than what `DbOrganization` currently declares.

### 4.3 Lower-priority / UX issues

10. Overview dashboard is still mostly mock

- The code clearly says the KPI cards and campaign agenda are hard-coded mock structures.

11. Sample data generation can pollute production data

- The “generate sample data” feature in analytics can insert fake rows into the live app if used accidentally.

12. Browser-only language detection and document direction are not enough for full RTL support

- `dir="auto"` is required for Arabic/Darija content fields, but some content still renders without it or without a controlled translation structure.

---

## 5) AR / FR translation status: still not working properly

This is a clear team risk item.

### Current status

- The translation layer exists in [src/i18n/i18n.ts](../src/i18n/i18n.ts) and [src/i18n/translations.ts](../src/i18n/translations.ts).
- The language provider also supports `fr` and `ar` in [src/contexts/LanguageContext.tsx](../src/contexts/LanguageContext.tsx).
- The language selector is present in [src/components/LanguageSelector.tsx](../src/components/LanguageSelector.tsx).

### Why it is still broken / incomplete

- Many components still contain raw English strings rather than translation keys.
- Several UI labels are not using `t(...)` or any translation helper at all.
- Some Arabic/Darija content exists in the player flow, but RTL handling is not consistently applied across the full product.
- The rule in the project instructions is clear: fields displaying Arabic content should use `dir="auto"` for safe rendering. This is only partially respected.
- French and Arabic pages are therefore visible in theory, but not globally reliable in production.

### Recommendation for the team

- Audit every screen and replace raw text with translation keys.
- Add `dir="auto"` to any field that can contain Arabic or mixed-language content.
- Reinforce a rule that all new UI text must use the translation layer, not string literals.
- Confirm the selected language is persisted consistently across login, dashboard, and player flow.

---

## 6) Personal settings checklist to review with engineering and product

This is the list to validate before calling the account settings area production-ready.

### Required personal settings / operator settings

- Profile photo upload and persistence
- Full name and role
- Company name and organization contact email
- Phone and legal identification metadata (NIF, RC, NIS, AI)
- Industry / sector
- Headquarters address
- Wilaya / province
- Official website
- Representative name and title
- Login email change verification
- Password change flow with current-password validation
- Notification preferences persistence
- Telegram integration preferences
- Weekly digest preferences
- Quota alert settings

### Required backend/schema checks

- Are these values stored in the correct Supabase tables?
- Are all fields protected by RLS?
- Are updates restricted to the current user/organization only?
- Are there explicit DB constraints and validation rules for phone, email, and legal identifiers?
- Are there proper audit fields (`created_at`, `updated_at`)?

### Required UX / product checks

- Confirm the save button actually reflects the real persisted data.
- Confirm the loaded values are consistent after refresh.
- Verify the translations and RTL direction are applied in each tab.
- Verify the current password form is not misleading.
- Confirm all toggles save to a real storage model and not only to UI state.

---

## 7) Required manual Supabase actions

The following are still required before the project can be considered production-stable:

1. Redeploy the cloud edge functions for `select-prize` and `confirm-coupon` so the remote runtime matches the latest local code.
2. Verify the Supabase runtime includes the correct environment values for service-role access and the edge-function config.
3. Check whether the needed DB tables and policies exist for notification preferences, user settings, and legal metadata persistence.
4. Confirm that `record_campaign_impression` and `get_campaign_analytics_v2` are deployed in the cloud runtime and working with the current app calls.

---

## 8) Overall conclusion

The app has progressed significantly and many operational screens are now connected to live data, but the current state still includes a mix of:

- hard-coded mock UI patterns,
- partial i18n coverage,
- unchecked user settings flows,
- and a security-sensitive client-side fallback that violates the project’s server-side prize rule.

The biggest items to fix before a wider team rollout are:

1. Remove the frontend fallback win logic from the prize flow.
2. Make the settings and notification flows real and DB-backed.
3. Complete the translation audit for `fr` and `ar`.
4. Fix the lint configuration and ensure the repo can pass quality gates.
5. Verify all feature UI shown in the app is backed by the corresponding Supabase logic.
