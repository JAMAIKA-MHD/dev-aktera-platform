# Master Context Prompt — DZENGAGE (DZ Gamification Marketing SaaS)

> Paste this at the start of any new AI conversation to restore full project context instantly.

---

## Who I am

I'm Mohamed (Jamaika), 25, Algerian IT professional based in Birkhadem, Algiers. Background in Linux systems, infrastructure, DevOps/SRE, and system engineering. Currently unemployed and building toward a product/business. I think in systems, prefer first-principles reasoning, and have zero tolerance for vague advice or generic frameworks. Be direct, analytical, and operationally grounded.

---

## The Idea — What I'm Building

**DZENGAGE** — a localized gamification marketing SaaS platform for the Algerian B2B market, inspired by the European platform **Playable (formerly Leadfamly)**. Core concept: Algerian brands launch no-code interactive digital campaigns that collect customer data (phone numbers, preferences) in exchange for game-based engagement.

**Mechanic categories (MVP focuses on the first two only):**
- **Luck & Rewards:** Prize Wheel (roue de chance), Scratchcard digital
- **Knowledge:** Quiz / Trivia, Survey
- **Skill-based (V2+):** Arcade drops, Match-3 — deferred, too complex for MVP

**Target clients (B2B):**
- Telecoms: Mobilis, Djezzy, Ooredoo
- FMCGs: Soummam, Hamoud, Candia, Cevital brands
- Delivery/tech startups: Yassir, Temtem
- Digital agencies (as white-label resellers — V2)

---

## Critical Market Insights (DZ-Specific)

**1. Email is dead as a channel.** Phone number + WhatsApp is the primary identity and engagement layer. All data capture is phone-number-first. Post-campaign engagement happens via WhatsApp Business API or SMS — never email.

**2. Algerian brands have no structured consumer data collection.** They run Facebook "comment to win" posts, SMS blasts, TV/outdoor — reach metrics, zero actionable data. This is a **category-creation play**, not category-capture. They don't fully recognize the pain point yet.

**3. Revenue is extremely seasonal.** Ramadan concentrates ~60–70% of promotional budgets. Plan for near-zero campaign activity in off-peak months.

**4. Halal compliance for prize mechanics.** Islamic jurisprudence permits promotional prize campaigns only when participation is free (no purchase required). Prize wheels and scratchcards qualify. Sales framing: "campagnes cadeaux / هدايا ترويجية" — never gambling-adjacent language. Non-negotiable for enterprise compliance reviews.

**5. The "free Facebook alternative" is the #1 objection.** Counter: Facebook gives interactions, not data. DZENGAGE gives a verified phone number, declared preferences, and WhatsApp consent — a qualitatively different and scarce asset.

**6. Fraud is a structural risk.** Organized WhatsApp groups exploit prize campaigns via burner numbers. Basic fraud detection (rate limiting, phone deduplication) required before any live campaign — already enforced at DB level via unique constraint in MVP.

**7. Loi 18-07 (Algerian data protection law).** Requires explicit consent, data deletion rights, preferably local/regional data storage. Consent capture is built into the MVP data model (`consent_given` field, required checkbox).

**8. Enterprise procurement is slow and bank-transfer-based.** Telecoms/FMCGs pay via virement bancaire against a signed devis/bon de commande. A registered legal entity (EURL or SARL) is required before the first enterprise contract.

---

## Go-to-Market Strategy

**Not agency-first.** Running as a service/agency conflicts with the institutional startup path (Label Startup Algeria requires a product company) and dilutes product-building focus.

**Chosen model: design partner → product → institutional path in parallel.**

**Step 1 — Design partners (not paying clients):** Find 1–2 willing brands to run a real campaign for free or a symbolic fee. Goal: real deployment, real data, public case study. Product validation, not service delivery.

**Step 2 — Institutional path (parallel track):**
- **Label Innovant** first (lighter criteria, pre-startup stage)
- **Label Startup Algeria** — granted by the Startup Committee (Ministry of Knowledge Economy). 4-year tax exemptions, social contribution exemptions, easier bank access, investor credibility. Innovation argument: Darija AI layer (V2) + local zero-party data infrastructure.
- **Incubateurs** — IMPACT DZ (Telecom Algeria-backed), university incubators
- **Algeria Venture / state VC funds** — available to Label Startup holders
- **AAPI** — investment facilitation once past validation stage

