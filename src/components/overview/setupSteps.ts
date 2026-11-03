// The first steps of a new account. This one array drives everything on screen: the gauge, the
// count, the next-up chip, the guide's rows and the flow map. Add or remove a step here and the
// rest follows; nothing else knows how many there are.
import {
  Flag,
  Gift,
  PenTool,
  Radio,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type SetupStepId = "reward" | "campaign" | "design" | "sandbox" | "live";
export type SetupStepStatus = "done" | "current" | "locked";
export type SetupStyle = "guide" | "own";

interface SetupStepContent {
  id: SetupStepId;
  title: string;
  description: string;
  minutes: number;
  action: string;
  /** How the step reads as a node of the flow map. */
  node: { caption: string; action: string; accent: string; icon: LucideIcon };
}

export interface SetupStep extends SetupStepContent {
  status: SetupStepStatus;
}

/** What the account has really done, read from its data. */
export interface SetupFacts {
  hasReward: boolean;
  hasCampaign: boolean;
  /** A design was saved in the Studio: opening the editor is not enough. */
  hasDesign: boolean;
  sandboxTested: boolean;
  hasLaunched: boolean;
}

const STEPS: SetupStepContent[] = [
  {
    id: "reward",
    title: "Add a reward",
    description: "The voucher or prize players can win.",
    minutes: 2,
    action: "Add a reward",
    node: {
      caption: "Vouchers and prizes",
      action: "Add reward",
      accent: "k3",
      icon: Gift,
    },
  },
  {
    id: "campaign",
    title: "Create a campaign",
    description: "Choose a game and attach your reward.",
    minutes: 3,
    action: "Create campaign",
    node: {
      caption: "Pick a game",
      action: "Create",
      accent: "k1",
      icon: Flag,
    },
  },
  {
    id: "design",
    title: "Design the player screen",
    description: "Style what players see in the player editor.",
    minutes: 5,
    action: "Open editor",
    node: {
      caption: "In the player editor",
      action: "Open editor",
      accent: "k4",
      icon: PenTool,
    },
  },
  {
    id: "sandbox",
    title: "Preview as a player",
    description: "Play it in the sandbox before anyone else sees it.",
    minutes: 1,
    action: "Preview",
    node: {
      caption: "Test in the sandbox",
      action: "Preview",
      accent: "k2",
      icon: Smartphone,
    },
  },
  {
    id: "live",
    title: "Go live",
    description: "Pick your dates and share the link or QR code.",
    minutes: 1,
    action: "Go live",
    node: {
      caption: "Dates and sharing",
      action: "Go live",
      accent: "k1",
      icon: Radio,
    },
  },
];

/**
 * The first step not done is current, and the other open ones are locked. What was really done
 * stays done, in whatever order: "On my own" lets people start anywhere. Going live settles only
 * itself: someone who launched straight away still sees the steps they skipped.
 */
export function deriveSetupSteps(facts: SetupFacts): SetupStep[] {
  const done: Record<SetupStepId, boolean> = {
    reward: facts.hasReward,
    campaign: facts.hasCampaign || facts.hasLaunched,
    design: facts.hasDesign,
    sandbox: facts.sandboxTested,
    live: facts.hasLaunched,
  };
  const currentIndex = STEPS.findIndex((step) => !done[step.id]);
  return STEPS.map((step, index) => ({
    ...step,
    status: done[step.id]
      ? "done"
      : index === currentIndex
        ? "current"
        : "locked",
  }));
}

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

/** "Five", or the figure past the words we have. */
export const numberWord = (count: number) =>
  NUMBER_WORDS[count] ?? String(count);

const CENTER_X = 120;
const CENTER_Y = 128;
const RADIUS = 96;
const GAUGE_SWEEP = 180;
const SEGMENT_GAP = 6;

const pointAt = (degrees: number) => {
  const angle = (degrees * Math.PI) / 180;
  return {
    x: (CENTER_X + RADIUS * Math.cos(angle)).toFixed(2),
    y: (CENTER_Y + RADIUS * Math.sin(angle)).toFixed(2),
  };
};

/**
 * Segment `index` of `count`, sweeping clockwise from the left over the top: equal segments with
 * equal gaps, half a gap at each end, so the arc is symmetrical.
 */
export function gaugeSegmentPath(index: number, count: number): string {
  const share = GAUGE_SWEEP / count;
  const start = 180 + index * share + SEGMENT_GAP / 2;
  const from = pointAt(start);
  const to = pointAt(start + share - SEGMENT_GAP);
  return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 0 1 ${to.x} ${to.y}`;
}
