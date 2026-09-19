# AKTERA — Context System Index

**Version:** 1.0  
**Last updated:** 2026-09-19  
**Purpose:** Entry point for humans and AI systems working with AKTERA.

---

## 1. What this system is

AKTERA's context is intentionally split across multiple documents instead of being compressed into one giant prompt.

The goal is to keep the following dimensions clear, comprehensive, and independently maintainable:

- company vision and strategic ambition;
- current product model;
- current implementation state;
- technical architecture and engineering rules;
- business/commercial context;
- important decisions and their rationale;
- AI operating rules.

These documents are complementary. They are **not** seven competing versions of AKTERA.

---

## 2. Read the right file for the task

| Need                                                          | Canonical file                   |
| ------------------------------------------------------------- | -------------------------------- |
| Understand what AKTERA is trying to become                    | `AKTERA_VISION.md`               |
| Understand the product concept and product model              | `AKTERA_PRODUCT.md`              |
| Know what exists right now                                    | `AKTERA_CURRENT_STATE.md`        |
| Work on code, architecture, database, security, deployment    | `AKTERA_TECHNICAL.md`            |
| Understand customers, business model, GTM, market assumptions | `AKTERA_BUSINESS.md`             |
| Understand why important choices were made                    | `AKTERA_DECISIONS.md`            |
| Know how an AI should use all of this context                 | `AKTERA_AI_OPERATING_CONTEXT.md` |

---

## 3. Authority hierarchy

When information conflicts, use this order unless a task explicitly says otherwise:

1. **Actual repository / deployed system** for implementation facts.
2. `AKTERA_CURRENT_STATE.md` for the team's current declared product state.
3. `AKTERA_TECHNICAL.md` for technical intent, architecture, and engineering rules.
4. `AKTERA_PRODUCT.md` for product semantics and product-model definitions.
5. `AKTERA_VISION.md` for long-term direction and strategic ambition.
6. `AKTERA_BUSINESS.md` for commercial assumptions and market hypotheses.
7. Historical decks, applications, competition documents, and older prompts are references, not canonical current truth.
8. `AKTERA_DECISIONS.md` explains deliberate choices and should be consulted when a proposed change appears to reopen an already-made decision.

The repository is authoritative for what the code actually does. Context files explain intent, state, constraints, and direction.

---

## 4. Knowledge-status vocabulary

Use these statuses consistently:

- `LIVE` — implemented and currently usable.
- `PARTIAL` — meaningful functionality exists but the capability is incomplete.
- `IN_PROGRESS` — actively being built now.
- `DEMO_READY` — considered part of the version intended for demonstrations to prospective clients.
- `PILOT_TARGET` — intended for the first real client deployments after the next maturity step.
- `PLANNED` — decided future work, not currently implemented.
- `EXPLORATORY` — under investigation; not a commitment.
- `HYPOTHESIS` — business/product belief that still requires validation.
- `DEPRECATED` — no longer part of the active direction.
- `UNKNOWN` — the source of truth has not yet been verified.

Never silently convert `PLANNED`, `EXPLORATORY`, or `HYPOTHESIS` into a fact.

---

## 5. Core conceptual model

AKTERA is a **Customer Engagement / Marketing Infrastructure company**.

The current product is a **Customer Engagement Platform** for businesses, initially focused on interactive and gamified marketing campaigns.

Gamification is the current product wedge, not the definition or long-term boundary of the company.

A useful current product mental model is four functional domains:

1. Engagement
2. Inventory & Rewards
3. Data
4. Insights

This four-domain model is a **product-thinking simplification**, not a rigid architectural law. It may evolve as product understanding improves.

Security, compliance, reliability, privacy, and business-integrity controls are cross-cutting foundations of the whole platform. They are not secondary to the four domains.

---

## 6. Current maturity model

AKTERA should not be represented as a minimal toy prototype versus a finished enterprise product.

The current progression is:

**Proof of concept → functional MVP → demo-ready MVP → production-grade pilot platform → scalable production platform**.

The MVP has intentionally been pushed beyond a minimal prototype because B2B demonstrations require enough interconnected product functionality to show real value.

The immediate product objective is a coherent demo-ready version. ProtoMarket is intended to help move AKTERA toward a production-grade platform suitable for a small number of real client deployments, while continued product and technical improvements happen incrementally toward scale.

---

## 7. Important anti-drift rules

- Do not call AKTERA merely a "gamification platform" without explaining that gamification is the current wedge inside a broader Customer Engagement Platform.
- Do not describe the four-domain model as a rigid architecture.
- Do not treat current Supabase usage as proof that Supabase is the permanent backend architecture.
- Do not treat planned integrations, sovereign backend work, computer-vision exploration, or future experience formats as implemented.
- Do not treat early pricing, TAM/SAM/SOM, or other business numbers as validated facts unless explicitly updated in the business context.
- Do not store secrets, passwords, API keys, or production credentials in these context documents.
- Do not assume that a historical competition document is more current than the repository or the current-state file.

---

## 8. Minimal AI loading rule

For a general AKTERA session:

1. Read this file.
2. Read `AKTERA_AI_OPERATING_CONTEXT.md`.
3. Read only the domain file(s) relevant to the task.
4. For implementation work, inspect the repository itself before making claims about current code behavior.
5. Check `AKTERA_CURRENT_STATE.md` before assuming a feature is implemented.
6. Check `AKTERA_DECISIONS.md` when proposing changes to established product or technical direction.

Avoid loading every historical document into every AI session.
