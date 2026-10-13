import React, { useState } from "react";
import { Download } from "lucide-react";

import { exportToCSV } from "../../lib/exportUtils";
import type { ImportMode } from "../../services/inventoryService";
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
  mode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  /** Reads the file and puts its codes in the reward. */
  onImport: (file: File) => Promise<void> | void;
}

// The shape of the file: a Code column (required) and an Index column (optional: the slot).
export const IMPORT_TEMPLATE_ROWS = [
  { Index: 1, Code: "CODE-0001" },
  { Index: 2, Code: "CODE-0002" },
  { Index: 3, Code: "CODE-0003" },
];

const MODES: { id: ImportMode; label: string }[] = [
  { id: "append", label: "Append" },
  { id: "replace", label: "Replace All" },
];

// Import codes from a file: pick the file, say whether to add to the codes or replace them, go.
function ImportBody({
  onClose,
  mode,
  onModeChange,
  onImport,
}: Omit<ImportFileDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);

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
          A CSV or Excel file with one code per row, in a Code column.
        </DialogDescription>
      </DialogHeader>

      <section aria-label="File template" className="space-y-1.5">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-1.5">
                  Index
                </th>
                <th scope="col" className="px-3 py-1.5">
                  Code
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {IMPORT_TEMPLATE_ROWS.map((row) => (
                <tr key={row.Index}>
                  <td className="px-3 py-1.5">{row.Index}</td>
                  <td className="px-3 py-1.5">{row.Code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Index is optional.</span>
          <button
            type="button"
            onClick={() =>
              exportToCSV(IMPORT_TEMPLATE_ROWS, "octoreach_codes_template")
            }
            className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
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
    <DialogContent>
      <ImportBody {...body} onClose={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
);
