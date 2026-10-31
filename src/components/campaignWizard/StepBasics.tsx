// Step 1: which game, what it is called, where players find it and when it runs.
import { AlertCircle } from "lucide-react";

import { ImageUploader } from "../common/ImageUploader";
import {
  campaignDurationDays,
  GAME_TYPES,
  type GameType,
} from "../campaigns/campaignMeta";
import { CxNotice, cxFocus } from "../campaigns/campaignUi";
import { GameEmblem } from "../campaigns/GameEmblem";
import { cn } from "../../lib/utils";
import {
  ChoiceCard,
  Field,
  FieldError,
  GroupLabel,
  hintClass,
  inputClass,
  StepPanel,
} from "./wizardFields";
import { sanitizeSlugInput, slugify, type WizardForm } from "./wizardForm";

const DARIJA_SAMPLE = "سجل في المسابقة واربح هدايا فورية قيمة من اختيارك! 🎁";

export interface StepProps {
  form: WizardForm;
  update: (patch: Partial<WizardForm>) => void;
  /** Message to show under a field, once the user has tried to move on. */
  errorFor: (field: string) => string | undefined;
}

export function StepBasics({
  form,
  update,
  errorFor,
  isLiveCampaign,
  originalType,
  slugFollowsName,
  onSlugEdited,
}: StepProps & {
  isLiveCampaign: boolean;
  /** Game of the campaign being edited, to warn when a live one is switched. */
  originalType: GameType | null;
  /** While true, the link is derived from the name as it is typed. */
  slugFollowsName: boolean;
  onSlugEdited: () => void;
}) {
  const days = campaignDurationDays(form.startDate, form.endDate);
  const datesError = errorFor("dates");

  return (
    <div className="grid grid-cols-1 gap-6">
      <StepPanel
        title="Choose the game"
        description="The game your customers play. Everything else in this campaign adapts to it."
      >
        <div
          role="radiogroup"
          aria-label="Game"
          className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3"
        >
          {GAME_TYPES.map((game) => (
            <ChoiceCard
              key={game.id}
              selected={form.type === game.id}
              onSelect={() => update({ type: game.id })}
              icon={<GameEmblem gameType={game.id} size={60} />}
              title={game.label}
              description={game.description}
              footnote={game.setup}
            />
          ))}
        </div>
        {isLiveCampaign && originalType && originalType !== form.type && (
          <CxNotice tone="warning" icon={AlertCircle}>
            Changing the game of a live campaign affects players who are in the
            middle of a session.
          </CxNotice>
        )}
      </StepPanel>

      <StepPanel
        title="Name and link"
        description="How you recognise the campaign, and the address your customers open."
      >
        <Field label="Campaign name" required error={errorFor("name")}>
          {(props) => (
            <input
              {...props}
              type="text"
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                update(
                  slugFollowsName ? { name, slug: slugify(name) } : { name },
                );
              }}
              placeholder="e.g. Ramadan Super Spin 2026"
              className={inputClass(Boolean(errorFor("name")))}
            />
          )}
        </Field>

        <Field
          label="Player link"
          required
          error={errorFor("slug")}
          hint={
            isLiveCampaign
              ? "Keep this link as it is: printed QR codes and shared links point to it."
              : "The public address of the game. Lowercase letters, numbers and dashes."
          }
        >
          {(props) => (
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 select-none font-mono text-[13px] text-cx-ink-subtle">
                /play/
              </span>
              <input
                {...props}
                type="text"
                value={form.slug}
                onChange={(event) => {
                  onSlugEdited();
                  update({ slug: sanitizeSlugInput(event.target.value) });
                }}
                placeholder="ramadan-spin"
                className={cn(
                  inputClass(Boolean(errorFor("slug"))),
                  "pl-[3.75rem] font-mono text-[13px]",
                )}
              />
            </div>
          )}
        </Field>

        <Field
          label="Arabic / Darija tagline"
          hint="A short promotional line in Arabic or Darija."
          action={
            <button
              type="button"
              onClick={() => update({ arabicName: DARIJA_SAMPLE })}
              className={cn(
                cxFocus,
                "cursor-pointer rounded-cx-sm text-xs font-semibold text-cx-brand-text hover:underline",
              )}
            >
              Use a sample
            </button>
          }
        >
          {(props) => (
            <input
              {...props}
              type="text"
              dir="rtl"
              value={form.arabicName}
              onChange={(event) => update({ arabicName: event.target.value })}
              placeholder="اربح هدايا وقسائم فورية مع كل مشاركة!"
              className={inputClass()}
            />
          )}
        </Field>

        <div className="flex flex-col gap-1.5">
          <GroupLabel hint="The banner picture of this campaign.">
            Cover image{" "}
            <span className="font-medium text-cx-ink-subtle">(optional)</span>
          </GroupLabel>
          <ImageUploader
            value={form.heroImageUrl}
            onChange={(heroImageUrl) => update({ heroImageUrl })}
            folder="campaigns"
            label="Upload cover image"
          />
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" required>
              {(props) => (
                <input
                  {...props}
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    update({ startDate: event.target.value })
                  }
                  className={inputClass(Boolean(datesError))}
                />
              )}
            </Field>
            <Field label="End date" required>
              {(props) => (
                <input
                  {...props}
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(event) => update({ endDate: event.target.value })}
                  className={inputClass(Boolean(datesError))}
                />
              )}
            </Field>
          </div>
          {datesError ? (
            <FieldError>{datesError}</FieldError>
          ) : (
            days !== null && (
              <p className={hintClass}>
                The campaign runs for {days} {days === 1 ? "day" : "days"}.
              </p>
            )
          )}
        </div>
      </StepPanel>
    </div>
  );
}
