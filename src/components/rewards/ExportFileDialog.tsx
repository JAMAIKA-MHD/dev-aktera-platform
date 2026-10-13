import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

import type { ExportColumn } from "../../lib/codeExport";
import { exportToCSV, exportToExcel } from "../../lib/exportUtils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export type ExportFormat = "csv" | "xlsx";
type Row = Record<string, string | number>;

export interface ExportScopeOption<S extends string> {
  id: S;
  label: string;
}

export interface ExportedSummary {
  count: number;
  fileName: string;
  format: ExportFormat;
}

interface ExportFileDialogProps<S extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The file name without its extension. */
  fileBaseName: string;
  sheetName?: string;
  /** What each column holds: the file explained before it is downloaded. */
  columns: ExportColumn[];
  /** Every row; the choice of rows below narrows them. */
  rows: Row[];
  scopes: ExportScopeOption<S>[];
  defaultScope: S;
  filterRows: (rows: Row[], scope: S) => Row[];
  /** Things worth knowing about this file (shown under the columns). */
  notes?: string[];
  onExported?: (summary: ExportedSummary) => void;
}

const PREVIEW_ROWS = 3;
const FORMATS: {
  id: ExportFormat;
  label: string;
  hint: string;
  extension: string;
  icon: typeof FileText;
}[] = [
  {
    id: "csv",
    label: "CSV",
    hint: "Plain text, comma-separated. Opens in Excel and Google Sheets.",
    extension: "csv",
    icon: FileText,
  },
  {
    id: "xlsx",
    label: "Excel",
    hint: "A workbook (.xlsx) with one sheet and sized columns.",
    extension: "xlsx",
    icon: FileSpreadsheet,
  },
];

const choiceClass = (selected: boolean) =>
  `flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
    selected
      ? "border-emerald-500 bg-emerald-500/10"
      : "border-border bg-background hover:bg-muted"
  }`;

// The window shown before a file is downloaded: what the file is, which rows go in, in which
// format, what every column holds and what the first rows look like. The Export button then
// downloads exactly what was shown.
function ExportBody<S extends string>({
  onClose,
  title,
  description,
  fileBaseName,
  sheetName = "Export",
  columns,
  rows,
  scopes,
  defaultScope,
  filterRows,
  notes = [],
  onExported,
}: Omit<ExportFileDialogProps<S>, "open" | "onOpenChange"> & {
  onClose: () => void;
}) {
  const [scope, setScope] = useState<S>(defaultScope);
  const [format, setFormat] = useState<ExportFormat>("csv");

  const selected = useMemo(
    () => filterRows(rows, scope),
    [filterRows, rows, scope],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        scopes.map((option) => [option.id, filterRows(rows, option.id).length]),
      ) as Record<S, number>,
    [filterRows, rows, scopes],
  );

  const extension = FORMATS.find((f) => f.id === format)!.extension;
  const fileName = `${fileBaseName}.${extension}`;
  const headers = columns.map((column) => column.name);
  const preview = selected.slice(0, PREVIEW_ROWS);
  const nothing = selected.length === 0;

  const download = () => {
    if (nothing) return;
    if (format === "xlsx") exportToExcel(selected, fileBaseName, sheetName);
    else exportToCSV(selected, fileBaseName);
    onExported?.({ count: selected.length, fileName, format });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rows to export
          </legend>
          <div className="flex flex-wrap gap-2">
            {scopes.map((option) => (
              <label
                key={option.id}
                className={choiceClass(scope === option.id)}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value={option.id}
                  checked={scope === option.id}
                  onChange={() => setScope(option.id)}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>
                  {option.label}{" "}
                  <span className="text-muted-foreground">
                    ({counts[option.id]})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Format
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMATS.map((option) => {
              const Icon = option.icon;
              return (
                <label
                  key={option.id}
                  className={choiceClass(format === option.id)}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={option.id}
                    checked={format === option.id}
                    onChange={() => setFormat(option.id)}
                    className="mt-1 accent-emerald-600"
                  />
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Icon className="size-4" aria-hidden />
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <section aria-label="Columns of the file" className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What the file contains
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Column
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    What it holds
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {columns.map((column) => (
                  <tr key={column.name}>
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2 align-top font-mono font-semibold"
                    >
                      {column.name}
                    </th>
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {column.meaning}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono">
                      {column.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {notes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Preview of the file" className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </h3>
          {nothing ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Nothing to export with this choice of rows.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} scope="col" className="px-3 py-1.5">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {headers.map((header) => (
                        <td
                          key={header}
                          className="max-w-48 truncate px-3 py-1.5"
                          title={String(row[header] ?? "")}
                        >
                          {String(row[header] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          <span className="font-mono">{fileName}</span> · {selected.length}{" "}
          {selected.length === 1 ? "row" : "rows"} · {columns.length} columns
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={download}
            disabled={nothing}
            data-autofocus
          >
            <Download aria-hidden />
            Export {selected.length} {selected.length === 1 ? "row" : "rows"} as{" "}
            {format === "csv" ? "CSV" : "Excel"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function ExportFileDialog<S extends string>(
  props: ExportFileDialogProps<S>,
) {
  const { open, onOpenChange, ...body } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <ExportBody {...body} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
