// The campaign editor: a medium-size window with the four parts of a campaign (basics,
// game rules, prizes, review) listed on the left, to create, edit or relaunch a campaign.
// Each part lives in ./campaignWizard; this file holds the form, the navigation between
// parts and the save.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
  Save,
  X,
} from "lucide-react";

import { Campaign, PrizeTemplate } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";
import {
  CampaignStatusBadge,
  ConfirmDialog,
  CxButton,
  CxNotice,
  cxFocus,
  cxRoot,
  cxText,
} from "./campaigns/campaignUi";
import { StepBasics } from "./campaignWizard/StepBasics";
import { StepGameRules } from "./campaignWizard/StepGameRules";
import { StepPrizes } from "./campaignWizard/StepPrizes";
import { StepReview } from "./campaignWizard/StepReview";
import {
  allocatedPrizeLines,
  initialWizardForm,
  validateWizard,
  WIZARD_STEPS,
  type StepId,
  type WizardForm,
} from "./campaignWizard/wizardForm";

interface CampaignWizardProps {
  prizes: PrizeTemplate[];
  onSave: (
    newCampaign: Omit<Campaign, "participantsCount" | "rewardsClaimed"> & {
      mode?: "create" | "edit" | "relaunch" | "update";
      submitStatus?: "draft" | "active";
      playerScreenConfig?: any;
    },
  ) => Promise<void> | void;
  onCancel: () => void;
  onOpenPlayerScreenEditor?: (campaignData: any) => void;
  relaunchDraft?: Campaign | null;
  editingCampaign?: Campaign | null;
  // Opens on a given step (1 to 4): Basics (1), Game rules and quiz questions (2),
  // Prizes (3) or Review (4).
  initialStep?: 1 | 2 | 3 | 4;
}

type SubmitStatus = "draft" | "active";
type LeaveTarget = "cancel" | "studio";
type StepState = "error" | "done" | "current" | "pending";

