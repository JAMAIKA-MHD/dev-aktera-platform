import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { importTemplateRows } from "../../lib/codeExport";
import { exportToCSV } from "../../lib/exportUtils";
import type { ImportMode } from "../../services/inventoryService";
import type { PrizeTemplate } from "../../types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

interface ImportFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The kind of reward: a Digital Item has an Expires column, a Physical Item has not. */
  category: PrizeTemplate["category"];
  mode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  /** Reads the file and puts its codes in the reward. */
  onImport: (file: File) => Promise<void> | void;
}

const MODES: { id: ImportMode; label: string }[] = [
  { id: "append", label: "Append" },
  { id: "replace", label: "Replace All" },
];

// Import codes from a file: see the structure, pick the file, say whether to add to the codes or
// replace them, go.
function ImportBody({
  onClose,
  category,
  mode,
  onModeChange,
  onImport,
}: Omit<ImportFileDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const rows = useMemo(() => importTemplateRows(category), [category]);
  const columns = Object.keys(rows[0]);

  const start = () => {
    if (!file) return;
    onClose();
    void onImport(file);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import codes</DialogTitle>
        <DialogDescription>
          A CSV or Excel file with one code per row. Keep these columns:
        </DialogDescription>
      </DialogHeader>

      <section aria-label="File template" className="space-y-1.5">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="whitespace-nowrap px-3 py-1.5"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.Index}>
                  {columns.map((column) => (
                    <td key={column} className="whitespace-nowrap px-3 py-1.5">
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Only Code is needed.{" "}
            {category === "voucher" && "Expires: a day, 2026-12-31. "}
            Status and Used on are filled by AKTERA: leave them empty.
          </span>
          <button
            type="button"
            onClick={() => exportToCSV(rows, "octoreach_codes_template")}
            className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            <Download className="size-3.5" aria-hidden />
            Download template
          </button>
        </div>
      </section>

      <Input
        type="file"
        aria-label="File to import"
        accept=".csv,.xlsx,.xls"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      <fieldset className="flex gap-4">
        <legend className="sr-only">Import mode</legend>
        {MODES.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="import-mode"
              value={option.id}
              checked={mode === option.id}
              onChange={() => onModeChange(option.id)}
              className="accent-emerald-600"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={start} disabled={!file}>
          Import
        </Button>
      </DialogFooter>
    </>
  );
}

export const ImportFileDialog: React.FC<ImportFileDialogProps> = ({
  open,
  onOpenChange,
  ...body
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl">
      <ImportBody {...body} onClose={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
);
