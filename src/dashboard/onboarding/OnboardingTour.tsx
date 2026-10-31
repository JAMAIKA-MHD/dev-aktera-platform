// The product tour: a welcome, then a dimmed page with a rounded opening around each element and
// a card beside it. The positions are read on every frame while the tour runs, so anything that
// moves the targets (the menu opening, a rotation, a resize, a page that finishes loading) is
// followed without listening to each cause. Loaded on demand (see DashboardShell).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { trackProductEvent } from "../../lib/productAnalytics";
import "../../components/overview/overview.css";
import type { DashboardMenu } from "../DashboardSidebar";
import { PATHS } from "../paths";
import { useOnboarding, type TourRun } from "./OnboardingContext";
import "./onboarding.css";
import {
  LAST_STEP,
  TOUR_STEPS,
  WELCOME_STEP,
  placeCard,
  tourStepAt,
  type Box,
  type CardPlacement,
} from "./tourSteps";

// How long a step waits for its element (a page still loading) before it is passed over.
const TARGET_WAIT_MS = 1500;
const HOLE_PADDING = 6;
const FALLBACK_CARD = { width: 360, height: 240 };

function findTarget(name: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour="${name}"]`,
  );
  // The rail and the drawer hold the same entries: only one of them is on screen.
  return (
    [...candidates].find((element) => element.getClientRects().length > 0) ??
    null
  );
}

const toBox = (element: HTMLElement): Box => {
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
};

const sameBoxes = (a: Box[], b: Box[]) =>
  a.length === b.length &&
  a.every(
    (box, index) =>
      Math.abs(box.top - b[index].top) < 0.5 &&
      Math.abs(box.left - b[index].left) < 0.5 &&
      Math.abs(box.width - b[index].width) < 0.5 &&
      Math.abs(box.height - b[index].height) < 0.5,
  );

/** The boxes of a step's elements, kept current. Calls `onMissing` if none ever appears. */
function useTargetBoxes(targets: string[], onMissing: () => void): Box[] {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const missing = useRef(onMissing);
  missing.current = onMissing;
  const key = targets.join(" ");

  useEffect(() => {
    if (key === "") {
      setBoxes([]);
      return;
    }
    const names = key.split(" ");
    const startedAt = performance.now();
    let scrolled = false;
    let frame = 0;
    const measure = () => {
      const elements = names
        .map(findTarget)
        .filter((element) => element !== null);
      if (elements.length === 0) {
        setBoxes((current) => (current.length === 0 ? current : []));
        if (performance.now() - startedAt > TARGET_WAIT_MS) {
          missing.current();
          return;
        }
      } else {
        if (!scrolled) {
          scrolled = true;
          elements[0].scrollIntoView?.({ block: "nearest" });
        }
        const next = elements.map(toBox);
        setBoxes((current) => (sameBoxes(current, next) ? current : next));
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [key]);

  return boxes;
}

function useViewport() {
  const read = () => ({
    width: document.documentElement.clientWidth,
    height: window.innerHeight,
  });
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const onResize = () => setViewport(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}

function useCardSize(ref: RefObject<HTMLElement | null>, step: number) {
  const [size, setSize] = useState(FALLBACK_CARD);
  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const measure = () => {
      const width = card.offsetWidth || FALLBACK_CARD.width;
      const height = card.offsetHeight || FALLBACK_CARD.height;
      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [ref, step]);
  return size;
}

export default function OnboardingTour({
  run,
  menu,
}: {
  run: TourRun;
  menu: DashboardMenu;
}) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { saveTourStep, endTour } = useOnboarding();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const directionRef = useRef<1 | -1>(1);

  const [step, setStep] = useState(Math.min(run.startStep, LAST_STEP));
  const [passed, setPassed] = useState<ReadonlySet<number>>(new Set());
  const [nudge, setNudge] = useState(0);

  const current = tourStepAt(step);
  const viewport = useViewport();
  const cardSize = useCardSize(cardRef, step);

  const shownSteps = TOUR_STEPS.length - passed.size;
  const stepNumber =
    step - [...passed].filter((skipped) => skipped < step).length;

  const skip = useCallback(() => {
    trackProductEvent("tour_skipped", { step });
    endTour("skipped", step);
  }, [endTour, step]);

  const finish = useCallback(() => {
    trackProductEvent("tour_completed", { replay: run.replay });
    endTour("completed", LAST_STEP);
  }, [endTour, run.replay]);

  const move = useCallback(
    (direction: 1 | -1, ignored: ReadonlySet<number> = passed) => {
      directionRef.current = direction;
      let target = step + direction;
      while (ignored.has(target)) target += direction;
      if (target > LAST_STEP) finish();
      else setStep(Math.max(target, WELCOME_STEP));
    },
    [step, passed, finish],
  );

  // An element that is not there (a screen this role cannot see) is passed over.
  const passStep = useCallback(() => {
    const next = new Set(passed).add(step);
    setPassed(next);
    move(directionRef.current, next);
  }, [passed, step, move]);

  const boxes = useTargetBoxes(current?.targets ?? [], passStep);

  // The rail shows its labels, a phone's drawer opens for sidebar steps and closes after them.
  const inSidebar = Boolean(current?.inSidebar);
  const { setHeld, setDrawerOpen, isDrawer } = menu;
  useEffect(() => {
    setHeld(true);
    return () => {
      setHeld(false);
      setDrawerOpen(false);
    };
  }, [setHeld, setDrawerOpen]);
  useEffect(() => {
    if (isDrawer) setDrawerOpen(inSidebar);
    setHeld(inSidebar || isDrawer);
  }, [inSidebar, isDrawer, setDrawerOpen, setHeld]);

  useEffect(() => {
    if (step === WELCOME_STEP) {
      trackProductEvent("tour_started", { replay: run.replay });
    } else {
      trackProductEvent("tour_step_viewed", { step, id: current?.id ?? "" });
      saveTourStep(step);
    }
    primaryRef.current?.focus();
    // Once per step shown: only `step` is a dependency.
  }, [step]);

  useFocusTrap(cardRef, true);

  useEffect(() => {
    // Capture: Escape belongs to the tour, not to what lies under it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        skip();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (step > WELCOME_STEP + 1) move(-1);
      } else if (event.key === "Enter") {
        const onControl = (event.target as HTMLElement | null)?.closest(
          "button, a",
        );
        if (!onControl) move(1);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [move, skip, step]);

  const placement = useMemo<CardPlacement | null>(
    () =>
      boxes[0] && current
        ? placeCard(boxes[0], cardSize, viewport, current.side)
        : null,
    [boxes, cardSize, viewport, current],
  );

  const transition = {
    duration: reduceMotion ? 0 : 0.25,
    ease: "easeOut",
  } as const;

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const welcomeTitle = firstName
    ? `${t("onboarding.welcomeTitle", "Welcome to Aktera")}, ${firstName}`
    : t("onboarding.welcomeTitle", "Welcome to Aktera");
  const isWelcome = step === WELCOME_STEP;
  const isLast = step === LAST_STEP;
  const title = current ? t(current.titleKey, current.title) : welcomeTitle;
  const body = current
    ? t(current.bodyKey, current.body)
    : t(
        "onboarding.welcomeBody",
        "Let's take a 60-second tour so you can launch your first campaign today.",
      );
  const stepLabel = `${stepNumber} ${t("onboarding.of", "of")} ${shownSteps}`;
  const centered = !placement;

  return createPortal(
    <div className="ot-root dz-theme-auto">
      <svg
        className="ot-scrim"
        aria-hidden
        onClick={() => setNudge((count) => count + 1)}
      >
        <defs>
          <mask id="ot-holes">
            <rect width="100%" height="100%" fill="white" />
            {boxes.map((box, index) => (
              <motion.rect
                key={index}
                initial={false}
                animate={{
                  x: box.left - HOLE_PADDING,
                  y: box.top - HOLE_PADDING,
                  width: box.width + HOLE_PADDING * 2,
                  height: box.height + HOLE_PADDING * 2,
                }}
                transition={transition}
                rx={12}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="currentColor"
          mask="url(#ot-holes)"
        />
      </svg>
      {boxes.map((box, index) => (
        <motion.div
          key={index}
          aria-hidden
          className="ot-ring"
          initial={false}
          animate={{
            top: box.top - HOLE_PADDING,
            left: box.left - HOLE_PADDING,
            width: box.width + HOLE_PADDING * 2,
            height: box.height + HOLE_PADDING * 2,
          }}
          transition={transition}
        />
      ))}

      <p className="sr-only" aria-live="polite">
        {isWelcome ? title : `${stepLabel}: ${title}`}
      </p>

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ot-title"
        aria-describedby="ot-body"
        className="ot-card"
        data-centered={centered || undefined}
        data-side={placement?.side ?? undefined}
        style={
          {
            "--ot-arrow": `${placement?.arrow ?? 0}px`,
            ...(centered
              ? { top: "50%", left: "50%", x: "-50%", y: "-50%" }
              : {}),
          } as CSSProperties
        }
        initial={false}
        animate={
          placement ? { top: placement.top, left: placement.left } : undefined
        }
        transition={transition}
      >
        <div
          key={nudge}
          className="ot-card-inner"
          data-nudge={nudge > 0 || undefined}
        >
          {!isWelcome && <span aria-hidden className="ot-arrow" />}
          <div className="ot-head">
            {isWelcome ? (
              <span />
            ) : (
              <span className="ov-eyebrow dz-num">{stepLabel}</span>
            )}
            <button
              type="button"
              className="dz-icon-btn ov-icon-btn-sm"
              aria-label={t("onboarding.close", "Close the tour")}
              title={t("onboarding.close", "Close the tour")}
              onClick={skip}
            >
              <X size={14} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <h2 id="ot-title" className="ot-title" dir="auto">
            {title}
          </h2>
          <p id="ot-body" className="ot-body">
            {body}
          </p>

          {!isWelcome && (
            <div
              className="ot-progress"
              aria-hidden
              style={
                {
                  "--ot-done": `${(stepNumber / shownSteps) * 100}%`,
                } as CSSProperties
              }
            />
          )}

          <div className="ot-actions">
            {isWelcome ? (
              <>
                <button type="button" className="ov-btn" onClick={skip}>
                  {t("onboarding.skipForNow", "Skip for now")}
                </button>
                <button
                  ref={primaryRef}
                  type="button"
                  data-autofocus
                  className="ov-btn ov-btn-primary"
                  onClick={() => move(1)}
                >
                  {t("onboarding.start", "Start tour")}
                </button>
              </>
            ) : (
              <>
                {!isLast && (
                  <button
                    type="button"
                    className="ov-link ot-skip"
                    onClick={skip}
                  >
                    {t("onboarding.skip", "Skip tour")}
                  </button>
                )}
                <span className="ov-spacer" />
                {stepNumber > 1 && (
                  <button
                    type="button"
                    className="ov-btn"
                    onClick={() => move(-1)}
                  >
                    {t("onboarding.back", "Back")}
                  </button>
                )}
                {isLast ? (
                  <>
                    <button type="button" className="ov-btn" onClick={finish}>
                      {t("onboarding.finish", "Finish")}
                    </button>
                    <button
                      ref={primaryRef}
                      type="button"
                      data-autofocus
                      className="ov-btn ov-btn-primary"
                      onClick={() => {
                        finish();
                        navigate(PATHS.create);
                      }}
                    >
                      {t("onboarding.createFirst", "Create my first campaign")}
                    </button>
                  </>
                ) : (
                  <button
                    ref={primaryRef}
                    type="button"
                    data-autofocus
                    className="ov-btn ov-btn-primary"
                    onClick={() => move(1)}
                  >
                    {t("onboarding.next", "Next")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
