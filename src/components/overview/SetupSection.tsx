// What a new account sees on the Overview until every step is done: progress on the left, the
// guided steps or a free choice on the right. Before the first launch it stands alone; after it,
// the steps left sit above the rest of the Overview. Everything is derived from one array of
// steps (setupSteps.ts), and those come from the account's real data.
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lock } from "lucide-react";

import { useDashboard } from "../../dashboard/DashboardContext";
import { useShellActions } from "../../dashboard/DashboardShell";
import { useOnboarding } from "../../dashboard/onboarding/OnboardingContext";
import { PATHS } from "../../dashboard/paths";
import { ICON, SMALL_ICON, Segmented } from "./overviewParts";
import {
  gaugeSegmentPath,
  numberWord,
  type SetupStep,
  type SetupStepId,
  type SetupStyle,
} from "./setupSteps";
import "./setup-section.css";

const CREATE_REWARD = { createReward: true };
const TINY_ICON = { ...ICON, size: 12 } as const;

function Gauge({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((step) => step.status === "done").length;
  return (
    <div className="ss-gauge">
      <svg
        viewBox="0 0 240 140"
        role="img"
        aria-label={`${done} of ${steps.length} setup steps done`}
      >
        {steps.map((step, index) => (
          <path
            key={step.id}
            className="ss-arc"
            data-status={step.status}
            d={gaugeSegmentPath(index, steps.length)}
          />
        ))}
      </svg>
      <div aria-hidden className="ss-gauge-text">
        <p className="ss-gauge-count">
          {done}
          <span>/{steps.length}</span>
        </p>
        <p className="ov-caption">steps done</p>
      </div>
    </div>
  );
}

function NextUp({ steps }: { steps: SetupStep[] }) {
  const current = steps.find((step) => step.status === "current");
  return (
    <div className="ss-next">
      <span aria-hidden className="ov-tile ov-tile-24 k1">
        <ArrowRight {...SMALL_ICON} />
      </span>
      <div>
        <p className="ss-next-label">Next up</p>
        <p className="ss-next-step">
          {current ? (
            <>
              <strong>{current.title}</strong> · {current.minutes} min
            </>
          ) : (
            <strong>All done</strong>
          )}
        </p>
      </div>
    </div>
  );
}

function StepRow({
  step,
  number,
  onAction,
}: {
  step: SetupStep;
  number: number;
  onAction: (id: SetupStepId) => void;
}) {
  const { status } = step;
  return (
    <li
      className="ss-row"
      data-status={status}
      aria-current={status === "current" ? "step" : undefined}
    >
      <span aria-hidden className="ss-status" data-status={status}>
        {status === "done" && <Check {...SMALL_ICON} />}
        {status === "locked" && <Lock {...SMALL_ICON} />}
        {status === "current" && number}
      </span>
      <div className="ss-row-text">
        <h3 className="ss-row-title">{step.title}</h3>
        <p className="ov-sub">
          {step.description}{" "}
          <span className="ov-caption">· {step.minutes} min</span>
        </p>
      </div>
      <div className="ss-action">
        {status === "done" ? (
          <span className="ov-badge ov-badge-sm ov-ok">
            <Check {...TINY_ICON} />
            Done
          </span>
        ) : status === "current" ? (
          <button
            type="button"
            className="ov-btn ov-btn-primary"
            onClick={() => onAction(step.id)}
          >
            {step.action}
          </button>
        ) : (
          <button
            type="button"
            className="ov-btn"
            disabled
            aria-label={`${step.action} (locked)`}
          >
            {step.action}
          </button>
        )}
      </div>
    </li>
  );
}

/** Where a step leads: a page, or something that opens over this one. */
interface StepDestination {
  to?: string;
  state?: unknown;
  onOpen?: () => void;
}

function useStepDestinations(): Record<SetupStepId, StepDestination> {
  const { campaigns } = useDashboard();
  const { openSandbox } = useShellActions();
  const draft = campaigns.find((campaign) => campaign.status === "draft");
  const target = draft ?? campaigns[0];
  return {
    reward: { to: PATHS.prizesLocal, state: CREATE_REWARD },
    campaign: { to: PATHS.create },
    // Without a campaign, the Studio's own page says to create one first.
    design: { to: target ? PATHS.studioFor(target.id) : PATHS.studio },
    sandbox: { onOpen: openSandbox },
    live: { to: draft ? PATHS.edit(draft.id) : PATHS.campaigns },
  };
}

// One stop of the map. The whole node is the link: its pill only looks like a button.
function FlowNode({
  step,
  order,
  destination,
}: {
  step: SetupStep;
  order: number;
  destination: StepDestination;
}) {
  const { node } = step;
  const Icon = node.icon;
  const done = step.status === "done";
  const className = `fm-node ${node.accent}`;
  const label = `${step.title}. Suggested order ${order}${done ? ". Done" : ""}`;
  const content = (
    <>
      <span className="fm-circle">
        <Icon {...ICON} size={24} />
        <span aria-hidden className="fm-order">
          {order}
        </span>
        {done && (
          <span aria-hidden className="fm-done ov-badge ov-badge-sm ov-ok">
            <Check {...TINY_ICON} />
            Done
          </span>
        )}
      </span>
      <span className="fm-text">
        <strong className="fm-title">{step.title}</strong>
        <span className="ov-caption">{node.caption}</span>
      </span>
      <span className="ov-btn ov-btn-sm fm-pill">
        {node.action}
        <ArrowRight {...SMALL_ICON} />
      </span>
    </>
  );
  return destination.to ? (
    <Link
      to={destination.to}
      state={destination.state}
      className={className}
      aria-label={label}
    >
      {content}
    </Link>
  ) : (
    <a
      href={PATHS.home}
      className={className}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        destination.onOpen?.();
      }}
    >
      {content}
    </a>
  );
}

