# AKTERA — Product Context

**Version:** 1.0  
**Last updated:** 2026-09-19  
**Status:** Current product model

---

## 1. Product definition

AKTERA is a **Customer Engagement Platform** for businesses.

It is designed to let businesses create, customize, deploy, operate, and analyze interactive customer experiences without requiring a separate custom-development project for every campaign.

The current MVP is centered on interactive/gamified marketing campaigns.

The product goal is not to sell games as isolated entertainment. The goal is to provide reusable business infrastructure around customer interaction:

**experience → participation → consented data → rewards/inventory → measurement → learning/reuse**.

---

## 2. Current core product capabilities

The current codebase and project context include capabilities around:

- campaign management;
- campaign lifecycle controls;
- public player experiences;
- multiple engagement mechanics;
- prize/reward templates;
- inventory and stock management;
- participant/lead collection;
- duplicate-participation protection;
- consent gating;
- analytics dashboards and campaign breakdowns;
- account/organization flows;
- billing-related product views;
- media management;
- server-side reward enforcement.

The exact live state of each capability is maintained in `AKTERA_CURRENT_STATE.md` and must be verified against the repository for implementation work.

---

## 3. Product mental model: four functional domains

AKTERA can currently be simplified into four major functional domains:

### 3.1 Engagement

The part of the platform that creates and operates customer experiences.

Examples include interactive campaign formats such as:

- lucky wheel;
- quizzes;
- scratch cards;
- instant games;
- mystery-box-style experiences;
- hit-it-style experiences;
- future loyalty, referral, challenge, collaborative, seasonal, and other engagement formats.

The exact supported set evolves over time.

### 3.2 Inventory & Rewards

The operational layer that manages prizes/rewards and their availability.

It includes concepts such as:

- prize templates;
- inventory/stock;
- allocation/reservation;
- voucher/reference values;
- reward issuance;
- historical/audit protection;
- safe updates and deletes.

Inventory is a first-class product domain because reward reliability is part of campaign reliability.

### 3.3 Data

The layer that collects, qualifies, structures, and makes useful the information obtained through customer interactions, subject to consent and applicable requirements.

An important concept is **Zero-Party Data**: information intentionally provided by the participant.

### 3.4 Insights

The layer that turns campaign activity into decision-support information.

Examples include:

- participation;
- conversion;
- reward distribution;
- participant profiles;
- engagement indicators;
- campaign performance;
- trends.

---

## 4. Important qualification of the four-domain model

The four-domain model is a **product-thinking simplification created to make the product easier to reason about and communicate internally**.

It is **not a rigid software architecture**.

The domains may be renamed, reorganized, split, combined, or expanded as AKTERA's product understanding improves.

Any AI system or team member should treat this model as a useful abstraction, not as a constraint on future design.

---

## 5. Cross-cutting foundations

The following concerns span the entire product rather than belonging to a single product domain:

- security;
- privacy and consent;
- compliance;
- reliability;
- fraud/abuse prevention;
- data ownership;
- business-rule integrity;
- performance;
- auditability.

These are foundational requirements.

---

## 6. B2B product philosophy

AKTERA is B2B and therefore the platform must demonstrate meaningful operational value, not just attractive screens.

A campaign shown to a prospective customer should be able to demonstrate enough of the real workflow for the customer to understand the business value.

This is why the MVP intentionally goes beyond a minimal visual prototype.

A useful principle is:

> **The MVP must contain enough interconnected functionality to make the value proposition demonstrable and credible, without pretending to be a fully scaled enterprise platform.**

---

## 7. Near-term product milestone

The current product direction is to finish a **demo-ready MVP version**.

A central piece currently being built is the **player screen editor**.

The demo-ready version is intended to combine the editor with the existing functional foundation so that AKTERA can begin showing meaningful end-to-end value to prospective clients while development continues.

---

## 8. Product maturity path

AKTERA should be thought of as progressing through:

1. proof of concept;
2. functional MVP;
3. demo-ready MVP;
4. production-grade pilot platform;
5. scalable production platform.

The maturity stages are not purely about feature count. They also involve reliability, infrastructure, security, deployment, operational confidence, customer validation, and real-world use.

---

## 9. Product boundary

Today, the product is focused on customer engagement campaigns.

Tomorrow, it may include broader experience infrastructure.

The product model should therefore prefer reusable primitives and abstractions where reasonable, while avoiding speculative complexity purely for hypothetical future features.

---

## 10. User groups

The main product sides are:

### Business/operator side

Organizations that create, configure, launch, manage, and analyze campaigns.

Typical internal roles may include marketing/product/CRM/business users, depending on the customer organization.

### Player/customer side

End users who access public campaign experiences, typically from mobile devices.

Player flows are expected to be simple, responsive, and consent-aware.
