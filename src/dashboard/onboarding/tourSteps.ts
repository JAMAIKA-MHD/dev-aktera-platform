// The steps of the product tour and where each card goes. Targets are `data-tour` attributes,
// never class names, so a restyle cannot break the tour. Free of React: tested on its own.

export type TourSide = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  titleKey: string;
  title: string;
  bodyKey: string;
  body: string;
  /** `data-tour` values to highlight; the card sits by the first one found. */
  targets: string[];
  side: TourSide;
  /** Lives in the sidebar: the rail stays open for it, and a phone's drawer opens. */
  inSidebar?: boolean;
}

const sidebarStep = (
  id: string,
  title: string,
  body: string,
  target: string,
): TourStep => ({
  id,
  titleKey: `onboarding.${id}Title`,
  title,
  bodyKey: `onboarding.${id}Body`,
  body,
  targets: [target],
  side: "right",
  inSidebar: true,
});

export const TOUR_STEPS: TourStep[] = [
  sidebarStep(
    "overview",
    "Your command center",
    "See live campaigns, upcoming launches, stock alerts and performance at a glance.",
    "sidebar-overview",
  ),
  sidebarStep(
    "campaigns",
    "Campaign Radios",
    "Create and manage every campaign here: spins, quizzes and more. Schedule, pause or archive them.",
    "sidebar-campaigns",
  ),
  sidebarStep(
    "rewards",
    "Reward Library",
    "Your inventory of vouchers and prizes. Add rewards, track stock and get low-stock alerts.",
    "sidebar-rewards",
  ),
  sidebarStep(
    "analytics",
    "Analytics Desk",
    "Measure participants, rewards claimed and redemption rate over time.",
    "sidebar-analytics",
  ),
  sidebarStep(
    "billing",
    "Billing & Quota",
    "Track your plan, usage and invoices so you never hit a limit by surprise.",
    "sidebar-billing",
  ),
  sidebarStep(
    "studio",
    "Player Studio",
    "Design how your games look to players: branding, colors and layout.",
    "sidebar-studio",
  ),
  sidebarStep(
    "organization",
    "Organization",
    "Invite teammates, manage roles and set your company profile.",
    "sidebar-organization",
  ),
  {
    id: "topbar",
    titleKey: "onboarding.topbarTitle",
    title: "Test and find",
    bodyKey: "onboarding.topbarBody",
    body: "Open player sandbox tests any campaign exactly as a player sees it before going live. Press / to find anything instantly.",
    targets: ["topbar-sandbox", "topbar-search"],
    side: "bottom",
  },
  {
    id: "launch",
    titleKey: "onboarding.launchTitle",
    title: "You're ready",
    bodyKey: "onboarding.launchBody",
    body: "Create your first campaign now.",
    targets: ["new-campaign"],
    side: "bottom",
  },
];

/** Step 0 of a run is the welcome; the tour's steps follow it. */
export const WELCOME_STEP = 0;
export const LAST_STEP = TOUR_STEPS.length;
export const tourStepAt = (step: number): TourStep | null =>
  TOUR_STEPS[step - 1] ?? null;

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const OPPOSITE: Record<TourSide, TourSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

export interface CardPlacement {
  top: number;
  left: number;
  /** Where the card ended up, and its arrow along that edge. Null: no room beside the target. */
  side: TourSide | null;
  arrow: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Puts the card beside its target, on the preferred side if it fits, always inside the screen. */
export function placeCard(
  target: Box,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  prefer: TourSide,
  { gap = 14, margin = 12 } = {},
): CardPlacement {
  const room: Record<TourSide, number> = {
    top: target.top - margin,
    bottom: viewport.height - target.top - target.height - margin,
    left: target.left - margin,
    right: viewport.width - target.left - target.width - margin,
  };
  const needs = (side: TourSide) =>
    (side === "top" || side === "bottom" ? card.height : card.width) + gap;
  const order: TourSide[] = [
    prefer,
    OPPOSITE[prefer],
    "bottom",
    "top",
    "right",
    "left",
  ];
  const side = order.find((option) => room[option] >= needs(option)) ?? null;

  const maxLeft = viewport.width - card.width - margin;
  const maxTop = viewport.height - card.height - margin;
  if (!side) {
    // A small screen with no free side: docked to the bottom, the highlight stays visible above.
    return {
      top: clamp(maxTop, margin, maxTop),
      left: clamp((viewport.width - card.width) / 2, margin, maxLeft),
      side: null,
      arrow: 0,
    };
  }

  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;
  if (side === "top" || side === "bottom") {
    const left = clamp(centerX - card.width / 2, margin, maxLeft);
    return {
      top:
        side === "bottom"
          ? target.top + target.height + gap
          : target.top - card.height - gap,
      left,
      side,
      arrow: clamp(centerX - left, 18, card.width - 18),
    };
  }
  const top = clamp(centerY - card.height / 2, margin, maxTop);
  return {
    top,
    left:
      side === "right"
        ? target.left + target.width + gap
        : target.left - card.width - gap,
    side,
    arrow: clamp(centerY - top, 18, card.height - 18),
  };
}
