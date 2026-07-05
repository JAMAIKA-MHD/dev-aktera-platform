# YOUENGAGE Context Migration Bridge

## Purpose
This file explains how the new UI project should inherit the proven YOUENGAGE product logic without rebuilding everything from scratch.

## Project relationship
- **Old project** = source of truth for:
  - business logic
  - Supabase schema
  - Edge Functions
  - security / RLS rules
  - player flow logic
  - historical implementation decisions
- **New project** = UI replacement target:
  - use the new design system/UI shell
  - reuse the proven backend logic and product rules
  - do not redesign core business behavior unless explicitly requested

## What must be preserved from the old project
- Prize selection stays server-side
- RLS stays enabled on all exposed tables
- Coupon assignment and confirmation stay server-backed
- Duplicate participation checks stay enforced
- Consent gating stays strict
- Arabic-capable text surfaces must support `dir="auto"`
- English remains the UI language
- Mobile-first touch target sizing stays enforced

## What the new agent should do
1. Read the context files first.
2. Map the new UI structure.
3. Identify where old business logic should be wired into the new UI.
4. Reuse existing Supabase tables, edge functions, and security constraints where possible.
5. Only redesign what is needed for the UI migration.
6. Report gaps, risks, and missing integrations before implementation.

## Source files to read
- `.github/instructions/MVP-YOUENGAGE-INSTRUCTION-FILE.instructions.md`
- `.github/instructions/master_context_prompt_DZ_gamification.md`
- `ai-assistance-prompts-reports/phase-1-closeout-report.md`
- `ai-assistance-prompts-reports/phase-2-source-of-truth.md`

## Working principle
Do not treat this as a greenfield rebuild.  
Treat it as:
**new UI + existing validated product logic + careful wiring + minimal regression risk**

## Expected output from the agent before coding
The agent should first provide:
- a mapping of new UI areas to old MVP logic
- reusable backend/data pieces
- missing integrations
- risks and likely bugs
- a recommended implementation order

## Final rule
If something already works in the old project, prefer reusing it rather than recreating it.
