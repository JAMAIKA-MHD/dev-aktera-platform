// The campaign editor: a window with the five steps of a campaign listed on the left, to
// create, edit or relaunch a campaign. The campaign has two decoupled layers — what the
// player does (Engagement) and how the outcome is decided (Reward) — read from the
// mechanics library (./wizard/mechanicsRegistry). Each step lives in ./campaignWizard and its
// rules in ./campaignWizard/wizardForm; this file holds the navigation and the save.
import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Save,
  Smartphone,
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
import { StepEngagement } from "./campaignWizard/StepEngagement";
import { StepFoundation } from "./campaignWizard/StepFoundation";
import { StepPrizes } from "./campaignWizard/StepPrizes";
import { listIssues, StepReview } from "./campaignWizard/StepReview";
import { StepReward } from "./campaignWizard/StepReward";
import {
  gameTypeOf,
  initialWizardForm,
  isQuiz,
  playingGame,
  previewCampaign,
  savedAutoPace,
  savedGameLogic,
  savedPrizeLines,
  savedWinProbability,
  SETTING_STEPS,
  shownQuestions,
  startingOn,
  validateWizard,
  WIZARD_STEPS,
  type SaveStatus,
  type StepId,
  type WizardContext,
  type WizardForm,
} from "./campaignWizard/wizardForm";

// The Player Experience sandbox, loaded on demand (only the module's index may be imported).
const CampaignSimulator = lazy(() =>
  import("../features/player-experience").then((module) => ({
    default: module.CampaignSimulator,
  })),
);

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
  // Names of the other campaigns of the organization: a new campaign cannot reuse one.
  existingNames?: string[];
  // Opens on a given step: Foundation (1), Engagement (2), Reward (3), Prizes (4), Review (5).
  initialStep?: StepId;
  // A new campaign chosen from a quick-start card opens on that game.
  initialGameType?: Campaign["gameType"];
  // A new campaign chosen from a date on the Overview timeline starts on that day.
  initialStartDate?: string;
}

type LeaveTarget = "cancel" | "studio";
type StepState = "error" | "done" | "current" | "pending";
type Popup = "sandbox" | "rules" | null;

const DOT_TONE: Record<StepState, string> = {
  error: "border-cx-danger bg-cx-danger text-cx-surface",
  done: "border-cx-success bg-cx-success text-cx-on-success",
  current: "border-cx-brand bg-cx-surface text-cx-brand-text",
  pending: "border-cx-control bg-cx-surface text-cx-ink-muted",
};