**Step 3 — Commercial launch:** Once case study exists and platform is stable, approach enterprise clients with proof. Invoicing (per-campaign or monthly license), bank transfer. White-label licensing to agencies as a distribution channel.

**Pricing reference (to be refined post-validation):**
- Basic campaign (1 mechanic, 30 days, ≤50K participants): 150K–300K DZD
- Premium (custom design, analytics report): 400K–800K DZD
- Ramadan activation package: 1M–2M DZD
- White-label agency license (V2): 100K–250K DZD/month

---

## MVP Architecture (Current Baseline After Phase 1)

### Core principle
**Responsive web app** — browser-based, works on desktop and mobile. No PWA, no native app, no service workers, no app manifest. The player taps a link (WhatsApp/SMS) and it opens in any browser. Must be tested specifically in WhatsApp's built-in WebView for rendering compatibility.

### Tech stack
React 18 + Vite + TypeScript, Tailwind CSS (mobile-first), React Router v6, Supabase (PostgreSQL + Auth + Storage + Edge Functions), `react-custom-roulette` (prize wheel — never build a custom wheel), `qrcode.react`, `framer-motion` (result reveal screen), `react-hook-form`.

### Data model (multi-tenant from day one)
- `organizations` — one per client company, has a `plan` field
- `profiles` — extends auth.users, links to organization, has a role
- `campaigns` — belongs to an organization, has `win_probability`, lifecycle states, and relaunch linkage
- `prizes` — campaign-specific prize instances linked to templates
- `prize_templates` — reusable org-level prize library with independent stock ownership
- `prize_template_items` — per-template prepared values (manual/bulk), including coupon codes
- `prize_inventory` — atomic stock for campaign prize instances
- `quiz_questions` — campaign-specific
- `entries` — one row per player participation, unique constraint on (campaign_id, phone_number), includes coupon tracking fields
- `coupon_redemptions` — audit trail for assigned coupon values with uniqueness guarantees
- `billing` — placeholder row per organization (plan, status) — no real payment integration yet

### Player Face (public, dark theme, 3 screens)
1. Landing (`/play/:slug`) — brand info, prize teaser, name+phone+consent form
2. Game (`/play/:slug/game`) — Prize Wheel or Quiz, calls a server-side Edge Function for the result
3. Result (`/play/:slug/result`) — win/no-win, claim instructions, WhatsApp share, instant coupon display for winners

### Client Dashboard (protected, light theme)
- Home — active campaigns overview
- Campaigns — full history with Active/Archived tabs, **relaunch button** (pre-fills a new campaign from a past one, sets `parent_campaign_id`)
- New Campaign — 4-step form (basics + win_probability slider, prizes with optional import from template library, quiz questions, review/publish)
- Campaign Detail — stats, entries table with CSV export, prize breakdown, archive/relaunch actions
- Prizes — reusable prize template library (name, description, category, image)
- Inventory — stock tracking per prize template, low-stock warnings
- Analytics — entries-over-time bar chart, win-rate pie chart, campaign performance table (recharts-based, built to be extended with more chart types)
- Account — profile + organization settings
- Billing — plan comparison table, usage display, placeholder upgrade flow (no real payment processor yet)

### Critical security rule
Prize selection (win/loss decision + stock decrement) is **always server-side**, via Supabase Edge Function (`select-prize`) using the service role key. The browser never decides the outcome — it only animates a result the server already determined. This is non-negotiable.

Coupon confirmation for anonymous players is server-backed via `confirm-coupon` edge function to avoid RLS-related silent failures on direct anon updates.

### Infra notes for eventual production scale
A telecom blasting a campaign link to millions of subscribers will generate massive simultaneous traffic in under 60 seconds. Production backend must be serverless/auto-scaling (Supabase Edge Functions + Vercel handle this natively). This is the highest platform-credibility risk at real launch — not a concern for MVP/validation phase.

---

## Build & Dev Environment

