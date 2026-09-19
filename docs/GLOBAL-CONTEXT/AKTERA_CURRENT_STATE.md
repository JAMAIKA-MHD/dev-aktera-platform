# AKTERA — Current State of the Product

**Version:** 1.0  
**Last updated:** 2026-09-19  
**Status:** Living document — update whenever product state changes materially

---

## 1. Purpose

This file answers one question:

> **What is true about AKTERA right now?**

It is intentionally separate from the long-term vision and from future plans.

For implementation tasks, this document must be checked before claiming that a capability is implemented.

When this document conflicts with the actual repository, the repository wins for implementation facts and this document should then be corrected.

---

## 2. Current overall state

**Stage:** late functional MVP / moving toward demo-ready MVP.

The MVP has intentionally been pushed beyond a minimal prototype because AKTERA is B2B and the product value is difficult to demonstrate credibly without enough interconnected operational functionality.

The immediate objective is to have a coherent version that can be demonstrated to prospective clients while development continues.

ProtoMarket is intended to help move the platform from this state toward a **production-grade pilot platform** that can support a small number of real client deployments.

This is not the same as being a fully scalable enterprise platform.

---

## 3. Status legend

- `LIVE` — implemented and usable.
- `PARTIAL` — implemented in part.
- `IN_PROGRESS` — actively being built.
- `DEMO_READY` — part of the intended client-demo version.
- `PILOT_TARGET` — expected for first real client deployments.
- `PLANNED` — future work.
- `EXPLORATORY` — under investigation.
- `HYPOTHESIS` — not yet validated as fact.
- `UNKNOWN` — verify before relying on it.

---

## 4. Product capabilities — current snapshot

| Capability                                               | Status                                  | Notes                                                                                                           |
| -------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Campaign management                                      | LIVE                                    | Core dashboard capability is implemented.                                                                       |
| Campaign lifecycle                                       | LIVE                                    | Draft/live, pause/resume, archive, delete guards, update-draft lineage are described in the engineering source. |
| Public player routes                                     | LIVE                                    | Public player route is `/play/:slug`.                                                                           |
| Player engagement flows                                  | LIVE / PARTIAL                          | Existing code includes several player components; verify individual mechanics before claiming completeness.     |
| Lucky wheel                                              | LIVE                                    | Existing engagement mechanic.                                                                                   |
| Quiz                                                     | LIVE                                    | Existing engagement mechanic.                                                                                   |
| Scratch-card experience                                  | LIVE / PARTIAL                          | Player component exists; verify the current business flow before treating it as production-ready.               |
| Mystery-box experience                                   | LIVE / PARTIAL                          | Player component exists; verify completeness before presenting as fully mature.                                 |
| Hit-it experience                                        | LIVE / PARTIAL                          | Player component exists; verify completeness before presenting as fully mature.                                 |
| Prize templates                                          | LIVE                                    | Implemented in the current codebase context.                                                                    |
| Reward inventory / stock                                 | LIVE                                    | Stock and allocation logic are part of the current implementation.                                              |
| Participant entries / lead collection                    | LIVE                                    | Core entry model exists.                                                                                        |
| Duplicate participation protection                       | LIVE                                    | Required business rule; server-side enforcement remains mandatory.                                              |
| Consent gating                                           | LIVE                                    | Explicit consent is required before participation.                                                              |
| Server-side prize decision                               | LIVE                                    | `select-prize` is authoritative for prize outcomes.                                                             |
| Coupon confirmation                                      | LIVE                                    | Server-backed through `confirm-coupon`.                                                                         |
| Analytics dashboard                                      | LIVE                                    | Live dashboard and campaign breakdowns are described by the engineering context.                                |
| Billing views / plan usage                               | LIVE                                    | Product contains billing-related views and calculations; automated checkout is not yet complete.                |
| Player screen editor                                     | IN_PROGRESS                             | Central near-term feature for the demo-ready MVP.                                                               |
| Full visual no-code campaign editor                      | IN_PROGRESS / PLANNED                   | The exact scope is evolving; the current player screen editor is the near-term implementation focus.            |
| Local SMS / OTP integrations                             | PLANNED / PILOT_TARGET                  | Intended next-stage integration work; do not represent as fully live without verification.                      |
| WhatsApp integration                                     | PLANNED / PILOT_TARGET                  | Same rule.                                                                                                      |
| CIB / Edahbia / SATIM payment integration                | PLANNED / PILOT_TARGET                  | Intended future capability; verify before claiming live integration.                                            |
| Sovereign backend                                        | PLANNED / IN_PROGRESS at strategy level | MVP uses Supabase heavily; future work is to build more controlled/sovereign backend capability.                |
| Cloud hosting / deployment capability for the next stage | PLANNED / PILOT_TARGET                  | ProtoMarket is expected to help establish this operational capability.                                          |
| Production-grade pilot operations                        | PILOT_TARGET                            | Target after the next development/infrastructure stage.                                                         |
| Large-scale production platform                          | PLANNED                                 | Longer-term maturity target.                                                                                    |
| Computer-vision customer experiences                     | EXPLORATORY                             | Part of long-term ambition, not current product implementation.                                                 |

---

## 5. Current technical implementation state

The current repository source of truth describes:

- React;
- Vite;
- TypeScript;
- Tailwind CSS;
- React Router v6;
- Supabase;
- PostgreSQL through Supabase;
- Row Level Security;
- Supabase Storage;
- Supabase Edge Functions;
- Supabase Auth.

The MVP intentionally used Supabase to accelerate development and validation rather than investing heavily in a custom backend from the beginning.

The future direction is to progressively build a more sovereign/controlled backend and deployment infrastructure as the project moves toward real client deployments.

---

## 6. Current critical safeguards

These should remain active unless explicitly changed by a deliberate architecture decision:

- prize outcomes are server-side;
- RLS remains enabled and respected;
- duplicate participation remains enforced;
- consent gating remains strict;
- reward assignment and confirmation remain server-backed;
- critical business logic must not be silently duplicated or weakened in the client;
- backend/database/security failures must not be hidden by broad client-side fallbacks.

---

## 7. Known current gaps / operational risks

From the existing engineering context:

- automated checkout/payment upgrade flow is not yet implemented;
- some optional legal business fields are not fully productized end-to-end;
- build output may warn about large chunk size;
- edge-function deployment is a separate cloud action and does not automatically publish local changes;
- `select-prize` must be redeployed when relevant local changes are made.

These are implementation/operational notes and should be re-verified as the repository evolves.

---

## 8. Current client-demo goal

The near-term demo version should communicate real product value through coherent workflows, not isolated UI screens.

The demonstration should be able to make a prospective B2B customer understand the flow from campaign creation/configuration through customer participation and reward/data/measurement outcomes, to the extent supported by the current implementation.

The current product is therefore in a **"usable enough to demonstrate, still actively evolving"** stage.

---

## 9. What must not be assumed

Do not infer any of the following without checking current evidence:

- that every engagement mechanic is production-ready;
- that every planned local integration is live;
- that a sovereign backend already exists;
- that the platform is production-scale;
- that the commercial model has been validated;
- that market-size estimates are established facts;
- that future computer-vision work is committed to a fixed roadmap.

---

## 10. Update discipline

Whenever a meaningful feature changes state, update this file.

For example:

`IN_PROGRESS → DEMO_READY → PILOT_TARGET → LIVE`

A feature should not jump directly from `PLANNED` to `LIVE` in documentation if there is an intermediate implementation stage that matters for AI reasoning.
