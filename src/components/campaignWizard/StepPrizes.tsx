// Step 4: which prizes the campaign gives away, how many of each and, for an instant win,
// how likely each is. A draw may leave its prizes to the brand; a probabilistic campaign may
// give consolation prizes to the players who do not win.
import type { ReactNode } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import type { Campaign, PrizeTemplate } from "../../types";
import { cn } from "../../lib/utils";
import { CxBar, CxButton, cxText } from "../campaigns/campaignUi";
import { SMS_MAX_LENGTH } from "../wizard/wizardSchemas";
import type { StepProps } from "./StepFoundation";
import {
  Field,
  FieldError,
  fieldLabelClass,
  hintClass,
  inputClass,
  OptionCard,
  rowClass,
  StepPanel,
} from "./wizardFields";
import {
  consolationOn,
  effectiveAvailableStock,
  isDraw,
  totalPrizeQuantity,
  totalPrizeWeight,
  type PrizeLine,
} from "./wizardForm";

function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs font-semibold leading-[18px] text-cx-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function EmptyLibrary() {
  return (
    <div className="rounded-cx-md border border-dashed border-cx-control bg-cx-surface p-5 text-center">
      <p className="font-semibold text-cx-ink">Your Reward Library is empty</p>
      <p className={cn(hintClass, "mt-1")}>
        Create at least one reward in the Reward Library, then come back to add
        it here.
      </p>
    </div>
  );
}

