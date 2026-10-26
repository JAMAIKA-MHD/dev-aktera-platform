import React, { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import {
  describeExpiry,
  policyFromReward,
  policyToStored,
  type ExpiryPolicyForm,
  type StoredExpiry,
} from "../../lib/expiryPolicy";
import { ExpiryPolicyFields } from "./ExpiryPolicyFields";

interface RewardExpiryPanelProps {
  expiresAt: string | null | undefined;
  expiryDays: number | null | undefined;
  /** False for a read-only viewer. */
  canEdit: boolean;
  /** Saves the new setting; throws an Error with a readable message when it cannot. */
  onSave: (expiry: StoredExpiry) => Promise<void>;
}

// How the codes of the open reward expire, and the way to change it without leaving the codes.
// The list of codes below follows as soon as the new setting is saved.
export const RewardExpiryPanel: React.FC<RewardExpiryPanelProps> = ({
  expiresAt,
  expiryDays,
  canEdit,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ExpiryPolicyForm>(() =>
    policyFromReward({ expiresAt, expiryDays }),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const startEditing = () => {
    // Start from what is saved now, not from an older edit.
    setForm(policyFromReward({ expiresAt, expiryDays }));
    setError(null);
    setSaved(false);
    setEditing(true);
  };

  const save = async () => {
    const result = policyToStored(form);
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        expiresAt: result.expiresAt,
        expiryDays: result.expiryDays,
      });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The expiry could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="Reward expiry"
      className="mx-6 mt-4 space-y-3 rounded-2xl border border-card-border bg-card-bg-subtle p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs text-brand-text">
          <CalendarClock
            className="h-4 w-4 shrink-0 text-emerald-500"
            aria-hidden="true"
          />
          <span className="font-black uppercase tracking-wider text-brand-textMuted">
            Expiry
          </span>
          <strong>{describeExpiry({ expiresAt, expiryDays })}</strong>
        </p>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-xl border border-card-border bg-card-bg px-3 py-1.5 text-xs font-bold text-brand-text transition-colors hover:bg-card-bg-subtle"
          >
            Change expiry
          </button>
        )}
      </div>

      {saved && !editing && (
        <p role="status" className="text-[11px] text-emerald-500">
          Expiry updated. Codes without a date of their own follow it; a code
          already given keeps its deadline.
        </p>
      )}

      {editing && (
        <div className="space-y-3">
          <ExpiryPolicyFields
            value={form}
            onChange={setForm}
            disabled={saving}
          />
          {error && (
            <p role="alert" className="text-xs font-bold text-red-500">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-brand-textMuted hover:text-brand-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-black text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving..." : "Save expiry"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