// A window on top of the editor: the player sandbox or the sweepstake rules.
function Popover({
  title,
  icon,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={cn(
        cxRoot,
        "fixed inset-0 z-50 flex items-center justify-center bg-cx-scrim p-4",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-cx-xl border border-cx-border bg-cx-surface shadow-cx-pop",
          wide
            ? "h-[min(92dvh,900px)] max-w-[410px]"
            : "max-h-[80dvh] max-w-lg",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cx-border px-4 py-3">
          <h3
            className={cn(
              cxText.sectionTitle,
              "flex min-w-0 items-center gap-2 truncate",
            )}
          >
            {icon}
            <span className="truncate">{title}</span>
          </h3>
          <CxButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden />
          </CxButton>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  prizes,
  onSave,
  onCancel,
  onOpenPlayerScreenEditor,
  relaunchDraft,
  editingCampaign,
  existingNames = [],
  initialStep = 1,
  initialGameType,
  initialStartDate,
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
  const [initialForm, setInitialForm] = useState(() => {
    const opened = initialWizardForm(editingCampaign, relaunchDraft, prizes);
    if (baseCampaign) return opened;
    const typed = initialGameType
      ? playingGame(opened, initialGameType)
      : opened;
    return initialStartDate ? startingOn(typed, initialStartDate) : typed;
  });
  const [form, setForm] = useState<WizardForm>(initialForm);
  const update = (patch: Partial<WizardForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const [step, setStep] = useState<StepId>(initialStep);
  // Steps whose errors are shown: a field only complains once the user tried to move on.
  const [checkedSteps, setCheckedSteps] = useState<Set<StepId>>(new Set());
  // Steps the user has been through. A new campaign's step only turns green once it has
  // been seen: its default values are valid, but nobody has looked at them yet.
  const [seenSteps, setSeenSteps] = useState<Set<StepId>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmLiveSave, setConfirmLiveSave] = useState<SaveStatus | null>(
    null,
  );
  const [confirmLeave, setConfirmLeave] = useState<LeaveTarget | null>(null);
  const [popup, setPopup] = useState<Popup>(null);
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

  const context: WizardContext = useMemo(
    () => ({
      templates: prizes,
      editingCampaign: editingCampaign ?? null,
      existingNames,
    }),
    [prizes, editingCampaign, existingNames],
  );
  // A new campaign is saved as a draft and published later from its card, in one click and
  // with no other check: so every campaign is checked as for going live (the sweepstake
  // rules, the draw's messages) before it is saved.
  const errors = useMemo(
    () => validateWizard(form, "active", context),
    [form, context],
  );
  const issues = listIssues(errors);
  const hasErrors = (id: StepId) => Boolean(errors[id]);
  const errorFor = (field: string) =>
    checkedSteps.has(step) ? errors[step]?.[field] : undefined;

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
    if (hasErrors(step)) return;
    goToStep((step + 1) as StepId);
  };

  // A step is finished when it has nothing left to fix and, in a new campaign, has been
  // gone through. The review is finished when the four steps before it are.
  const isStepDone = (id: StepId): boolean =>
    id === 5
      ? SETTING_STEPS.every(isStepDone)
      : !hasErrors(id) && (Boolean(baseCampaign) || seenSteps.has(id));
  const stepState = (id: StepId): StepState => {
    const revealed = checkedSteps.has(id) || step === 5;
    if (id !== 5 && hasErrors(id) && revealed) return "error";
    if (isStepDone(id)) return "done";
    return id === step ? "current" : "pending";
  };

  const isDirty = () => JSON.stringify(form) !== JSON.stringify(initialForm);

  const gameType = gameTypeOf(form);
  const openPlayerStudio = () =>
    onOpenPlayerScreenEditor?.({
      id: editingCampaign?.id || "",
      name: form.name,
      gameType,
      playerScreenConfig: baseCampaign?.playerScreenConfig,
    });
  const leave = (target: LeaveTarget) =>
    target === "cancel" ? onCancel() : openPlayerStudio();
  const requestLeave = (target: LeaveTarget) =>
    isDirty() ? setConfirmLeave(target) : leave(target);

  const executeSave = async (submitStatus: SaveStatus) => {
    setSaveError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        id: editingCampaign?.id ?? "",
        name: form.name.trim(),
        arabicName: form.arabicName,
        heroImageUrl: form.heroImageUrl || undefined,
        slug: form.slug,
        gameType,
        gameLogicConfig: savedGameLogic(form, baseCampaign),
        status: submitStatus,
        winProbability: savedWinProbability(form),
        autoPacePrizes: savedAutoPace(form),
        maxEntries: form.maxEntries,
        prizes: savedPrizeLines(form),
        questions: isQuiz(form) ? shownQuestions(form) : [],
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

  // What is missing sends the user to where to fix it. A campaign not yet live stays a draft:
  // it is published from its card or its page.
  const requestSave = () => {
    setSaveError(null);
    const submitStatus: SaveStatus = isLiveCampaign ? "active" : "draft";
    const firstStep = SETTING_STEPS.find((id) => errors[id]);
    if (firstStep) {
      markChecked(...SETTING_STEPS);
      goToStep(firstStep);
      return;
    }
    if (isLiveCampaign) setConfirmLiveSave(submitStatus);
    else void executeSave(submitStatus);
  };

  // Escape closes the window, unless something is open above it (it handles its own Escape).
  const layerOpen =
    confirmLiveSave !== null || confirmLeave !== null || popup !== null;
  const requestLeaveRef = useRef(requestLeave);
  requestLeaveRef.current = requestLeave;
  useEffect(() => {
    if (layerOpen || isSubmitting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestLeaveRef.current("cancel");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [layerOpen, isSubmitting]);

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
      : "Five short steps. It is saved as a draft: publish it from its card when you are ready.";
  const saveLabel = isEditMode ? "Save changes" : "Create campaign";
  const stepIssues = issues.filter((issue) => issue.step === step);
  const showStepErrors = checkedSteps.has(step) && stepIssues.length > 0;
  const doneCount = WIZARD_STEPS.filter((item) => isStepDone(item.id)).length;
  const lastStep = WIZARD_STEPS.length as StepId;

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
        className="flex h-full max-h-[52rem] w-full max-w-[960px] flex-col overflow-hidden rounded-cx-xl border border-cx-border bg-cx-surface shadow-cx-pop"
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
            aria-label="Steps of the campaign"
            className="shrink-0 border-b border-cx-border bg-cx-sunken p-3 md:w-[220px] md:overflow-y-auto md:border-b-0 md:border-r md:px-4 md:py-5"
          >
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">
              {WIZARD_STEPS.map((item, index) => {
                const state = stepState(item.id);
                const isCurrent = step === item.id;
                const isLast = index === WIZARD_STEPS.length - 1;
                // The step being worked on shows its number, unless it has something to fix.
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
              {doneCount} of {WIZARD_STEPS.length} steps done
            </p>
          </nav>

          <div
            ref={contentRef}
            className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-4 sm:p-6"
          >
            {isLiveCampaign && (
              <CxNotice tone="warning" icon={AlertCircle}>
                This campaign is live. Saved changes reach players immediately.
              </CxNotice>
            )}
            {isLiveCampaign && editingCampaign?.gameType !== gameType && (
              <CxNotice tone="warning" icon={AlertCircle}>
                These settings change the game players play. Players in the
                middle of a session may be affected.
              </CxNotice>
            )}
            {saveError && (
              <CxNotice tone="danger" icon={AlertCircle} role="alert">
                <p>The campaign was not saved</p>
                <p className="font-medium">{saveError}</p>
              </CxNotice>
            )}
            {showStepErrors && step !== lastStep && (
              <CxNotice tone="danger" icon={AlertCircle} role="alert">
                {stepIssues.length === 1
                  ? stepIssues[0].message
                  : `${stepIssues.length} things need your attention in this step.`}
              </CxNotice>
            )}

            {step === 1 && (
              <StepFoundation
                form={form}
                update={update}
                errorFor={errorFor}
                isLiveCampaign={isLiveCampaign}
              />
            )}
            {step === 2 && (
              <StepEngagement form={form} update={update} errorFor={errorFor} />
            )}
            {step === 3 && (
              <StepReward
                form={form}
                update={update}
                errorFor={errorFor}
                isLiveCampaign={isLiveCampaign}
                pacingWasEnabled={Boolean(baseCampaign?.autoPacePrizes)}
                onPreviewRules={() => setPopup("rules")}
              />
            )}
            {step === 4 && (
              <StepPrizes
                form={form}
                update={update}
                errorFor={errorFor}
                templates={prizes}
                editingCampaign={editingCampaign ?? null}
                isLiveCampaign={isLiveCampaign}
              />
            )}
            {step === 5 && (
              <StepReview
                form={form}
                issues={issues}
                templates={prizes}
                onEdit={goToStep}
                onOpenSandbox={() => setPopup("sandbox")}
                onOpenPlayerStudio={
                  onOpenPlayerScreenEditor && isEditMode
                    ? () => requestLeave("studio")
                    : undefined
                }
              />
            )}
          </div>
        </div>

        {/* One filled button at a time: saving an existing campaign, creating a new one on
            the review, Continue everywhere else. */}
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
            {step < lastStep && (
              <CxButton
                variant={isEditMode ? "secondary" : "primary"}
                onClick={next}
                disabled={isSubmitting}
              >
                Continue
                <ArrowRight aria-hidden />
              </CxButton>
            )}
            {(isEditMode || step === lastStep) && (
              <CxButton
                variant="primary"
                disabled={isSubmitting}
                onClick={requestSave}
              >
                {isEditMode ? <Save aria-hidden /> : <Plus aria-hidden />}
                {isSubmitting ? "Saving…" : saveLabel}
              </CxButton>
            )}
          </div>
        </footer>
      </div>

      {popup === "sandbox" && (
        <Popover
          wide
          title={`Player sandbox: ${form.name.trim() || "Untitled campaign"}`}
          icon={<Smartphone className="size-4 shrink-0" aria-hidden />}
          onClose={() => setPopup(null)}
        >
          <Suspense fallback={<div className="flex-1" />}>
            <CampaignSimulator
              campaigns={[
                previewCampaign(form, baseCampaign, editingCampaign ?? null),
              ]}
              prizeTemplates={prizes}
              campaignId={editingCampaign?.id ?? "wizard-preview"}
            />
          </Suspense>
        </Popover>
      )}
      {popup === "rules" && (
        <Popover title="Sweepstake rules" onClose={() => setPopup(null)}>
          <p
            className="overflow-y-auto whitespace-pre-wrap p-6 text-sm text-cx-ink"
            dir="auto"
          >
            {form.w.draw.rules}
          </p>
        </Popover>
      )}

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
          {editingCampaign.gameType !== gameType && (
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
