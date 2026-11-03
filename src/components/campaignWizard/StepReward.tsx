// Step 3, layer 2 (reward determination): how the outcome is decided — an instant win
// (probabilistic odds or guaranteed winning) revealed by a luck mechanic, or a scheduled
// draw. The server draws every outcome (select-prize); this step only sets its rules.
import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Info } from "lucide-react";

import { cn } from "../../lib/utils";
import { CxBadge, CxButton, CxNotice } from "../campaigns/campaignUi";
import { GameEmblem } from "../campaigns/GameEmblem";
import { mechanicsFor } from "../wizard/mechanicsRegistry";
import type { StepProps } from "./StepFoundation";
import {
  Field,
  FieldError,
  GroupLabel,
  hintClass,
  inputClass,
  OptionCard,
  RangeField,
  rowClass,
  StepPanel,
  SwitchRow,
} from "./wizardFields";
import { isDraw } from "./wizardForm";

function Explainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-cx-md bg-cx-brand-soft px-4 py-3 text-[13px] leading-5 text-cx-ink">
      <Info className="mt-0.5 size-4 shrink-0 text-cx-brand-text" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function StepReward({
  form,
  update,
  errorFor,
  isLiveCampaign,
  pacingWasEnabled,
  onPreviewRules,
}: StepProps & {
  isLiveCampaign: boolean;
  /** Whether the campaign being edited already had auto-distribution on. */
  pacingWasEnabled: boolean;
  onPreviewRules: () => void;
}) {
  const { w } = form;
  const draw = isDraw(form);
  const patch = (changes: Partial<typeof w>) =>
    update({ w: { ...w, ...changes } });
  const patchDraw = (changes: Partial<typeof w.draw>) =>
    patch({ draw: { ...w.draw, ...changes } });
  const rulesError = errorFor("draw.rules");

  return (
    <div className="grid grid-cols-1 gap-6">
      <StepPanel
        title="How is the reward decided?"
        description="The outcome is always drawn on the server. Here you set its rules."
      >
        <div
          role="radiogroup"
          aria-label="Reward method"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <OptionCard
            selected={!draw}
            title="Instant win"
            description="Players see the outcome as soon as they finish."
            onSelect={() => patch({ method: "instant" })}
          />
          <OptionCard
            selected={draw}
            title="Draw"
            description="A scheduled grand sweepstake, drawn later."
            onSelect={() => patch({ method: "draw" })}
          />
        </div>
      </StepPanel>

      {!draw && (
        <StepPanel
          title="Instant win mode"
          description="Choose one. They cannot be combined."
        >
          <div
            role="radiogroup"
            aria-label="Instant win mode"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <OptionCard
              selected={w.mode === "probabilistic"}
              title="Probabilistic odds"
              description="Players win with a chance, against limited stock."
              onSelect={() => patch({ mode: "probabilistic" })}
            />
            <OptionCard
              selected={w.mode === "guaranteed"}
              title="Guaranteed winning (100% Gagnant)"
              description="Every qualified participant receives a reward. Zero losers."
              onSelect={() => patch({ mode: "guaranteed" })}
            />
          </div>

          {w.mode === "probabilistic" ? (
            <>
              <SwitchRow
                checked={form.autoPace}
                onChange={(autoPace) => update({ autoPace })}
                title="Auto-distribute prizes over the campaign period"
                description="AKTERA calculates the win probability so the prizes you select last for the whole campaign."
              >
                {isLiveCampaign && !pacingWasEnabled && form.autoPace && (
                  <CxNotice tone="warning" icon={AlertTriangle}>
                    Turning this on mid-campaign spreads the prizes not yet won,
                    from today onward.
                  </CxNotice>
                )}
              </SwitchRow>
              {form.autoPace ? (
                <Explainer>
                  <strong>Win probability: calculated by AKTERA.</strong> There
                  is no probability to set.
                </Explainer>
              ) : (
                <div className={rowClass}>
                  <RangeField
                    label="Chance to win"
                    hint={`Out of 100 players, about ${form.winProbability} win a prize.`}
                    value={form.winProbability}
                    min={1}
                    max={99}
                    unit="%"
                    onChange={(winProbability) => update({ winProbability })}
                  />
                </div>
              )}
              <SwitchRow
                checked={w.consolation}
                onChange={(consolation) => patch({ consolation })}
                title="Consolation prize for non-winners"
                description="Optional. You choose the consolation prizes in the next step."
              />
            </>
          ) : (
            <Explainer>
              Every validated participant wins. Make sure the prizes of the next
              step cover the players you expect.
            </Explainer>
          )}
        </StepPanel>
      )}

      {!draw && (
        <StepPanel
          title="How is the reward revealed?"
          description="The game players play to discover their result. From the mechanics library."
        >
          <div
            role="radiogroup"
            aria-label="Reveal"
            className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3"
          >
            {mechanicsFor("reward", "instant").map((mechanic) => (
              <OptionCard
                key={mechanic.id}
                selected={w.revealId === mechanic.id}
                disabled={!mechanic.gameType}
                badge={mechanic.gameType ? undefined : "Soon"}
                title={mechanic.label}
                icon={
                  mechanic.gameType && (
                    <GameEmblem gameType={mechanic.gameType} size={36} />
                  )
                }
                onSelect={() => patch({ revealId: mechanic.id })}
              />
            ))}
          </div>
          {w.category !== "luck" && (
            <p className={hintClass}>
              Players play the game of the Engagement step; the reveal is used
              for luck campaigns.
            </p>
          )}
        </StepPanel>
      )}

      {draw && (
        <StepPanel
          title="Draw settings"
          description="When the winners are drawn, how many, and the rules players accept."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Draw date and time"
              required
              error={errorFor("draw.at")}
            >
              {(props) => (
                <input
                  {...props}
                  type="datetime-local"
                  value={w.draw.at}
                  onChange={(event) => patchDraw({ at: event.target.value })}
                  className={inputClass(Boolean(errorFor("draw.at")))}
                />
              )}
            </Field>
            <Field
              label="Number of winners"
              required
              error={errorFor("draw.winners")}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={1}
                  value={Number.isNaN(w.draw.winners) ? "" : w.draw.winners}
                  onChange={(event) =>
                    patchDraw({ winners: event.target.valueAsNumber })
                  }
                  className={inputClass(Boolean(errorFor("draw.winners")))}
                />
              )}
            </Field>
          </div>
          <Field
            label="Ticket prefix"
            hint="Generated automatically if you leave it empty."
          >
            {(props) => (
              <input
                {...props}
                type="text"
                value={w.draw.ticketPrefix}
                placeholder="#TK-"
                onChange={(event) =>
                  patchDraw({ ticketPrefix: event.target.value })
                }
                className={cn(inputClass(), "font-mono")}
              />
            )}
          </Field>

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <GroupLabel>
                <label htmlFor="wizard-draw-rules">Sweepstake rules</label>
              </GroupLabel>
              <CxBadge tone="warning">Required before going live</CxBadge>
            </div>
            <textarea
              id="wizard-draw-rules"
              rows={7}
              dir="auto"
              aria-invalid={rulesError ? true : undefined}
              value={w.draw.rules}
              placeholder="Write the sweepstake rules."
              onChange={(event) => patchDraw({ rules: event.target.value })}
              className={cn(
                inputClass(Boolean(rulesError)),
                "h-auto py-2.5 leading-5",
              )}
            />
            {rulesError && <FieldError>{rulesError}</FieldError>}
            {w.draw.rules.trim() && (
              <CxButton
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={onPreviewRules}
              >
                <BookOpen aria-hidden />
                Read as a player would
              </CxButton>
            )}
          </div>
        </StepPanel>
      )}
    </div>
  );
}