function FreeChoice({
  steps,
  destinations,
  title,
}: {
  steps: SetupStep[];
  destinations: Record<SetupStepId, StepDestination>;
  title: string;
}) {
  return (
    <>
      <div className="ss-head ss-head-own">
        <h3 className="ss-head-title">{title}</h3>
        <p className="ov-sub">
          Everything is open. Do things in any order, no guide.
        </p>
      </div>
      <div className="fm">
        <svg
          aria-hidden="true"
          className="fm-line"
          viewBox="0 0 400 24"
          preserveAspectRatio="none"
        >
          <path d="M0 12C30 -2 70 -2 100 12S170 26 200 12 270 -2 300 12 370 26 400 12" />
        </svg>
        {steps.map((step, index) => (
          <FlowNode
            key={step.id}
            step={step}
            order={index + 1}
            destination={destinations[step.id]}
          />
        ))}
      </div>
      <p className="ov-caption fm-note">
        Numbers show a suggested order. Start with any of them.
      </p>
    </>
  );
}

export function SetupSection({ steps }: { steps: SetupStep[] }) {
  const navigate = useNavigate();
  const destinations = useStepDestinations();
  const { replayTour, setupStyle, setSetupStyle } = useOnboarding();
  const launched = steps.some(
    (step) => step.id === "live" && step.status === "done",
  );
  const left = steps.filter((step) => step.status !== "done").length;

  const runStep = (id: SetupStepId) => {
    const { to, state, onOpen } = destinations[id];
    if (to) navigate(to, { state });
    else onOpen?.();
  };

  return (
    <div className="ss-root">
      <section className="ss" aria-labelledby="ss-title">
        <div className="ss-style">
          <p id="ss-style-label" className="ss-style-label">
            How do you want to {launched ? "continue" : "start"}?
          </p>
          <Segmented<SetupStyle>
            label="Setup style"
            value={setupStyle}
            options={[
              { key: "guide", label: "With a guide" },
              { key: "own", label: "On my own" },
            ]}
            onChange={setSetupStyle}
          />
        </div>
        <div className="ss-left">
          <svg
            aria-hidden="true"
            className="ss-deco"
            viewBox="0 0 160 160"
            width="160"
            height="160"
          >
            <circle cx="160" cy="0" r="60" />
            <circle cx="160" cy="0" r="100" opacity="0.7" />
            <circle cx="160" cy="0" r="140" opacity="0.4" />
          </svg>
          <div>
            <p className="ov-eyebrow">Setup</p>
            <h2 id="ss-title" className="ss-title">
              {launched ? "Finish your setup" : "Launch your first campaign"}
            </h2>
          </div>
          <Gauge steps={steps} />
          <NextUp steps={steps} />
          <button
            type="button"
            className="ov-link ss-tour"
            onClick={replayTour}
          >
            <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
            </svg>
            Take a 1-minute tour
          </button>
        </div>

        <div className="ss-right">
          {setupStyle === "guide" ? (
            <>
              <div className="ss-head">
                <h3 className="ss-head-title">Follow the guide</h3>
                <p className="ov-sub">
                  {launched
                    ? `${numberWord(left)} ${left === 1 ? "step" : "steps"} left. Your campaign is already live.`
                    : `${numberWord(steps.length)} steps in order. Each one unlocks the next.`}
                </p>
              </div>
              <ol className="ss-steps">
                {steps.map((step, index) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    number={index + 1}
                    onAction={runStep}
                  />
                ))}
              </ol>
            </>
          ) : (
            <FreeChoice
              steps={steps}
              destinations={destinations}
              title={launched ? "Pick up anywhere" : "Start anywhere"}
            />
          )}
          <div className="ss-foot">
            <p className="ov-caption">
              You can switch between both at any time.
            </p>
            <p className="ov-caption">
              Working with a team?{" "}
              <Link to={PATHS.accountTeam} className="ss-invite">
                Invite teammates
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
