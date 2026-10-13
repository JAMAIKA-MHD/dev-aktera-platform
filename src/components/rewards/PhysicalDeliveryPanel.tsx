import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  DELIVERY_EXPORT_COLUMNS,
  buildDeliveryExportRows,
  filterDeliveryRows,
  type DeliveryExportScope,
} from "../../lib/codeExport";
import { ExportFileDialog, type ExportedSummary } from "./ExportFileDialog";
import {
  fetchPhysicalWinners,
  setDeliveryStatus,
} from "../../services/deliveryService";
import type { DeliveryStatus, PhysicalWinner } from "../../types";

interface PhysicalDeliveryPanelProps {
  organizationId: string | null;
  /** The physical reward (prize template) whose winners are listed. */
  templateId: string;
  /** False for a read-only viewer. */
  canEdit: boolean;
}

const LABELS: Record<DeliveryStatus, string> = {
  not_delivered: "Not delivered",
  delivered: "Delivered",
};

const winnerLabel = (winner: PhysicalWinner) =>
  winner.participantName || winner.phoneNumber || "Anonymous winner";

// Winners of a physical reward and whether the brand handed it over. The brand does the
// delivery; AKTERA only records the status (the server checks who may change it).
export const PhysicalDeliveryPanel: React.FC<PhysicalDeliveryPanelProps> = ({
  organizationId,
  templateId,
  canEdit,
}) => {
  const [winners, setWinners] = useState<PhysicalWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setWinners([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setWinners(await fetchPhysicalWinners(organizationId, templateId));
    } catch {
      setLoadError("We could not load the winners. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (entryId: string, changes: Partial<PhysicalWinner>) =>
    setWinners((current) =>
      current.map((w) => (w.entryId === entryId ? { ...w, ...changes } : w)),
    );

  const exportRows = useMemo(() => buildDeliveryExportRows(winners), [winners]);
  const handleExported = ({ count, fileName }: ExportedSummary) =>
    setExported(
      `Exported ${count} ${count === 1 ? "winner" : "winners"} to ${fileName}.`,
    );

  const handleChange = async (winner: PhysicalWinner, next: DeliveryStatus) => {
    const previous = { ...winner };
    setRowErrors((current) => {
      const { [winner.entryId]: _removed, ...rest } = current;
      return rest;
    });
    setPending((current) => new Set(current).add(winner.entryId));
    patch(winner.entryId, {
      deliveryStatus: next,
      deliveredAt: next === "delivered" ? new Date().toISOString() : null,
    });
    try {
      await setDeliveryStatus(winner.entryId, next);
    } catch (error) {
      patch(winner.entryId, {
        deliveryStatus: previous.deliveryStatus,
        deliveredAt: previous.deliveredAt,
      });
      setRowErrors((current) => ({
        ...current,
        [winner.entryId]:
          error instanceof Error
            ? error.message
            : "The delivery status could not be updated.",
      }));
    } finally {
      setPending((current) => {
        const copy = new Set(current);
        copy.delete(winner.entryId);
        return copy;
      });
    }
  };

  return (
    <section
      aria-label="Winners and delivery"
      className="mx-6 mt-4 space-y-3 rounded-2xl border border-card-border bg-card-bg-subtle p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-brand-text">
            Winners &amp; delivery
          </h4>
          <p className="text-xs text-brand-textMuted">
            You handle delivery. AKTERA only records the status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExporting(true)}
          disabled={loading || winners.length === 0}
          className="flex items-center gap-1.5 rounded-xl border border-card-border bg-card-bg px-3 py-1.5 text-xs font-bold text-brand-text transition-colors hover:bg-card-bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
          Export winners
        </button>
      </div>

      {exported && (
        <p role="status" className="text-[11px] text-emerald-500">
          {exported}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-brand-textMuted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading winners...
        </div>
      ) : loadError ? (
        <div role="alert" className="text-xs text-red-500">
          {loadError}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      ) : winners.length === 0 ? (
        <p className="py-3 text-xs text-brand-textMuted">
          No winners yet for this reward.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-card-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-card-bg text-[10px] font-black uppercase text-brand-textMuted">
              <tr>
                <th className="px-3 py-2">Winner</th>
                <th className="px-3 py-2">Won on</th>
                <th className="px-3 py-2">Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {winners.map((winner) => (
                <tr key={winner.entryId}>
                  <td className="px-3 py-2">
                    <span className="font-bold text-brand-text">
                      {winnerLabel(winner)}
                    </span>
                    {winner.participantName && winner.phoneNumber && (
                      <span className="block text-brand-textMuted">
                        {winner.phoneNumber}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-brand-textMuted">
                    {new Date(winner.wonAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <select
                        aria-label={`Delivery status of ${winnerLabel(winner)}`}
                        value={winner.deliveryStatus}
                        disabled={pending.has(winner.entryId)}
                        onChange={(event) =>
                          void handleChange(
                            winner,
                            event.target.value as DeliveryStatus,
                          )
                        }
                        className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-brand-text focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                      >
                        <option value="not_delivered">
                          {LABELS.not_delivered}
                        </option>
                        <option value="delivered">{LABELS.delivered}</option>
                      </select>
                    ) : (
                      <span className="font-bold text-brand-text">
                        {LABELS[winner.deliveryStatus]}
                      </span>
                    )}
                    {rowErrors[winner.entryId] && (
                      <span role="alert" className="mt-1 block text-red-500">
                        {rowErrors[winner.entryId]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExportFileDialog<DeliveryExportScope>
        open={exporting}
        onOpenChange={setExporting}
        title="Export the winners"
        description="A spreadsheet with one row per winner of this reward, and whether you delivered it."
        fileBaseName={`octoreach_delivery_${new Date().toISOString().split("T")[0]}`}
        sheetName="Winners"
        columns={DELIVERY_EXPORT_COLUMNS}
        rows={exportRows}
        scopes={[
          { id: "all", label: "Every winner" },
          { id: "not_delivered", label: "Not delivered" },
          { id: "delivered", label: "Delivered" },
        ]}
        defaultScope="all"
        filterRows={filterDeliveryRows}
        notes={[
          "A name or a phone number that starts with = + - or @ gets an apostrophe in front, so a spreadsheet does not run it as a formula.",
          "Dates are written YYYY-MM-DD, in Algeria time.",
        ]}
        onExported={handleExported}
      />
    </section>
  );
};
