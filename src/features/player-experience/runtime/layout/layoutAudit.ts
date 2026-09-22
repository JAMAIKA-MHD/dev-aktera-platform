import { computeLayoutMode, type LayoutMode } from "./layoutMode";

// The single definition of a broken layout (plan §9.3 and §13.1). The frame runs it live
// for the Studio (xp:layout-report, window.__xpLayoutAudit) and the responsive sweep
// (scripts/xp-responsive-check.mjs) calls the very same function in Chrome: what the
// Studio flags and what the sweep flags can never differ.

export type LayoutIssueKind =
  | "horizontal-overflow"
  | "text-clipped"
  | "slot-overlap"
  | "cta-too-small"
  | "cta-unreachable"
  | "game-below-floor"
  | "wheel-not-square";

export interface LayoutIssue {
  kind: LayoutIssueKind;
  selector: string; // where, for a developer
  editPath: string | null; // nearest data-xp-edit: the Studio field to open
  detail: string;
}

export interface LayoutReport {
  width: number;
  height: number;
  mode: LayoutMode;
  issues: LayoutIssue[];
}

const TOLERANCE = 0.5; // sub-pixel rounding is not a defect
const TOUCH_MIN = 44; // RWD5

interface Span {
  left: number;
  right: number;
}

function describe(element: Element): string {
  if (element === element.ownerDocument.documentElement) return "html";
  const own = element.getAttribute("data-xp-slot");
  if (own) return `[data-xp-slot="${own}"]`;
  const tag = element.tagName.toLowerCase();
  const className = element.getAttribute("class") ?? "";
  const marker = className.split(/\s+/).find((name) => name.startsWith("xp-"));
  const base = marker ? `${tag}.${marker}` : tag;
  const slot = element.closest("[data-xp-slot]")?.getAttribute("data-xp-slot");
  return slot ? `[data-xp-slot="${slot}"] ${base}` : base;
}

// A length of a CSS custom property, in pixels ("12.5rem", "200px"); NaN when unknown.
function toPixels(value: string, view: Window): number {
  const number = parseFloat(value);
  if (value.trim().endsWith("rem")) {
    const rootSize = parseFloat(
      view.getComputedStyle(view.document.documentElement).fontSize,
    );
    return number * (Number.isFinite(rootSize) ? rootSize : 16);
  }
  return value.trim().endsWith("px") ? number : NaN;
}

