# AKTERA — Decision Log

**Version:** 1.0  
**Last updated:** 2026-09-19  
**Purpose:** Record important product/technical/strategic choices so they are not repeatedly re-litigated by AI or by future team members.

---

## D001 — Company identity is Customer Engagement / Marketing Infrastructure

**Date:** 2026-09-19  
**Status:** Active

### Decision

AKTERA should be understood as a Customer Engagement / Marketing Infrastructure company.

The current gamified campaign product is the initial wedge, not the company's permanent category boundary.

### Why

The long-term ambition includes broader marketing/customer-experience opportunities and should remain open to adjacent technologies and use cases.

### AI implication

Never reduce AKTERA to "a gamification platform" in strategic/product reasoning unless the context specifically concerns the current gamification wedge.

---

## D002 — Four-domain product model is conceptual, not rigid

**Date:** 2026-09-19  
**Status:** Active

### Decision

The current product can be simplified into four functional domains:

- Engagement
- Inventory & Rewards
- Data
- Insights

This is a product-thinking model, not a rigid architecture.

### Why

The model is useful for simplifying product communication and helping developers reason about the platform, while preserving the freedom to change the model as product understanding improves.

### AI implication

Do not build or reject technical architecture solely because it does or does not fit the four-domain metaphor.

---

## D003 — Security is foundational and cross-cutting

**Date:** 2026-09-19  
**Status:** Active

### Decision

Security, privacy, compliance, integrity, and reliability are foundational concerns across the whole platform.

### Why

AKTERA handles real participants, customer data, rewards, eligibility rules, and campaign outcomes.

### AI implication

Do not treat security as an optional layer added after product functionality.

---

## D004 — Inventory & Rewards is a first-class product domain

**Date:** 2026-09-19  
**Status:** Active

### Decision

Inventory and rewards are first-class components of the product model.

### Why

A campaign with unreliable reward allocation or stock handling cannot deliver the intended business value or operational trust.

### AI implication

Treat reward/inventory correctness as core product correctness.

---

## D005 — MVP intentionally uses Supabase to move fast

**Date:** MVP phase  
**Status:** Active, with future evolution planned

### Decision

The MVP uses Supabase for substantial backend/data/auth/storage capabilities.

### Why

The team prioritized speed of validation and frontend/product experimentation instead of investing heavily in custom backend infrastructure at the earliest stage.

### AI implication

Supabase is the current implementation foundation, but not necessarily the permanent backend architecture.

---

## D006 — Move toward sovereign/controlled backend infrastructure

**Date:** 2026-09-19  
**Status:** Planned

### Decision

As funding and product maturity increase, AKTERA should progressively establish a more sovereign/controlled backend and deployment infrastructure.

### Why

The project is moving from MVP validation toward real client/pilot operation and needs stronger control over backend, hosting, deployment, security, and operational capabilities.

### AI implication

Design current changes so they do not unnecessarily block future migration, while avoiding premature rewrites.

---

## D007 — MVP is beyond a minimal prototype by design

**Date:** 2026-09-19  
**Status:** Active

### Decision

AKTERA's MVP is intentionally more interconnected and operational than a minimal proof-of-concept.

### Why

B2B customers need to see meaningful end-to-end value in demos. Core workflows such as campaign lifecycle and inventory need enough substance to make the product credible.

### AI implication

Do not dismiss current complexity as accidental scope creep. Some complexity is necessary for credible B2B demonstration.

---

## D008 — Near-term goal is demo-ready MVP

**Date:** 2026-09-19  
**Status:** Active

### Decision

The immediate product target is a demo-ready MVP version, including the player screen editor being built now and the existing functional foundation.

### Why

The team plans to begin demonstrating the product to prospective clients while continuing development.

### AI implication

When prioritizing work, favor coherent demonstrability and end-to-end value over isolated feature accumulation.

---

## D009 — ProtoMarket target is production-grade pilot capability

**Date:** 2026-09-19  
**Status:** Active

### Decision

ProtoMarket should be understood as a step toward a production-grade platform suitable for a small number of real client deployments, not as the final endpoint of platform maturity.

### Why

The product needs enough operational quality for real usage, followed by continued iteration toward scale.

### AI implication

Use the maturity path: demo-ready MVP → production-grade pilot → scalable production.

---

## D010 — Business numbers remain hypotheses until better validated

**Date:** 2026-09-19  
**Status:** Active

### Decision

Exact pricing, TAM/SAM/SOM, and similar early commercial numbers from older documents are not canonical validated facts.

### Why

The market study is still being developed.

### AI implication

Label such numbers as hypotheses/working assumptions unless a newer source explicitly validates them.

---

## D011 — Founders and team members are different categories

**Date:** 2026-09-19  
**Status:** Active

### Decision

Mohamed Baraka and Mohamed Mondhir Heddouche are the founders/co-founders and permanent founding core.

The additional two developers are team members/equity participants, but their continued involvement is not assumed to be permanent in the same way as the founders.

### AI implication

Do not present all four people as equivalent founder roles unless explicitly instructed for a particular external context.

---

## D012 — No secrets in reusable AI context

**Date:** 2026-09-19  
**Status:** Active

### Decision

No reusable AKTERA context file may contain passwords, API keys, service credentials, production tokens, or other secrets.

### Why

Context files are copied, shared, indexed, and reused across AI tools and humans.

### AI implication

Use placeholders or describe the access mechanism without storing the secret value.
