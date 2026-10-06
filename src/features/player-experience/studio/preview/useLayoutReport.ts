import type {
  LayoutIssue,
  LayoutIssueKind,
} from "../../runtime/layout/layoutAudit";
import { useStudio } from "../StudioContext";

// The live layout audit (plan §9.3, tasks.md T6.10), in the brand's words. The frame measures
// the screen on show after every render and resize, and reports what breaks — or what gets
// cut short — at that size. These are warnings, labelled by size ("At 360×640: the title is
// shortened"); they never block anything: only the design errors of T1.11 do.

export interface LayoutWarning {
  id: string;
  sizeLabel: string; // "360×640"
  message: string;
  path: string | null; // the Studio field to open
}

// What an edit path names, for the player's eye.
export function describeTarget(path: string | null): string {
  if (!path) return "a block";
  const [root, second, third] = path.split(".");
  if (root === "screens") {
    const names: Record<string, string> = {
      title: "the title",
      subtitle: "the subtitle",
      primaryCta: "the main button",
      secondaryCta: "the second button",
      reinforcement: "the encouragement line",
    };
    return names[third] ?? "a text of the screen";
  }
  if (root === "sections") {
    return second === "prizeChips" ? "the prize chips" : "the jackpot card";
  }
  const names: Record<string, string> = {
    brand: "the header",
    form: "the form",
    legal: "the footer",
    game: "the game",
  };
  return names[root] ?? "a block";
}

const PHRASES: Record<LayoutIssueKind, (target: string) => string> = {
  "text-truncated": (target) => `${target} is shortened (the end is cut)`,
  "text-clipped": (target) => `${target} is cut off`,
  "horizontal-overflow": () => "the page scrolls sideways",
  "slot-overlap": (target) => `another block covers ${target}`,
  "cta-too-small": () => "the main button is too small to tap",
  "cta-unreachable": () => "the main button cannot be reached",
  "game-below-floor": () => "the game is squeezed below its minimum size",
  "wheel-not-square": () => "the wheel is not round",
};

export function describeLayoutIssue(
  issue: LayoutIssue,
  size: { width: number; height: number },
): LayoutWarning {
  const sizeLabel = `${size.width}×${size.height}`;
  const phrase = PHRASES[issue.kind](describeTarget(issue.editPath));
  return {
    id: `${sizeLabel}:${issue.kind}:${issue.selector}`,
    sizeLabel,
    message: phrase.charAt(0).toUpperCase() + phrase.slice(1),
    path: issue.editPath,
  };
}

// One warning per kind and target: a long title cut in three nested elements is one problem.
export function describeLayoutIssues(
  issues: readonly LayoutIssue[],
  size: { width: number; height: number },
): LayoutWarning[] {
  const seen = new Set<string>();
  const warnings: LayoutWarning[] = [];
  for (const issue of issues) {
    const warning = describeLayoutIssue(issue, size);
    const key = `${issue.kind}:${issue.editPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push(warning);
  }
  return warnings;
}

// The warnings of the size on show in the preview.
export function useLayoutWarnings(): LayoutWarning[] {
  const issues = useStudio((state) => state.layoutIssues);
  const size = useStudio((state) => state.layoutSize);
  return size ? describeLayoutIssues(issues, size) : [];
}
