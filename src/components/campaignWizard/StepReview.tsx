// Step 5: everything the campaign will do, with a way back to each step, what is still
// missing before it can be saved, and the player sandbox to test it before publishing.
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Palette,
  Pencil,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import type { PrizeTemplate } from "../../types";
import { cn } from "../../lib/utils";
import { CxButton, CxNotice, cxFocus, cxText } from "../campaigns/campaignUi";
import { GameEmblem } from "../campaigns/GameEmblem";
import { hintClass, rowClass, StepPanel } from "./wizardFields";
import {
  consolationOn,
  drawHandledByBrand,
  engagementLabel,
  engagementSettings,
  formatDateTime,
  gameTypeOf,
  isDraw,
  maxEntriesLabel,
  revealLabel,
  rewardModeLabel,
  savedPrizeLines,
  totalPrizeWeight,
  type FieldErrors,
  type StepId,
  type WizardForm,
} from "./wizardForm";

export interface ReviewIssue {
  step: StepId;
  field: string;
  message: string;
}

export const listIssues = (
  errors: Partial<Record<StepId, FieldErrors>>,
): ReviewIssue[] =>
  (Object.entries(errors) as [string, FieldErrors][]).flatMap(([step, found]) =>
    Object.entries(found).map(([field, message]) => ({
      step: Number(step) as StepId,
      field,
      message,
    })),
  );

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: StepId;
  onEdit: (step: StepId) => void;
  children: ReactNode;
}) {
  return (
    <section className={rowClass}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-bold text-cx-ink">{title}</h4>
        <CxButton
          variant="ghost"
          size="sm"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          <Pencil aria-hidden />
          Edit
        </CxButton>
      </header>
      <dl className="grid grid-cols-1 gap-2">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn(cxText.caption, "shrink-0")}>{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold tabular-nums text-cx-ink">
        {children}
      </dd>
    </div>
  );
}