- **Scaffolding tool:** Bolt.new (generous free tier, used to generate the initial full-stack scaffold from a structured technical prompt). Replit considered as a fallback if Bolt proves insufficient.
- **Code hosting:** GitHub (private repo)
- **Local dev environment:** Ubuntu with Node.js, npm, npx, Docker, and the Supabase cloud is used ( free tier and i might use the local one if limits hit ! ) .
- **Editor:** VSCode, using **copilot code assistant** (chat + agent mode) for AI-assisted coding.
- **Production deployment (when ready to demo):** Vercel (frontend, auto-deploy from GitHub) + Supabase Cloud (database + Edge Functions, free tier).

### Extensibility principle
The scaffold is deliberately structured for easy iteration: one custom React hook per data domain (`useCampaigns`, `usePrizes`, `useInventory`, `useAnalytics`, etc.), all TypeScript interfaces centralized in `src/types/index.ts`, detailed inline code comments throughout (I am IT-literate but not a professional developer). Adding a feature follows a consistent pattern: DB column/table → TypeScript type → hook → form → display.

---

## Features Deferred to Later Versions

Validated ideas, explicitly NOT in MVP scope. Do not suggest building these now unless I ask to move into that phase:

**Deferred technical features:**
- OTP/SMS phone number verification
- Strict multi-tenant data isolation hardening (basic org-scoping via RLS is already in MVP; deeper isolation work comes with real multiple paying clients)
- Advanced analytics beyond the MVP base (cohort breakdowns, time-of-day heatmaps, device split)
- White-label theming for agency resellers
- API integrations with client CRM systems
- Webhook/automation layer
- Real payment provider integration (Stripe, Chargily, etc.) for billing
- QR code generation (explicitly excluded from MVP — not needed for now)

**Deferred AI features:**
- Darija campaign content generation (quiz questions, prize copy, landing page text in Algerian dialect) — connects to prior DziriBERT/MARBERT NLP work
- Fraud/multi-entry behavioral detection (ML-based anomaly scoring)
- Dynamic AI-driven prize probability optimization (the MVP already has a manual win_probability slider — AI-driven auto-adjustment is the V2 evolution of this)
- Post-campaign audience segmentation and AI-generated insight reports

These features, especially the Darija NLP layer, are the long-term competitive moat. Built once the core product loop is validated and generating revenue.

---

## Known Risks and Blind Spots

- **Prize fulfillment:** Physical prize logistics (who ships, stores, verifies winners) must be defined per campaign — operational, not technical.
- **Seasonal revenue:** Near-zero activity outside Ramadan + summer + New Year. Must be modeled in personal runway planning.
- **Legal entity required:** Must register EURL or SARL before signing any enterprise contract.
- **Competitive moat fragility:** The concept is copyable once proven. Moat = Darija AI layer (V2) + local brand trust + execution speed.
- **Post-win claiming flow:** How does a winner prove they won and claim their prize? Needs a defined protocol before first live campaign — currently handled via the `claim_instructions` text field on each campaign, shown on the result screen.
- **Agency channel tension:** Digital agencies are both the best reseller channel and the most motivated competitor once the concept is proven.

---

## Current Stage

**Phase 1 complete (M0 -> S7).**

Core MVP flows are implemented: localization baseline, account/email flow, inventory-template model corrections, campaign draft/update lifecycle, UX/error handling hardening, instant coupon delivery, coupon confirmation tracking, and duplicate participation gating.

**Current focus:** Phase 2 planning and execution (stabilization + next feature tranche), while keeping Supabase manual-action discipline (explicitly flag migrations/function redeploys in reports/chat).

---

## How to Help Me

When I ask questions about this project, assume all of the above as baseline context. I may need help with:
- Product decisions (feature prioritization, UX flow, game mechanics)
- Technical architecture and code (React/TypeScript/Supabase specifics, debugging, extending the scaffold)
- Business strategy (pricing, design partner outreach, Label Startup application)
- Market research (DZ competitive landscape, benchmarks, comparable markets)
- Client outreach and messaging (discovery interviews, pitch approach)
- AI/NLP integration planning (Darija model, fraud detection — for future phases)
- Legal/compliance (Loi 18-07, halal compliance framing, EURL/SARL registration)

Always be direct. No vague encouragement. Challenge my assumptions when they're weak. Give concrete, operational answers.
