// Step 4: everything the campaign will do, with a way back to each step, and what is
// still missing before it can go live.
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Palette,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import type { PrizeTemplate } from "../../types";
import { cn } from "../../lib/utils";
import { formatPeriod } from "../playerStudio/studioCampaignCells";
import { campaignDurationDays, gameMeta } from "../campaigns/campaignMeta";
import { CxButton, CxNotice, cxFocus, cxText } from "../campaigns/campaignUi";
import { GameEmblem } from "../campaigns/GameEmblem";
import { hintClass, rowClass, StepPanel } from "./wizardFields";
import {
  allocatedPrizeLines,
  maxEntriesLabel,
  totalPrizeQuantity,
  totalPrizeWeight,
  type StepId,
  type WizardForm,
  type WizardIssue,
} from "./wizardForm";

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
  onOpenPlayerStudio,
}: {
  form: WizardForm;
  issues: WizardIssue[];
  templates: PrizeTemplate[];
  onEdit: (step: StepId) => void;
  onOpenPlayerStudio?: () => void;
}) {
  const game = gameMeta(form.type);
  const days = campaignDurationDays(form.startDate, form.endDate);
  const lines = allocatedPrizeLines(form);
  const totalWeight = totalPrizeWeight(lines);

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
                  key={issue.field}
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
          <Section title="Basics" step={1} onEdit={onEdit}>
            <div className="mb-1 flex items-center gap-3">
              <GameEmblem gameType={form.type} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-cx-ink">
                  {form.name || "Untitled campaign"}
                </p>
                <p className={hintClass}>{game.label}</p>
              </div>
            </div>
            <Row label="Player link">
              <span className="font-mono text-[13px] font-normal">
                /play/{form.slug || "…"}
              </span>
            </Row>
            <Row label="Runs">
              {formatPeriod(form.startDate, form.endDate)}
              {days !== null && ` · ${days} ${days === 1 ? "day" : "days"}`}
            </Row>
            <Row label="Arabic tagline">
              <span dir="auto">{form.arabicName || "—"}</span>
            </Row>
            <Row label="Cover image">
              {form.heroImageUrl ? "Added" : "None"}
            </Row>
          </Section>

          <Section title="Game rules" step={2} onEdit={onEdit}>
            <Row label="Win chance">
              {form.autoPacePrizes
                ? "Automatic, spread over the campaign"
                : `${form.winProbability}%`}
            </Row>
            <Row label="Per phone number">
              {maxEntriesLabel(form.maxEntries, form.type)}
            </Row>
            {form.type === "hit_it" && (
              <Row label="To win">
                {form.gameLogicConfig.win_threshold ?? 8} hits in 10 seconds
              </Row>
            )}
            {form.type === "quiz" && (
              <>
                <Row label="Passing score">
                  {form.gameLogicConfig.pass_threshold_percentage ?? 50}%
                </Row>
                <Row label="Questions">{form.questions.length}</Row>
              </>
            )}
          </Section>

          <div className="md:col-span-2">
            <Section title="Prizes" step={3} onEdit={onEdit}>
              {lines.length === 0 ? (
                <p className={hintClass}>No prize added yet.</p>
              ) : (
                <>
                  {lines.map((line, index) => {
                    const template = templates.find(
                      (item) => item.id === line.templateId,
                    );
                    const share =
                      totalWeight > 0
                        ? Math.round(
                            (Number(line.weight || 0) / totalWeight) * 100,
                          )
                        : 0;
                    return (
                      <Row
                        key={index}
                        label={template?.name ?? "Unknown reward"}
                      >
                        {line.quantity} to win · {share}% of wins
                      </Row>
                    );
                  })}
                  <div className="border-t border-cx-border pt-2">
                    <Row label="Total">{totalPrizeQuantity(lines)} prizes</Row>
                  </div>
                </>
              )}
            </Section>
          </div>
        </div>
      </StepPanel>

      <StepPanel
        title="Design what players see"
        description="The welcome, form, game and result screens are styled in the Player Studio. Save this campaign first: unsaved changes here are not carried over."
        actions={
          onOpenPlayerStudio && (
            <CxButton onClick={onOpenPlayerStudio}>
              <Palette aria-hidden />
              Open Player Studio
            </CxButton>
          )
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
    </div>
  );
}
