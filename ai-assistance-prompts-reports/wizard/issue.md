[FEATURE] Integration of Modular Campaign Creation Wizard (2-Layer Engagement & Reward Architecture)
Open Issue created 2 weeks ago by Mohamed Baraka
Open
Issue
[FEATURE] Integration of Modular Campaign Creation Wizard (2-Layer Engagement & Reward Architecture)
The Problem
Existing monolithic tools blur what the customer actually does (play a game, answer questions, spin a wheel) with how rewards are determined and distributed (instant odds, guaranteed coupon). This causes: Poor UX patterns and broken logic.

Scope
compaign
inventory
player screen editor
reward library
The Solution: 2-Layer Decoupled Architecture
AKTERA standardizes all promotional campaigns across two decoupled layers:

Layer 1: Engagement Layer (What the Player Does):
Skill-based: Performance minigames (Catcher, Memory Match, Reflex Speed Tap).
Knowledge-based: Brand trivia, zero-party preference diagnostics, predictors.
Luck-interaction: 1-tap/gesture chance actions (Wheel of Fortune, Scratch Card, Mystery Box).
Layer 2: Reward Determination Layer (How the Outcome is Determined):
Instant-Win: Immediate resolution upon engagement completion.
Guarenteed-Winning: 100% win rate. Every qualified participant receives a verified reward (e.g. universal 10% discount pass or free sample voucher). Zero losers.
Probabilistic-Winning: Win probability % (e.g. 25% win rate) against limited inventory.
Draw-Based: Scheduled grand sweepstake raffle (delayed audited drawing).
🚨 Critical Architectural Guardrails (Enforced in Wizard & Backend)
Guaranteed Winning is a SUBSECTION inside Instant-Win:
Guaranteed winning is NOT a standalone 3rd top-level category.
It is an operational mode inside the Instant-Win layer:
Mode A: Probabilistic Odds: Win probability % (e.g. 25% win rate) against limited inventory.
Mode B: Guaranteed Winning ("100% Gagnant"): 100% win rate. Every qualified participant receives a verified reward (e.g. universal 10% discount pass or free sample voucher). Zero losers.
Luck Interaction Guardrail (No Gameplay Settings —> Direct Pass-through):
When an operator chooses a Luck engagement, there are ZERO Engagement Mechanic Selection + settings (no timers, no target scores, no difficulty sliders).
The wizard UI displays an informational notice saying that you will select the luck mechanic in reward distribution part card and that’s it.
Pluggable Multi-Mechanics Library for BOTH Layers:
The wizard must consume a modular MechanicsRegistry for both Layer 1 and Layer 2 so platform creators can enrich the library with new minigames or prize reveals without code changes to the wizard engine.
Step-by-Step Functional Specifications (5 Wizard Steps)
Step 1: Campaign Foundation & Brand Settings
Form Fields:
campaignName: string (required, 3-80 chars)
brandName: string (required, 2-50 chars)
slug : string ( unique value : hash ) auto generated, not editable
startDate / endDate: timeline (datetime type)
image : upload an image or a generic icon will be used
Step 2: Layer 1 — Engagement Configuration
Category Selector:
skill (Performance minigames)
knowledge (Trivia / Diagnostic)
luck (Chance micro-action)
Dynamic Template Grid:
Renders cards from MechanicsRegistry.filter(m => m.layer === 'engagement' && m.category === selectedL1).
Conditional Configuration Panel:
If skill:
Duration slider (10s – 60s, default 20s)
Target score threshold input (e.g. 50 points)
If knowledge:
Question count selector (1 to 5)
Minimum passing score percentage (0% to 100%)
Question card editor (Question text, 2-4 options, correct answer index)
If luck:
NO GAMEPLAY SETTINGS RENDERED.
Display informational card ( see previousely )
Step 3: Layer 2 — Reward Determination Configuration
Method Selector:
instant (Immediate outcome)
draw (Scheduled grand sweepstake)
If instant:
Operational Sub-Mode Toggle:
probabilistic:
Configurable win probability % (1% - 99%)
(optional) fallback consolation offer for non-winners, select prize to be given from prize library.
Auto-distribute prizes over compaign period : probability is calculated automatically !
guaranteed: 100% win rate ("100% Gagnant"). Universal reward payout to every validated participant.
Dynamic Reward Reveal Selector (from MechanicsRegistry.filter(m => m.layer === 'reward' && m.category === 'instant'))
If draw:
Sweepstake draw scheduled date & time
Total winners to draw (e.g. 3)
Ticket prefix (e.g. #TK-) - optional - auto-generated if not specified !
Official sweepstake rules URL / terms checkbox + possibility to read as popup !
Step 4: Prize Pool & Inventory Management :
this part stays the same as it is in terms of logic , but UI can be changed ofc

Step 5: Review, Mobile Simulation & Publish
Review Summary:
Interactive Mobile Simulator: this button should open up the interactive player sandbox for the user to test it’s compaign before publishing
Action Buttons: stays the same