export function StepPrizes({
  form,
  update,
  errorFor,
  templates,
  editingCampaign,
  isLiveCampaign,
}: StepProps & {
  templates: PrizeTemplate[];
  editingCampaign: Campaign | null;
  isLiveCampaign: boolean;
}) {
  const { w } = form;
  const draw = isDraw(form);
  const lines = form.prizes;
  const totalWeight = totalPrizeWeight(lines);
  const allocated = totalPrizeQuantity(lines);
  const setLines = (prizes: PrizeLine[]) => update({ prizes });
  const patchLine = (index: number, patch: Partial<PrizeLine>) =>
    setLines(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  const addLine = () =>
    setLines([
      ...lines,
      {
        templateId: templates[0]?.id || "",
        quantity: draw ? 1 : 50,
        weight: draw ? 100 : 50,
      },
    ]);
  const stockLabel = (template: PrizeTemplate) => {
    const stock = effectiveAvailableStock(template, editingCampaign);
    return stock === 0 ? "out of stock" : `${stock} in stock`;
  };
  const patchWizard = (changes: Partial<typeof w>) =>
    update({ w: { ...w, ...changes } });

  // A draw: does Aktera keep track of the prizes and message the players?
  const chooseManaged = (manageStock: boolean) => {
    const next = { w: { ...w, draw: { ...w.draw, manageStock } } };
    if (!manageStock) return update(next);
    update({
      ...next,
      prizes:
        lines.length === 0
          ? [
              {
                templateId: templates[0]?.id || "",
                quantity: w.draw.winners,
                weight: 100,
              },
            ]
          : lines.map((line) => ({
              ...line,
              quantity: Math.min(
                line.quantity || w.draw.winners,
                w.draw.winners,
              ),
            })),
    });
  };

  const showLines = !draw || w.draw.manageStock === true;

  return (
    <div className="grid grid-cols-1 gap-6">
      {draw && (
        <StepPanel
          title="Prizes of the draw"
          description="Let Aktera track your prize stock and tell your players the result."
        >
          <div className="grid grid-cols-1 gap-2">
            <p className="font-semibold text-cx-ink">
              Do you want Aktera to manage this campaign&apos;s prizes?
            </p>
            <div
              role="radiogroup"
              aria-label="Aktera manages the prizes"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <OptionCard
                selected={w.draw.manageStock === true}
                title="Yes"
                description="Track the stock and message the players."
                onSelect={() => chooseManaged(true)}
              />
              <OptionCard
                selected={w.draw.manageStock === false}
                title="No"
                description="I handle the prizes myself."
                onSelect={() => chooseManaged(false)}
              />
            </div>
            {errorFor("manageStock") && (
              <FieldError>{errorFor("manageStock")}</FieldError>
            )}
          </div>
        </StepPanel>
      )}

      {showLines && (
        <StepPanel
          title={draw ? "Rewards for the winners" : "Prizes"}
          description={
            draw
              ? "Pick rewards from your Reward Library. Together they cannot exceed the number of winners."
              : "Pick prizes from your Reward Library, how many of each can be won and how likely each one is."
          }
          actions={
            <CxButton
              size="sm"
              onClick={addLine}
              disabled={templates.length === 0}
            >
              <Plus aria-hidden />
              Add reward
            </CxButton>
          }
        >
          {templates.length === 0 && <EmptyLibrary />}
          {errorFor("prizes") && <FieldError>{errorFor("prizes")}</FieldError>}

          <ul className="grid grid-cols-1 gap-4">
            {lines.map((line, index) => {
              const template = templates.find((t) => t.id === line.templateId);
              const quantityWon =
                editingCampaign?.prizes?.find(
                  (prize) => prize.templateId === line.templateId,
                )?.quantity_won ?? 0;
              const locked = isLiveCampaign && quantityWon > 0;
              const stock = template
                ? effectiveAvailableStock(template, editingCampaign)
                : null;
              const share =
                totalWeight > 0
                  ? Math.round((Number(line.weight || 0) / totalWeight) * 100)
                  : 0;
              const rewardError = errorFor(`prizes.${index}.templateId`);
              const quantityError = errorFor(`prizes.${index}.quantity`);
              const weightError = errorFor(`prizes.${index}.weight`);

              return (
                <li
                  key={line.id ?? index}
                  className={cn(rowClass, "grid grid-cols-1 gap-3")}
                >
                  <div
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-3",
                      draw
                        ? "sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem]"
                        : "sm:grid-cols-[minmax(0,1fr)_6rem_6rem_2.5rem]",
                    )}
                  >
                    <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                      <span className={fieldLabelClass}>Reward</span>
                      <select
                        value={line.templateId}
                        aria-invalid={rewardError ? true : undefined}
                        onChange={(event) =>
                          patchLine(
                            index,
                            event.target.value
                              ? { templateId: event.target.value }
                              : { templateId: "", quantity: 0 },
                          )
                        }
                        className={inputClass(Boolean(rewardError))}
                      >
                        {(templates.length === 0 ||
                          (draw && !line.templateId)) && (
                          <option value="">
                            {templates.length === 0
                              ? "No rewards available yet"
                              : "Select a reward"}
                          </option>
                        )}
                        {templates.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.itemValue} · {stockLabel(item)}
                          </option>
                        ))}
                      </select>
                      {rewardError && <FieldError>{rewardError}</FieldError>}
                    </label>

                    <div
                      className={cn(
                        "grid gap-3 sm:contents",
                        draw ? "grid-cols-1" : "grid-cols-2",
                      )}
                    >
                      <label className="flex flex-col gap-1.5">
                        <span className={fieldLabelClass}>
                          {locked
                            ? `Quantity (min ${quantityWon})`
                            : "Quantity"}
                        </span>
                        <input
                          type="number"
                          min={locked ? quantityWon : 1}
                          max={stock ?? undefined}
                          aria-invalid={quantityError ? true : undefined}
                          value={line.quantity || ""}
                          onChange={(event) =>
                            patchLine(index, {
                              quantity: Number(event.target.value),
                            })
                          }
                          className={inputClass(Boolean(quantityError))}
                        />
                        {quantityError && (
                          <FieldError>{quantityError}</FieldError>
                        )}
                      </label>

                      {!draw && (
                        <label className="flex flex-col gap-1.5">
                          <span
                            className={fieldLabelClass}
                            title="Relative to the other prizes: a weight of 20 is drawn twice as often as a weight of 10."
                          >
                            Weight
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            aria-invalid={weightError ? true : undefined}
                            value={line.weight}
                            onChange={(event) =>
                              patchLine(index, {
                                weight: Number(event.target.value),
                              })
                            }
                            className={inputClass(Boolean(weightError))}
                          />
                          {weightError && (
                            <FieldError>{weightError}</FieldError>
                          )}
                        </label>
                      )}
                    </div>

                    <CxButton
                      variant="danger"
                      iconOnly
                      aria-label={`Remove reward ${index + 1}`}
                      className="sm:mt-[22px]"
                      disabled={lines.length <= 1 || quantityWon > 0}
                      title={
                        quantityWon > 0
                          ? `${quantityWon} already won: set its weight to 0 to stop new wins instead.`
                          : lines.length <= 1
                            ? "Keep at least one row"
                            : "Remove reward"
                      }
                      onClick={() =>
                        setLines(lines.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 aria-hidden />
                    </CxButton>
                  </div>

                  {!draw && (
                    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                      <CxBar percent={share} />
                      <span className={cn(cxText.caption, "tabular-nums")}>
                        <b className="font-bold text-cx-ink">{share}%</b> of
                        wins
                      </span>
                    </div>
                  )}
                  {quantityWon > 0 && (
                    <p className={cn(hintClass, "tabular-nums")}>
                      {quantityWon} of {line.quantity} already won
                      {isLiveCampaign
                        ? `. Quantity can't go below ${quantityWon}.`
                        : "."}
                    </p>
                  )}
                  {template?.category === "voucher" &&
                    (template.filledValuesCount ?? 0) < line.quantity && (
                      <Warning>
                        {template.filledValuesCount ?? 0} voucher codes are
                        ready, {line.quantity} are needed.
                      </Warning>
                    )}
                </li>
              );
            })}
          </ul>

          {lines.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-cx-md bg-cx-sunken px-4 py-3 text-[13px] leading-5",
                draw && allocated > w.draw.winners
                  ? "text-cx-danger"
                  : "text-cx-ink-muted",
              )}
            >
              {draw ? (
                <span className="tabular-nums">
                  <b className="font-bold text-cx-ink">{allocated}</b> of{" "}
                  {w.draw.winners}{" "}
                  {w.draw.winners === 1 ? "winner has" : "winners have"} a
                  reward.
                </span>
              ) : (
                <>
                  <span className="tabular-nums">
                    <b className="font-bold text-cx-ink">{allocated}</b> prizes
                    across {lines.length}{" "}
                    {lines.length === 1 ? "reward" : "rewards"}
                  </span>
                  <span>
                    Weights are relative: each share is its weight divided by
                    the total.
                  </span>
                </>
              )}
            </div>
          )}
        </StepPanel>
      )}

      {draw && w.draw.manageStock === true && (
        <StepPanel
          title="Messages after the draw"
          description="Sent by SMS once the winners are drawn. Required."
        >
          {(
            [
              ["smsWinner", "sms.winner", "Message for the winners"],
              ["smsLoser", "sms.loser", "Message for the other players"],
            ] as const
          ).map(([key, errorKey, label]) => (
            <Field
              key={key}
              label={label}
              required
              error={errorFor(errorKey)}
              hint={`${w.draw[key].length}/${SMS_MAX_LENGTH} characters`}
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  dir="auto"
                  maxLength={SMS_MAX_LENGTH}
                  value={w.draw[key]}
                  placeholder={
                    key === "smsWinner"
                      ? "Congratulations, you won! We will contact you shortly."
                      : "Thanks for playing. You were not picked this time."
                  }
                  onChange={(event) =>
                    patchWizard({
                      draw: { ...w.draw, [key]: event.target.value },
                    })
                  }
                  className={cn(
                    inputClass(Boolean(errorFor(errorKey))),
                    "h-auto py-2.5 leading-5",
                  )}
                />
              )}
            </Field>
          ))}
        </StepPanel>
      )}

      {consolationOn(form) && (
        <StepPanel
          title="Consolation prizes"
          description="Given to the players who do not win."
          actions={
            <CxButton
              size="sm"
              disabled={templates.length === 0}
              onClick={() =>
                patchWizard({
                  consolationPrizes: [
                    ...w.consolationPrizes,
                    { templateId: templates[0]?.id || "", quantity: 100 },
                  ],
                })
              }
            >
              <Plus aria-hidden />
              Add consolation prize
            </CxButton>
          }
        >
          {errorFor("consolationPrizes") && (
            <FieldError>{errorFor("consolationPrizes")}</FieldError>
          )}
          <ul className="grid grid-cols-1 gap-3">
            {w.consolationPrizes.map((line, index) => {
              const patchConsolation = (changes: Partial<typeof line>) =>
                patchWizard({
                  consolationPrizes: w.consolationPrizes.map((item, i) =>
                    i === index ? { ...item, ...changes } : item,
                  ),
                });
              const rewardError = errorFor(
                `consolationPrizes.${index}.templateId`,
              );
              const quantityError = errorFor(
                `consolationPrizes.${index}.quantity`,
              );
              return (
                <li
                  key={index}
                  className={cn(
                    rowClass,
                    "grid grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem]",
                  )}
                >
                  <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                    <span className={fieldLabelClass}>Reward</span>
                    <select
                      value={line.templateId}
                      aria-invalid={rewardError ? true : undefined}
                      onChange={(event) =>
                        patchConsolation({ templateId: event.target.value })
                      }
                      className={inputClass(Boolean(rewardError))}
                    >
                      <option value="">Select a reward</option>
                      {templates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {stockLabel(item)}
                        </option>
                      ))}
                    </select>
                    {rewardError && <FieldError>{rewardError}</FieldError>}
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={fieldLabelClass}>Quantity</span>
                    <input
                      type="number"
                      min={1}
                      aria-invalid={quantityError ? true : undefined}
                      value={line.quantity || ""}
                      onChange={(event) =>
                        patchConsolation({
                          quantity: Number(event.target.value),
                        })
                      }
                      className={inputClass(Boolean(quantityError))}
                    />
                    {quantityError && <FieldError>{quantityError}</FieldError>}
                  </label>
                  <CxButton
                    variant="danger"
                    iconOnly
                    aria-label={`Remove consolation prize ${index + 1}`}
                    className="sm:mt-[22px]"
                    onClick={() =>
                      patchWizard({
                        consolationPrizes: w.consolationPrizes.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 aria-hidden />
                  </CxButton>
                </li>
              );
            })}
          </ul>
          {w.consolationPrizes.length === 0 && (
            <p className={hintClass}>No consolation prize added yet.</p>
          )}
        </StepPanel>
      )}
    </div>
  );
}