export function StepReview({
  form,
  issues,
  templates,
  onEdit,
  onOpenSandbox,
  onOpenPlayerStudio,
}: {
  form: WizardForm;
  issues: ReviewIssue[];
  templates: PrizeTemplate[];
  onEdit: (step: StepId) => void;
  onOpenSandbox: () => void;
  onOpenPlayerStudio?: () => void;
}) {
  const { w } = form;
  const draw = isDraw(form);
  const lines = savedPrizeLines(form);
  const totalWeight = totalPrizeWeight(lines);
  const nameOf = (templateId: string) =>
    templates.find((item) => item.id === templateId)?.name ?? "Unknown reward";

  return (
    <div className="grid grid-cols-1 gap-6">
      <StepPanel
        title="Review your campaign"
        description="Check each part. Use Edit to go back to a step — nothing is lost."
      >
        {issues.length > 0 ? (
          <CxNotice tone="danger" icon={AlertCircle} role="alert">
            <p>
              {issues.length === 1
                ? "1 thing to fix before saving"
                : `${issues.length} things to fix before saving`}
            </p>
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5">
              {issues.map((issue) => (
                <li
                  key={`${issue.step}-${issue.field}`}
                  className="flex items-center justify-between gap-3 font-medium text-cx-ink"
                >
                  <span>{issue.message}</span>
                  <button
                    type="button"
                    onClick={() => onEdit(issue.step)}
                    className={cn(
                      cxFocus,
                      "shrink-0 cursor-pointer rounded-cx-sm font-semibold text-cx-brand-text hover:underline",
                    )}
                  >
                    Fix it
                  </button>
                </li>
              ))}
            </ul>
          </CxNotice>
        ) : (
          <CxNotice tone="success" icon={CheckCircle2}>
            Everything is filled in. This campaign is ready.
          </CxNotice>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Section title="Foundation" step={1} onEdit={onEdit}>
            <div className="mb-1 flex items-center gap-3">
              {form.heroImageUrl ? (
                <img
                  src={form.heroImageUrl}
                  alt=""
                  className="size-11 shrink-0 rounded-cx-md object-cover"
                />
              ) : (
                <GameEmblem gameType={gameTypeOf(form)} size={44} />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-cx-ink">
                  {form.name || "Untitled campaign"}
                </p>
                <p className={hintClass}>{form.brandName || "No brand yet"}</p>
              </div>
            </div>
            {form.description.trim() && (
              <Row label="Description">
                <span dir="auto" className="[overflow-wrap:anywhere]">
                  {form.description.trim()}
                </span>
              </Row>
            )}
            <Row label="Player link">
              <span className="font-mono text-[13px] font-normal">
                /play/{form.slug}
              </span>
            </Row>
            <Row label="Starts">{formatDateTime(form.startDate)}</Row>
            <Row label="Ends">{formatDateTime(form.endDate)}</Row>
            <Row label="Per phone number">
              {maxEntriesLabel(form.maxEntries)}
            </Row>
          </Section>

          <Section title="Engagement" step={2} onEdit={onEdit}>
            <Row label="Type">{engagementLabel(form)}</Row>
            <Row label="Settings">{engagementSettings(form)}</Row>
          </Section>

          <Section title="Reward" step={3} onEdit={onEdit}>
            {draw ? (
              <>
                <Row label="Method">Draw</Row>
                <Row label="Draw on">{formatDateTime(w.draw.at)}</Row>
                <Row label="Winners">{w.draw.winners}</Row>
                <Row label="Rules">
                  {w.draw.rules.trim() ? "Written" : "Missing"}
                </Row>
              </>
            ) : (
              <>
                <Row label="Method">Instant win</Row>
                <Row label="Mode">{rewardModeLabel(form)}</Row>
                <Row label="Reveal">{revealLabel(form)}</Row>
                {w.mode === "probabilistic" && (
                  <Row label="Consolation">{w.consolation ? "On" : "Off"}</Row>
                )}
              </>
            )}
          </Section>

          <Section title="Prizes" step={4} onEdit={onEdit}>
            {drawHandledByBrand(form) ? (
              <p className={hintClass}>Handled by you, outside Aktera.</p>
            ) : lines.length === 0 ? (
              <p className={hintClass}>No prize added yet.</p>
            ) : (
              lines.map((line, index) => (
                <Row key={index} label={nameOf(line.templateId)}>
                  {line.quantity} to win
                  {!draw &&
                    totalWeight > 0 &&
                    ` · ${Math.round((Number(line.weight || 0) / totalWeight) * 100)}% of wins`}
                </Row>
              ))
            )}
            {consolationOn(form) && (
              <div className="border-t border-cx-border pt-2">
                <Row label="Consolation">
                  {w.consolationPrizes.length}{" "}
                  {w.consolationPrizes.length === 1 ? "reward" : "rewards"}
                </Row>
              </div>
            )}
          </Section>
        </div>
      </StepPanel>

      <StepPanel
        title="Try it before you publish"
        description="Play the campaign as configured now, as a player would. Nothing is saved and no real prize is given."
        actions={
          <CxButton onClick={onOpenSandbox}>
            <Smartphone aria-hidden />
            Open player sandbox
          </CxButton>
        }
      >
        <p className={cn(hintClass, "flex items-start gap-2")}>
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-cx-success"
            aria-hidden
          />
          Built-in privacy safeguards for Algeria's Loi 18-07 apply to every
          campaign, and phone numbers are validated before a coupon is issued.
        </p>
      </StepPanel>

      {onOpenPlayerStudio && (
        <StepPanel
          title="Design what players see"
          description="The welcome, form, game and result screens are styled in the Player Studio. Save this campaign first: unsaved changes here are not carried over."
          actions={
            <CxButton onClick={onOpenPlayerStudio}>
              <Palette aria-hidden />
              Open Player Studio
            </CxButton>
          }
        >
          {null}
        </StepPanel>
      )}
    </div>
  );
}
