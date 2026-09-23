import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { labelClass } from "./Field";

// A list the brand builds (prize chips, wheel segments, legal links): add, remove, and move
// with buttons — no drag and drop in the MVP, so it works the same with a keyboard, a mouse
// or a finger. The bounds are enforced here, so a panel cannot produce a list the schema
// would refuse.

export interface ListEditorProps<T> {
  label: string;
  items: readonly T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, index: number, update: (item: T) => void) => ReactNode;
  itemLabel: (item: T, index: number) => string; // for the buttons' accessible names
  getKey: (item: T) => string;
  min?: number;
  max?: number;
  addLabel?: string;
  path?: string;
}

export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

const iconButton =
  "flex size-9 items-center justify-center rounded-lg text-brand-text-muted transition hover:bg-card-hover hover:text-brand-text active:scale-90 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:pointer-events-none disabled:opacity-30";

export function ListEditor<T>({
  label,
  items,
  onChange,
  createItem,
  renderItem,
  itemLabel,
  getKey,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  addLabel = "Add",
  path,
}: ListEditorProps<T>) {
  const update = (index: number) => (item: T) =>
    onChange(items.map((current, at) => (at === index ? item : current)));

  return (
    <div className="space-y-2" data-studio-path={path}>
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-brand-text-muted">
          {items.length}
          {Number.isFinite(max) ? ` / ${max}` : ""}
        </span>
      </div>
      <ol className="space-y-2">
        {items.map((item, index) => {
          const name = itemLabel(item, index);
          return (
            <li
              key={getKey(item)}
              className="rounded-2xl border border-card-border bg-card-bg p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-1">
                <span className="mr-auto truncate text-xs font-bold text-brand-text">
                  {name}
                </span>
                <button
                  type="button"
                  aria-label={`Move ${name} up`}
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(items, index, index - 1))}
                  className={iconButton}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${name} down`}
                  disabled={index === items.length - 1}
                  onClick={() => onChange(moveItem(items, index, index + 1))}
                  className={iconButton}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  disabled={items.length <= min}
                  title={
                    items.length <= min ? `At least ${min} required` : undefined
                  }
                  onClick={() =>
                    onChange(items.filter((_, at) => at !== index))
                  }
                  className={`${iconButton} hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-500/10`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              {renderItem(item, index, update(index))}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={items.length >= max}
        onClick={() => onChange([...items, createItem()])}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-card-border text-sm font-bold text-blue-600 transition hover:border-blue-400 hover:bg-blue-50 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Plus className="size-4" aria-hidden />
        {items.length >= max ? `Maximum ${max}` : addLabel}
      </button>
    </div>
  );
}
