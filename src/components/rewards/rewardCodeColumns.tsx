// Columns of the codes table of a reward (shadcn data table). The cells are components of this
// module, not functions created on each render: a cell that changed identity would be mounted
// again on every keystroke, and the code being typed would lose the focus. What the cells need
// from the page (saving a code, the reward's expiry, the user's rights) comes through a context.
import { createContext, useContext } from "react";
import type { CellContext, ColumnDef, Row } from "@tanstack/react-table";
import { Lock, Sparkles, Trash2 } from "lucide-react";

import type { TemplateItemRow } from "../../services/inventoryService";
import type { PrizeTemplate } from "../../types";
import { CodeExpiryCell } from "./CodeExpiryCell";

export interface RewardCodesContextValue {
  category: PrizeTemplate["category"];
  /** The reward's own date, for the codes that have none. */
  inheritedExpiresAt: string | null;
  /** The reward's validity period after delivery, in days. */
  periodDays: number | null;
  /** False for a read-only viewer. */
  canEdit: boolean;
  /** The code is being typed: keep what is shown in step. */
  onEdit: (id: string, value: string) => void;
  /** The field lost the focus: save the code. */
  onCommit: (id: string, value: string) => void;
  onClear: (id: string) => void;
  onGenerate: (id: string) => void;
  onChangeExpiry: (id: string, expiresAt: string | null) => Promise<boolean>;
}

export const RewardCodesContext = createContext<RewardCodesContextValue | null>(
  null,
);

function useCodes() {
  const value = useContext(RewardCodesContext);
  if (!value) throw new Error("RewardCodesContext is missing.");
  return value;
}

const isRedeemed = (item: TemplateItemRow) =>
  Boolean(item.is_redeemed || item.is_used);
const hasCode = (item: TemplateItemRow) =>
  Boolean(item.item_value && item.item_value.trim().length > 0);

export type CodeRowState = "redeemed" | "prepared" | "empty";
export const codeRowState = (item: TemplateItemRow): CodeRowState =>
  isRedeemed(item) ? "redeemed" : hasCode(item) ? "prepared" : "empty";

/** A used code is marked on its whole row, as before. */
export const codeRowClassName = (item: TemplateItemRow) =>
  isRedeemed(item)
    ? "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-l-red-500"
    : undefined;

/** The search box: the code or its number. */
export function matchesCodeSearch(
  row: Row<TemplateItemRow>,
  _columnId: string,
  filterValue: string,
): boolean {
  const query = String(filterValue ?? "")
    .trim()
    .toLowerCase();
  if (!query) return true;
  const item = row.original;
  return (
    (item.item_value || "").toLowerCase().includes(query) ||
    String(item.item_index).includes(query)
  );
}

function NumberCell({ row }: CellContext<TemplateItemRow, unknown>) {
  return (
    <span className="font-mono text-xs font-bold text-brand-textMuted">
      {row.original.item_index}
    </span>
  );
}

function ValueCell({ row }: CellContext<TemplateItemRow, unknown>) {
  const { canEdit, onEdit, onCommit } = useCodes();
  const item = row.original;
  const redeemed = isRedeemed(item);
  return (
    <input
      type="text"
      aria-label={`Code ${item.item_index}`}
      disabled={redeemed || !canEdit}
      value={item.item_value ?? ""}
      placeholder={redeemed ? "Redeemed by player" : "Click to enter code..."}
      onChange={(event) => onEdit(item.id, event.target.value)}
      onBlur={(event) => onCommit(item.id, event.target.value)}
      className={`w-full min-w-40 font-mono text-xs font-bold rounded-lg px-2 py-1 outline-none transition-all ${
        redeemed
          ? "bg-red-500/15 text-red-500 dark:text-red-400 font-black line-through cursor-not-allowed border border-red-500/40"
          : "bg-transparent border-none text-brand-text focus:bg-card-bg focus:ring-1 focus:ring-emerald-500"
      }`}
    />
  );
}

function ExpiresCell({ row }: CellContext<TemplateItemRow, unknown>) {
  const { inheritedExpiresAt, periodDays, canEdit, onChangeExpiry } =
    useCodes();
  const item = row.original;
  return (
    <CodeExpiryCell
      index={item.item_index}
      value={item.expires_at}
      inheritedValue={inheritedExpiresAt}
      deliveredValue={item.redemption_expires_at}
      periodDays={periodDays}
      hasCode={hasCode(item)}
      locked={isRedeemed(item) || !canEdit}
      onChange={(expiresAt) => onChangeExpiry(item.id, expiresAt)}
    />
  );
}

function StatusCell({ row }: CellContext<TemplateItemRow, unknown>) {
  const item = row.original;
  const state = codeRowState(item);
  if (state === "redeemed") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40"
        title={`Redeemed at: ${item.redeemed_at || "N/A"}`}
      >
        <Lock className="w-3 h-3 text-red-500" aria-hidden="true" />
        Redeemed
      </span>
    );
  }
  return state === "prepared" ? (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
      Prepared
    </span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Empty
    </span>
  );
}

function ActionsCell({ row }: CellContext<TemplateItemRow, unknown>) {
  const { canEdit, onClear, onGenerate } = useCodes();
  const item = row.original;
  const state = codeRowState(item);
  if (!canEdit || state === "redeemed") return null;
  return state === "empty" ? (
    <button
      type="button"
      onClick={() => onGenerate(item.id)}
      aria-label={`Generate a code for slot ${item.item_index}`}
      className="text-purple-400 hover:text-purple-300 p-1 cursor-pointer"
      title="Generate 8-char random alphanumeric code"
    >
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => onClear(item.id)}
      aria-label={`Clear code ${item.item_index}`}
      className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
      title="Clear code"
    >
      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}

// The expiry date counts for sorting: the code's own, else the deadline fixed at delivery.
const expirySortKey = (item: TemplateItemRow) =>
  item.expires_at || item.redemption_expires_at || "";

const STATUS_ORDER: Record<CodeRowState, string> = {
  prepared: "1",
  empty: "2",
  redeemed: "3",
};

const numberColumn: ColumnDef<TemplateItemRow, unknown> = {
  id: "index",
  header: "#",
  accessorFn: (item) => item.item_index,
  cell: NumberCell,
  meta: { className: "w-16" },
};

const codeColumn: ColumnDef<TemplateItemRow, unknown> = {
  id: "code",
  header: "Voucher / Unique Code",
  accessorFn: (item) => item.item_value ?? "",
  cell: ValueCell,
  // The order must not change while a code is typed.
  enableSorting: false,
};

const expiresColumn: ColumnDef<TemplateItemRow, unknown> = {
  id: "expires",
  header: "Expires",
  accessorFn: expirySortKey,
  cell: ExpiresCell,
  meta: { className: "w-64" },
};

const statusColumn: ColumnDef<TemplateItemRow, unknown> = {
  id: "status",
  header: "Status",
  accessorFn: (item) => STATUS_ORDER[codeRowState(item)],
  cell: StatusCell,
  meta: { className: "w-36 text-center" },
};

const actionsColumn: ColumnDef<TemplateItemRow, unknown> = {
  id: "actions",
  header: "Actions",
  cell: ActionsCell,
  enableSorting: false,
  meta: { className: "w-24 text-right" },
};

/** A digital reward has an expiry column; a physical one has not. */
export const voucherCodeColumns = [
  numberColumn,
  codeColumn,
  expiresColumn,
  statusColumn,
  actionsColumn,
];
export const physicalCodeColumns = [
  numberColumn,
  codeColumn,
  statusColumn,
  actionsColumn,
];