const DOT_TONE: Record<StepState, string> = {
  error: "border-cx-danger bg-cx-danger text-cx-surface",
  done: "border-cx-success bg-cx-success text-cx-on-success",
  current: "border-cx-brand bg-cx-surface text-cx-brand-text",
  pending: "border-cx-control bg-cx-surface text-cx-ink-muted",
};

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  prizes,
  onSave,
  onCancel,
  onOpenPlayerScreenEditor,
  relaunchDraft,
  editingCampaign,
  initialStep = 1,
}) => {
  const { t } = useLanguage();
  const baseCampaign = editingCampaign ?? relaunchDraft ?? null;
  const isEditMode = Boolean(editingCampaign);
  const isLiveCampaign =
    isEditMode &&
    (editingCampaign?.status === "active" ||
      editingCampaign?.status === "paused");
  const isRelaunchMode = Boolean(relaunchDraft) && !editingCampaign;

  // The form as it was opened, to tell whether leaving would lose anything.
  const [initialForm, setInitialForm] = useState(() =>
    initialWizardForm(editingCampaign, relaunchDraft, prizes),
  );
  const [form, setForm] = useState<WizardForm>(initialForm);
  const update = (patch: Partial<WizardForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const [step, setStep] = useState<StepId>(initialStep);
  // Steps whose errors are shown: a field only complains once the user tried to move on.
  const [checkedSteps, setCheckedSteps] = useState<Set<StepId>>(new Set());
  // Steps the user has been through. A new campaign's step only turns green once it has
  // been seen: its default values are valid, but nobody has looked at them yet.
  const [seenSteps, setSeenSteps] = useState<Set<StepId>>(new Set());
  // In a new campaign the link follows the name until the link is typed by hand.
  const [slugFollowsName, setSlugFollowsName] = useState(!baseCampaign);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmLiveSave, setConfirmLiveSave] = useState<SubmitStatus | null>(
    null,
  );
  const [confirmLeave, setConfirmLeave] = useState<LeaveTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // When the rewards load after the wizard opens, fill the empty prize rows.
  useEffect(() => {
    if (prizes.length > 0 && !baseCampaign) {
      const fillEmptyRows = (current: WizardForm) => ({
        ...current,
        prizes: current.prizes.map((line) =>
          line.templateId === "" ? { ...line, templateId: prizes[0].id } : line,
        ),
      });
      setForm(fillEmptyRows);
      setInitialForm(fillEmptyRows);
    }
  }, [prizes, baseCampaign]);

  const issues = useMemo(() => validateWizard(form), [form]);
  const issuesOf = (id: StepId) => issues.filter((issue) => issue.step === id);
  const errorFor = (field: string) =>
    checkedSteps.has(step)
      ? issues.find((issue) => issue.step === step && issue.field === field)
          ?.message
      : undefined;

  const scrollToTop = () => contentRef.current?.scrollTo?.({ top: 0 });
  const goToStep = (target: StepId) => {
    setSeenSteps((current) => new Set([...current, step]));
    setStep(target);
    scrollToTop();
  };
  const markChecked = (...ids: StepId[]) =>
    setCheckedSteps((current) => new Set([...current, ...ids]));

  const next = () => {
    markChecked(step);
    if (issuesOf(step).length > 0) return;
    goToStep((step + 1) as StepId);
  };

  // A part is finished when it has nothing left to fix and, in a new campaign, has been
  // gone through. The review is finished when the three parts before it are.
  const isStepDone = (id: StepId): boolean =>
    id === 4
      ? isStepDone(1) && isStepDone(2) && isStepDone(3)
      : issuesOf(id).length === 0 &&
        (Boolean(baseCampaign) || seenSteps.has(id));
  const stepState = (id: StepId): StepState => {
    const revealed = checkedSteps.has(id) || step === 4;
    if (id !== 4 && issuesOf(id).length > 0 && revealed) return "error";
    if (isStepDone(id)) return "done";
    return id === step ? "current" : "pending";
  };

  const isDirty = () =>
    JSON.stringify({ ...form, prizes: allocatedPrizeLines(form) }) !==
    JSON.stringify({
      ...initialForm,
      prizes: allocatedPrizeLines(initialForm),
    });

  const openPlayerStudio = () =>
    onOpenPlayerScreenEditor?.({
      id: editingCampaign?.id || "",
      name: form.name,
      gameType: form.type,
      playerScreenConfig: baseCampaign?.playerScreenConfig,
    });
  const leave = (target: LeaveTarget) =>
    target === "cancel" ? onCancel() : openPlayerStudio();
  const requestLeave = (target: LeaveTarget) =>
    isDirty() ? setConfirmLeave(target) : leave(target);

  const executeSave = async (submitStatus: SubmitStatus) => {
    setSaveError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        id: editingCampaign?.id ?? "",
        name: form.name,
        arabicName: form.arabicName,
        heroImageUrl: form.heroImageUrl || undefined,
        slug: form.slug,
        gameType: form.type,
        gameLogicConfig: form.gameLogicConfig,
        status: submitStatus,
        winProbability: form.winProbability,
        autoPacePrizes: form.autoPacePrizes,
        maxEntries: form.maxEntries,
        prizes: allocatedPrizeLines(form),
        questions: form.type === "quiz" ? form.questions : [],
        startDate: form.startDate,
        endDate: form.endDate,
        // The player screens are designed in the Player Experience Studio: the wizard
        // passes the stored value back untouched (the save RPC overwrites the column).
        playerScreenConfig: baseCampaign?.playerScreenConfig,
        mode: isEditMode ? "edit" : isRelaunchMode ? "relaunch" : "create",
        submitStatus,
      });
    } catch (err: any) {
      setSaveError(
        err?.message ||
          "The campaign could not be saved. Check the fields and try again.",
      );
      scrollToTop();
    } finally {
      setIsSubmitting(false);
      setConfirmLiveSave(null);
    }
  };

  // Saving is possible from any step; what is missing sends the user to where to fix it.
  const requestSave = (submitStatus: SubmitStatus) => {
    setSaveError(null);
    if (issues.length > 0) {
      markChecked(1, 2, 3);
      goToStep(issues[0].step);
      return;
    }
    if (isLiveCampaign) setConfirmLiveSave(submitStatus);
    else void executeSave(submitStatus);
  };

  // Escape closes the window, unless a confirmation is open (it handles its own Escape).
  const dialogOpen = confirmLiveSave !== null || confirmLeave !== null;
  const requestLeaveRef = useRef(requestLeave);
  requestLeaveRef.current = requestLeave;
  useEffect(() => {
    if (dialogOpen || isSubmitting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestLeaveRef.current("cancel");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, isSubmitting]);

  const title = isEditMode
    ? "Edit campaign"
    : isRelaunchMode
      ? "Relaunch campaign"
      : "New campaign";
  // An existing campaign is named under the title; a new one gets a line of guidance.
  const subtitle = editingCampaign
    ? editingCampaign.name
    : isRelaunchMode
      ? `A new campaign that starts from the settings of “${relaunchDraft?.name}”.`
      : "Four short parts. You can save a draft at any time and finish later.";
  const publishLabel = isLiveCampaign
    ? "Save changes"
    : isEditMode
      ? "Publish"
      : "Publish campaign";
  const stepIssues = issuesOf(step);
  const showStepErrors = checkedSteps.has(step) && stepIssues.length > 0;
  const doneCount = ([1, 2, 3, 4] as StepId[]).filter(isStepDone).length;

  return createPortal(
    <div
      className={cn(
        cxRoot,
        "fixed inset-0 z-40 flex items-center justify-center bg-cx-scrim p-3 sm:p-6",
      )}
    >
      <div
        id="campaign-wizard-root"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full max-h-[52rem] w-full max-w-[920px] flex-col overflow-hidden rounded-cx-xl border border-cx-border bg-cx-surface shadow-cx-pop"
      >
        <header className="flex items-start justify-between gap-4 border-b border-cx-border px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={cxText.sectionTitle}>{title}</h2>
              {editingCampaign && (
                <CampaignStatusBadge campaign={editingCampaign} t={t} />
              )}
            </div>
            <p className={cn(cxText.caption, "mt-0.5")}>{subtitle}</p>
          </div>
          <CxButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close"
            disabled={isSubmitting}
            onClick={() => requestLeave("cancel")}
          >
            <X aria-hidden />
          </CxButton>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="Parts of the campaign"
            className="shrink-0 border-b border-cx-border bg-cx-sunken p-3 md:w-[220px] md:overflow-y-auto md:border-b-0 md:border-r md:px-4 md:py-5"
          >
            <ol className="grid grid-cols-2 gap-2 md:grid-cols-1">
              {WIZARD_STEPS.map((item, index) => {
                const state = stepState(item.id);
                const isCurrent = step === item.id;
                const isLast = index === WIZARD_STEPS.length - 1;
                // The part being worked on shows its number, unless it has something to fix.
                const look: StepState =
                  isCurrent && state !== "error" ? "current" : state;
                return (
                  <li key={item.id} className="relative">
                    {!isLast && (
                      <span
                        aria-hidden
                        className="absolute left-[21px] top-full hidden h-2 w-0.5 bg-cx-control opacity-50 md:block"
                      />
                    )}
                    <button
                      type="button"
                      aria-current={isCurrent ? "step" : undefined}
                      onClick={() => goToStep(item.id)}
                      className={cn(
                        cxFocus,
                        "flex w-full cursor-pointer items-center gap-3 rounded-cx-md p-2 text-left transition-colors duration-[120ms]",
                        isCurrent
                          ? "bg-cx-surface ring-1 ring-inset ring-cx-border"
                          : "hover:bg-cx-surface",
                      )}
                    >
                      <span
                        data-state={state}
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold tabular-nums",
                          DOT_TONE[look],
                        )}
                      >
                        {look === "error" ? (
                          "!"
                        ) : look === "done" ? (
                          <Check className="size-3.5 stroke-[3]" aria-hidden />
                        ) : (
                          item.id
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold leading-[18px] text-cx-ink">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-xs font-medium leading-4",
                            look === "error"
                              ? "text-cx-danger"
                              : "text-cx-ink-subtle",
                          )}
                        >
                          {look === "error"
                            ? "Needs attention"
                            : look === "done"
                              ? "Done"
                              : isCurrent
                                ? "Editing"
                                : item.caption}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p
              className={cn(
                cxText.caption,
                "mt-5 hidden border-t border-cx-border px-2 pt-3 tabular-nums md:block",
              )}
            >
              {doneCount} of 4 parts done
            </p>
          </nav>

          <div
            ref={contentRef}
            className="grid grid-cols-1 min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 sm:p-6"
          >
            {isLiveCampaign && (
              <CxNotice tone="warning" icon={AlertCircle}>
                This campaign is live. Saved changes reach players immediately.
              </CxNotice>
            )}
            {saveError && (
              <CxNotice tone="danger" icon={AlertCircle} role="alert">
                <p>The campaign was not saved</p>
                <p className="font-medium">{saveError}</p>
              </CxNotice>
            )}
            {showStepErrors && step !== 4 && (
              <CxNotice tone="danger" icon={AlertCircle} role="alert">
                {stepIssues.length === 1
                  ? stepIssues[0].message
                  : `${stepIssues.length} things need your attention in this part.`}
              </CxNotice>
            )}

            {step === 1 && (
              <StepBasics
                form={form}
                update={update}
                errorFor={errorFor}
                isLiveCampaign={isLiveCampaign}
                originalType={editingCampaign?.gameType ?? null}
                slugFollowsName={slugFollowsName}
                onSlugEdited={() => setSlugFollowsName(false)}
              />
            )}
            {step === 2 && (
              <StepGameRules
                form={form}
                update={update}
                errorFor={errorFor}
                isLiveCampaign={isLiveCampaign}
                pacingWasEnabled={Boolean(baseCampaign?.autoPacePrizes)}
              />
            )}
            {step === 3 && (
              <div>
                <StepPrizes
                  form={form}
                  update={update}
                  errorFor={errorFor}
                  templates={prizes}
                  editingCampaign={editingCampaign ?? null}
                  isLiveCampaign={isLiveCampaign}
                />
              </div>
            )}
            {step === 4 && (
              <StepReview
                form={form}
                issues={issues}
                templates={prizes}
                onEdit={goToStep}
                onOpenPlayerStudio={
                  onOpenPlayerScreenEditor
                    ? () => requestLeave("studio")
                    : undefined
                }
              />
            )}
          </div>
        </div>

        {/* One filled button at a time: saving a live campaign, publishing on the review,
            Continue everywhere else. */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cx-border px-6 py-4">
          <CxButton
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => requestLeave("cancel")}
          >
            Cancel
          </CxButton>
          <div className="flex flex-wrap items-center gap-2">
            {step > 1 && (
              <CxButton
                disabled={isSubmitting}
                onClick={() => goToStep((step - 1) as StepId)}
              >
                <ArrowLeft aria-hidden />
                Back
              </CxButton>
            )}
            {!isLiveCampaign && (
              <CxButton
                disabled={isSubmitting}
                onClick={() => requestSave("draft")}
              >
                <Save aria-hidden />
                {isSubmitting ? "Saving…" : "Save draft"}
              </CxButton>
            )}
            {step < 4 && (
              <CxButton
                variant={isLiveCampaign ? "secondary" : "primary"}
                onClick={next}
                disabled={isSubmitting}
              >
                Continue
                <ArrowRight aria-hidden />
              </CxButton>
            )}
            {(isLiveCampaign || step === 4) && (
              <CxButton
                variant="primary"
                disabled={isSubmitting}
                onClick={() => requestSave("active")}
              >
                {isLiveCampaign ? <Save aria-hidden /> : <Rocket aria-hidden />}
                {isSubmitting ? "Saving…" : publishLabel}
              </CxButton>
            )}
          </div>
        </footer>
      </div>

      {confirmLiveSave && editingCampaign && (
        <ConfirmDialog
          title="Save changes to a live campaign?"
          confirmLabel={isSubmitting ? "Saving…" : "Save changes"}
          cancelLabel="Keep editing"
          busy={isSubmitting}
          onConfirm={() => void executeSave(confirmLiveSave)}
          onCancel={() => setConfirmLiveSave(null)}
        >
          <p>
            <strong className="text-cx-ink">{editingCampaign.name}</strong> is
            live. Your changes reach players{" "}
            <strong className="text-cx-ink">immediately</strong>.
          </p>
          {editingCampaign.gameType !== form.type && (
            <CxNotice tone="warning" icon={AlertCircle}>
              You changed the game. Players in the middle of a session may be
              affected.
            </CxNotice>
          )}
          <p>Prizes already won and past entries are kept.</p>
        </ConfirmDialog>
      )}
      {confirmLeave && (
        <ConfirmDialog
          title="Leave without saving?"
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          destructive
          onConfirm={() => {
            const target = confirmLeave;
            setConfirmLeave(null);
            leave(target);
          }}
          onCancel={() => setConfirmLeave(null)}
        >
          <p>
            Your changes to this campaign have not been saved and will be lost.
          </p>
        </ConfirmDialog>
      )}
    </div>,
    document.body,
  );
};
