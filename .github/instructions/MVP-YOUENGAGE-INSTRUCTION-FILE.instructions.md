---
name: DZ-Gamification-MVP-Coach
description: Engineering rules for Phase 2+ development of YOUENGAGE MVP
applyTo: "**/*"
---

# YOUENGAGE Context (Post-Phase-1 Baseline)
YOUENGAGE is a DZ gamification marketing SaaS MVP for B2B brands to collect zero-party data through localized interactive campaigns.

Phase 1 (M0 -> S7) is complete. New work is Phase 2+ only.

## Core Architecture & Stack
- **Frontend:** React + Vite (TypeScript), Tailwind CSS (Mobile-first, max-width: 480px for player screens)
- **Routing:** React Router v6
- **Backend/DB:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Mandatory Libraries:** `react-custom-roulette` (for wheel), `qrcode.react` (for QR codes), Framer Motion (only for result reveal screen)

## Strict Engineering Rules

### 1. Database & Security
- All tables must enforce Row Level Security (RLS).
- **Rule 1 (Non-Negotiable):** Prize selection is always server-side. Never compute win/loss outcome in frontend code.
- Keep coupon assignment and confirmation server-backed (`select-prize`, `confirm-coupon`).
- Use canonical schema names (`campaigns`, `prizes`, `quiz_questions`, `entries`, plus inventory/template/coupon tracking tables already introduced in Phase 1).
- Do not introduce broad `try/catch` fallbacks that hide security or RLS failures.

### 2. Legal & Localization Boundaries (Algerian Market)
- All UI labels must be in **English**.
- Fields that display prize names or question text may contain Arabic. Wrap these text layers with `dir="auto"` to guarantee correct right-to-left rendering.
- **Font Stack:** `'Poppins', 'Noto Sans Arabic', sans-serif`.
- **Loi 18-07 Compliance:** Player CTA must remain disabled and unclickable until consent is explicitly checked.


## Design Tokens (Tailwind Application)
- **Dark Theme (Player Screens):** `--color-bg: #0F0F1A`, `--color-surface: #1E1E2E`, `--color-primary: #7C3AED`
- **Light Theme (Dashboard):** Use standard tailwind grays, tailwind border tokens (`#E5E7EB`), and `#F9FAFB` for main panels.
- **Mobile Touch Targets:** All interactive elements (buttons, inputs, options) must have a minimum height of 48px.


# Execution Rules for Future AI Sessions
1. **Work in small milestones** and keep scope focused.
2. **Run validation after each milestone:** `npm run lint`, `npm run typecheck`, `npm run build`.
3. **Update the active phase source-of-truth report** with:
   - what changed
   - validation status
   - manual Supabase actions required (if any)
   - newly discovered bugs/enhancements
4. **When DB migration or edge function deploy is needed, always state it explicitly** in chat and in the report so the user can run it manually.
5. **Keep edits concise** to avoid file watcher sync lag.
6. **Vite host must stay `0.0.0.0`** for VM/container access chains.


# Important Notes:
- Add short comments only for non-obvious logic blocks.
- Assume user is not senior; explain reasoning clearly and practically.
