/**
 * Centralized Design Tokens for Soft UI / Neumorphic Light Theme
 * Single source of truth for all colors, shadows, borders, radiuses, and typography.
 */

export const SOFT_UI_THEME = {
  colors: {
    // Backgrounds
    bg: "#F0F2F5",
    bgSecondary: "#F8FAFC",
    card: "#FFFFFF",
    surfaceSubtle: "#F1F4F9",

    // Primary Accent (Royal Blue)
    accent: "#2F6FED",
    accentHover: "#2558CA",
    accentLight: "#EBF2FE",
    accentGlow: "rgba(47, 111, 237, 0.25)",
    accentText: "#FFFFFF",

    // Supporting Status Accents
    success: "#10B981",
    successLight: "#ECFDF5",
    danger: "#EF4444",
    dangerLight: "#FEF2F2",
    warning: "#F59E0B",
    warningLight: "#FFFBEB",

    // Text & Neutrals
    textPrimary: "#2D3748",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    textDark: "#1E293B",

    // Borders & Dividers
    border: "#E2E8F0",
    borderSubtle: "#E8ECEF",
    borderLight: "#EDF2F7",

    // Input Specific
    inputBg: "#FFFFFF",
    inputBorder: "#E2E8F0",
    inputPlaceholder: "#94A3B8",
    inputText: "#2D3748",
  },

  shadows: {
    // Neumorphic Dual Diffused Shadows
    extruded:
      "6px 6px 16px rgba(163, 177, 198, 0.35), -6px -6px 16px rgba(255, 255, 255, 0.85)",
    extrudedSm:
      "3px 3px 8px rgba(163, 177, 198, 0.3), -3px -3px 8px rgba(255, 255, 255, 0.8)",
    extrudedLg:
      "10px 10px 24px rgba(163, 177, 198, 0.4), -10px -10px 24px rgba(255, 255, 255, 0.9)",

    // Inset / Well Shadow
    inset:
      "inset 2px 2px 5px rgba(163, 177, 198, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.7)",
    insetSm:
      "inset 1px 1px 3px rgba(163, 177, 198, 0.15), inset -1px -1px 3px rgba(255, 255, 255, 0.6)",

    // Primary Action Button Shadow
    accentBtn:
      "0 6px 18px rgba(47, 111, 237, 0.28), 0 2px 6px rgba(0, 0, 0, 0.04)",
    accentBtnHover:
      "0 8px 24px rgba(47, 111, 237, 0.38), 0 3px 8px rgba(0, 0, 0, 0.06)",

    // Neutral Card Floating Elevation
    cardElevation:
      "0 10px 30px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)",
    softFloat: "0 4px 14px rgba(0, 0, 0, 0.05)",
  },

  radii: {
    card: "20px",
    cardLg: "24px",
    button: "14px",
    input: "12px",
    pill: "9999px",
    badge: "8px",
  },
} as const;

export default SOFT_UI_THEME;
