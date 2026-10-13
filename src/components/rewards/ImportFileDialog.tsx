import React, { useState } from "react";

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
