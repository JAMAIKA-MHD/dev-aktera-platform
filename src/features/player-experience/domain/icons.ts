// Names of the icons a brand can pick. The domain only knows the names: the matching
// lucide components live in presets/icons.ts, so the domain stays free of React.
export const ICON_NAMES = [
  "crown",
  "trophy",
  "gift",
  "coins",
  "zap",
  "star",
  "gem",
  "ticket",
  "percent",
  "wifi",
  "target",
  "help-circle",
  "box",
  "flame",
  "sparkles",
  "shopping-bag",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
