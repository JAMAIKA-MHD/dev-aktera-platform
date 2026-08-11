import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface CampaignExportRow {
  "Campaign ID": string;
  "Campaign Name": string;
  "Total Entries": number;
  "Total Winners": number;
  "Win Rate (%)": string;
  "Allocated Prizes": number;
  "Quiz Pass Rate (%)"?: string;
  "Coupon Confirmation Rate (%)"?: string;
}

export interface EntryExportRow {
  "Entry ID": string;
  "Campaign Name": string;
  "Participant Phone": string;
  "Participant Name": string;
  Status: string;
  "Quiz Status": string;
  "Coupon Code": string;
  "Coupon Confirmed": string;
  "Participation Date": string;
}

/**
 * Exports data to CSV format using PapaParse
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) return;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data to Excel (.xlsx) format using XLSX (SheetJS)
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "Analytics Report",
) {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths dynamically
  const colWidths = Object.keys(data[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? "").length),
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

/**
 * Parses CSV file using PapaParse
 */
export function parseCSVFile<T = Record<string, string>>(
  file: File,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn("CSV Parse Warnings/Errors:", results.errors);
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parses Excel (.xlsx/.xls) file using XLSX
 */
export async function parseExcelFile<T = Record<string, string>>(
  file: File,
): Promise<T[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];
  const json = XLSX.utils.sheet_to_json<T>(worksheet, { defval: "" });
  return json;
}