export function layoutAudit(root: HTMLElement): LayoutIssue[] {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) return [];
  const viewportWidth = view.innerWidth;
  const viewportHeight = view.innerHeight;
  const issues: LayoutIssue[] = [];
  const add = (kind: LayoutIssueKind, element: Element, detail: string) =>
    issues.push({
      kind,
      selector: describe(element),
      editPath:
        element.closest("[data-xp-edit]")?.getAttribute("data-xp-edit") ?? null,
      detail,
    });

  // 1. The page scrolls sideways.
  const pageWidth = doc.documentElement.scrollWidth;
  if (pageWidth > viewportWidth + TOLERANCE) {
    add(
      "horizontal-overflow",
      doc.documentElement,
      `the page is ${pageWidth} px wide for a ${viewportWidth} px viewport`,
    );
  }

  // What the player sees of an element: its box, cut by the ancestors that clip their
  // overflow. The root itself clips (overflow-x: clip) and hides exactly what we look for,
  // so it never counts.
  const clips = new Map<Element, Span | null>();
  const clipOf = (element: Element | null): Span | null => {
    if (!element || element === root) return null;
    if (clips.has(element)) return clips.get(element) ?? null;
    const parent = clipOf(element.parentElement);
    let span = parent;
    if (view.getComputedStyle(element).overflowX !== "visible") {
      const box = element.getBoundingClientRect();
      span = parent
        ? {
            left: Math.max(parent.left, box.left),
            right: Math.min(parent.right, box.right),
          }
        : { left: box.left, right: box.right };
    }
    clips.set(element, span);
    return span;
  };

  for (const element of root.querySelectorAll("*")) {
    const box = element.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue; // not rendered, or inline and empty

    // 2. An element leaves the viewport sideways.
    const clip = clipOf(element.parentElement);
    const left = clip ? Math.max(box.left, clip.left) : box.left;
    const right = clip ? Math.min(box.right, clip.right) : box.right;
    if (
      right - left > TOLERANCE &&
      (right > viewportWidth + TOLERANCE || left < -TOLERANCE)
    ) {
      add(
        "horizontal-overflow",
        element,
        `spans ${Math.round(left)} to ${Math.round(right)} px in a ${viewportWidth} px viewport`,
      );
    }

    // 3. A text is cut, outside the cuts the layout intends (data-xp-clamp).
    if (!(element instanceof view.HTMLElement)) continue;
    const ownText = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && (node as Text).data.trim(),
    );
    if (!ownText || element.closest("[data-xp-clamp]")) continue;
    if (element.clientWidth === 0 && element.clientHeight === 0) continue; // inline box
    if (
      element.scrollWidth > element.clientWidth + 1 ||
      element.scrollHeight > element.clientHeight + 1
    ) {
      add(
        "text-clipped",
        element,
        `"${String(element.textContent).trim().slice(0, 40)}" needs ${element.scrollWidth} x ${element.scrollHeight} px, has ${element.clientWidth} x ${element.clientHeight}`,
      );
    }
  }

  const frame = root.querySelector(".xp-frame");
  if (frame) {
    // 4. Two slots overlap. A CTA held at the bottom floats over the content on purpose.
    const slots = [...frame.children].filter(
      (child) =>
        child.hasAttribute("data-xp-slot") &&
        !child.hasAttribute("data-xp-stuck"),
    );
    const boxes = slots.map((slot) => slot.getBoundingClientRect());
    for (let first = 0; first < slots.length; first++) {
      for (let second = first + 1; second < slots.length; second++) {
        const a = boxes[first];
        const b = boxes[second];
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > TOLERANCE && height > TOLERANCE) {
          add(
            "slot-overlap",
            slots[first],
            `${slots[first].getAttribute("data-xp-slot")} and ${slots[second].getAttribute("data-xp-slot")} overlap by ${Math.round(width)} x ${Math.round(height)} px`,
          );
        }
      }
    }

    // 5. The main action is too small, or out of reach (neither visible nor sticky).
    const ctaSlot = frame.querySelector('[data-xp-slot="cta"]');
    const primary = ctaSlot?.querySelector("button");
    if (ctaSlot && primary) {
      const box = primary.getBoundingClientRect();
      if (
        box.width < TOUCH_MIN - TOLERANCE ||
        box.height < TOUCH_MIN - TOLERANCE
      ) {
        add(
          "cta-too-small",
          primary,
          `${Math.round(box.width)} x ${Math.round(box.height)} px, under ${TOUCH_MIN} x ${TOUCH_MIN}`,
        );
      }
      const visible =
        box.top >= -TOLERANCE && box.bottom <= viewportHeight + TOLERANCE;
      const sticky = view.getComputedStyle(ctaSlot).position === "sticky";
      if (!visible && !sticky) {
        add(
          "cta-unreachable",
          primary,
          `at ${Math.round(box.top)} to ${Math.round(box.bottom)} px of a ${viewportHeight} px viewport, and not sticky`,
        );
      }
    }

    // 6. The game zone is lower than its floor.
    const zone = frame.querySelector('[data-xp-slot="interaction"]');
    if (zone) {
      const floor = toPixels(
        view.getComputedStyle(zone).getPropertyValue("--xp-game-min"),
        view,
      );
      const height = zone.getBoundingClientRect().height;
      if (Number.isFinite(floor) && height < floor - TOLERANCE) {
        add(
          "game-below-floor",
          zone,
          `${Math.round(height)} px high, under the ${Math.round(floor)} px floor`,
        );
      }
    }
  }

  // 7. A wheel is not square (engines mark it with data-xp-wheel).
  for (const wheel of root.querySelectorAll("[data-xp-wheel]")) {
    const box = wheel.getBoundingClientRect();
    if (Math.abs(box.width - box.height) > 1) {
      add(
        "wheel-not-square",
        wheel,
        `${Math.round(box.width)} x ${Math.round(box.height)} px`,
      );
    }
  }

  return issues;
}

// The report the frame sends to the Studio, after each render and each resize.
export function layoutReport(root: HTMLElement): LayoutReport {
  const view = root.ownerDocument.defaultView;
  const width = view?.innerWidth ?? 0;
  const height = view?.innerHeight ?? 0;
  return {
    width,
    height,
    mode: computeLayoutMode(width, height),
    issues: layoutAudit(root),
  };
}
