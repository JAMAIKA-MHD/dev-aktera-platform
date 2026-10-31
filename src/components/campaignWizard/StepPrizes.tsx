// Step 3: which prizes this campaign gives away, how many of each, and how likely each is.
import type { ReactNode } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import type { Campaign, PrizeTemplate } from "../../types";
import { cn } from "../../lib/utils";
import { CxBar, CxButton, cxText } from "../campaigns/campaignUi";
import type { StepProps } from "./StepBasics";
import {
  FieldError,
  fieldLabelClass,
  hintClass,
  inputClass,
  rowClass,
  StepPanel,
} from "./wizardFields";
import {
  effectiveAvailableStock,
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
  const lines = form.prizes;
  const totalWeight = totalPrizeWeight(lines);
  const setLines = (prizes: PrizeLine[]) => update({ prizes });
  const patchLine = (index: number, patch: Partial<PrizeLine>) =>
    setLines(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  const addLine = () =>
    setLines([
      ...lines,
      { templateId: templates[0]?.id || "", quantity: 50, weight: 50 },
    ]);
  const shareOf = (line: PrizeLine) =>
    totalWeight > 0
      ? Math.round((Number(line.weight || 0) / totalWeight) * 100)
      : 0;
  const isWheel = form.type === "lucky_wheel";

  return (
    <StepPanel
      title="Prizes"
      description={
        isWheel
          ? "Pick prizes from your Reward Library. Each one becomes a slice of the wheel."
          : "Pick prizes from your Reward Library and set how many of each can be won."
      }
      actions={
        <CxButton size="sm" onClick={addLine} disabled={templates.length === 0}>
          <Plus aria-hidden />
          Add prize
        </CxButton>
      }
    >
      {templates.length === 0 && (
        <div className="rounded-cx-md border border-dashed border-cx-control bg-cx-surface p-5 text-center">
          <p className="font-semibold text-cx-ink">
            Your Reward Library is empty
          </p>
          <p className={cn(hintClass, "mt-1")}>
            Create at least one reward in the Reward Library, then come back to
            add it here. You can save this campaign as a draft once it has a
            prize.
          </p>
        </div>
      )}

      {(errorFor("prizes") || errorFor("weights")) && (
        <FieldError>{errorFor("prizes") ?? errorFor("weights")}</FieldError>
      )}

      <ul className="grid grid-cols-1 gap-4">
        {lines.map((line, index) => {
          const template = templates.find((t) => t.id === line.templateId);
          const quantityWon =
            editingCampaign?.prizes?.find(
              (prize) => prize.templateId === line.templateId,
            )?.quantity_won ?? 0;
          const minQuantity =
            isLiveCampaign && quantityWon > 0 ? quantityWon : 1;
          const stock = template
            ? effectiveAvailableStock(template, editingCampaign)
            : null;
          const share = shareOf(line);
          const locked = lines.length <= 1 || quantityWon > 0;

          return (
            <li key={index} className={cn(rowClass, "grid grid-cols-1 gap-3")}>
              <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_2.5rem]">
                <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                  <span className={fieldLabelClass}>Prize</span>
                  <select
                    value={line.templateId}
                    onChange={(event) =>
                      patchLine(index, { templateId: event.target.value })
                    }
                    className={inputClass()}
                  >
                    {templates.length === 0 ? (
                      <option value="">No rewards available yet</option>
                    ) : (
                      templates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.itemValue} ·{" "}
                          {effectiveAvailableStock(item, editingCampaign)} in
                          stock
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <label className="flex flex-col gap-1.5">
                    <span className={fieldLabelClass}>Quantity</span>
                    <input
                      type="number"
                      min={minQuantity}
                      max={stock ?? undefined}
                      value={line.quantity}
                      onChange={(event) =>
                        patchLine(index, {
                          quantity: Number(event.target.value),
                        })
                      }
                      className={inputClass()}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span
                      className={fieldLabelClass}
                      title="Relative to the other prizes: a weight of 20 is drawn twice as often as a weight of 10."
                    >
                      {isWheel ? "Wheel weight" : "Weight"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={line.weight}
                      onChange={(event) =>
                        patchLine(index, { weight: Number(event.target.value) })
                      }
                      className={inputClass()}
                    />
                  </label>
                </div>

                <CxButton
                  variant="danger"
                  iconOnly
                  aria-label={`Remove prize ${index + 1}`}
                  disabled={locked}
                  title={
                    quantityWon > 0
                      ? `${quantityWon} already won: set its weight to 0 to stop new wins instead.`
                      : lines.length <= 1
                        ? "A campaign needs at least one prize"
                        : "Remove prize"
                  }
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden />
                </CxButton>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <CxBar percent={share} />
                <span className={cn(cxText.caption, "tabular-nums")}>
                  <b className="font-bold text-cx-ink">{share}%</b> of wins
                </span>
              </div>

              {quantityWon > 0 && (
                <p className={cn(hintClass, "tabular-nums")}>
                  {quantityWon} of {line.quantity} already won
                  {isLiveCampaign
                    ? `. Quantity can't go below ${quantityWon}.`
                    : "."}
                </p>
              )}
              {stock !== null && Number(line.quantity) > stock && (
                <Warning>
                  Only {stock} in stock for this reward — lower the quantity or
                  add stock in the Reward Library.
                </Warning>
              )}
              {template?.category === "voucher" &&
                (template.filledValuesCount ?? 0) < line.quantity && (
                  <Warning>
                    {template.filledValuesCount ?? 0} voucher codes are ready,
                    {` ${line.quantity} are needed.`}
                  </Warning>
                )}
            </li>
          );
        })}
      </ul>

      {lines.length > 0 && (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-cx-md bg-cx-sunken px-4 py-3 text-[13px] leading-5 text-cx-ink-muted">
          <span className="tabular-nums">
            <b className="font-bold text-cx-ink">{totalPrizeQuantity(lines)}</b>{" "}
            prizes across {lines.length}{" "}
            {lines.length === 1 ? "reward" : "rewards"}
          </span>
          <span>
            Weights are relative: each share is its weight divided by the total.
          </span>
        </div>
      )}
    </StepPanel>
  );
}
