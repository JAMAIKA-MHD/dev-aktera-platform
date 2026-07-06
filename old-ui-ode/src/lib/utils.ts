/**
 * DZENGAGE — Shared Utility Functions
 * ====================================
 * Pure helper functions used across the app: slug generation, date
 * formatting, CSV export, and campaign-status derivation. None of these
 * depend on React or Supabase, so they are safe to unit-test in isolation
 * and to import from any layer (UI, hooks, edge functions, scripts).
 */

/* ------------------------------------------------------------------ */
/* generateSlug                                                        */
/* ------------------------------------------------------------------ */

/**
 * Convert a free-text name into a URL-safe slug.
 *
 * Rules:
 *   - Lowercase the input.
 *   - Replace any run of non-alphanumeric characters with a single hyphen.
 *   - Trim leading/trailing hyphens.
 *   - Collapse the accented characters used in French/Arabic names
 *     (common in the Algerian market) into their ASCII equivalents so
 *     slugs stay readable in browsers and URLs.
 *
 * Example: "Promo Été 2024!" → "promo-ete-2024"
 *
 * @param name - The human-readable name to slugify (e.g. a campaign name).
 * @returns A lowercase, hyphen-separated, URL-safe slug.
 */
export function generateSlug(name: string): string {
  return name
    .normalize('NFD') // Decompose accented chars into base + diacritic.
    .replace(/[\u0300-\u036f]/g, '') // Strip the diacritic marks.
    .toLowerCase() // Lowercase for URL stability.
    .trim() // Remove surrounding whitespace.
    .replace(/[^a-z0-9\s-]/g, '') // Drop anything that's not a letter, digit, space, or hyphen.
    .replace(/[\s-]+/g, '-') // Collapse runs of spaces/hyphens into a single hyphen.
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens.
}

/* ------------------------------------------------------------------ */
/* formatDate                                                          */
/* ------------------------------------------------------------------ */

/**
 * Format an ISO date string as DD/MM/YYYY.
 *
 * This is the standard date format used in Algeria (and much of the
 * Francophone world). The function is defensive: it returns an empty
 * string for null/empty input rather than throwing, so it can be used
 * directly in JSX without a guard.
 *
 * Example: "2024-06-30T14:00:00Z" → "30/06/2024"
 *
 * @param dateStr - An ISO 8601 date string (or null/empty).
 * @returns The date formatted as DD/MM/YYYY, or "" if input is falsy.
 */
export function formatDate(dateStr: string): string {
  // Guard against null/undefined/empty — return empty string for safe rendering.
  if (!dateStr) return '';

  // Parse the ISO string into a Date object. Invalid input yields NaN.
  const date = new Date(dateStr);

  // If parsing failed (Invalid Date), bail out with an empty string.
  if (Number.isNaN(date.getTime())) return '';

  // Extract day, month, year and zero-pad day/month to 2 digits.
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed.
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/* ------------------------------------------------------------------ */
/* exportToCSV                                                         */
/* ------------------------------------------------------------------ */

/**
 * Export an array of row objects to a downloadable CSV file.
 *
 * Behavior:
 *   - The first object's keys become the header row (column order preserved).
 *   - Values containing commas, quotes, or newlines are wrapped in double
 *     quotes with internal quotes escaped per RFC 4180.
 *   - A UTF-8 BOM is prepended so Excel opens the file with correct encoding
 *     (important for French/Arabic characters in the Algerian market).
 *   - The file is offered as a download via a temporary <a> element and
 *     the blob URL is revoked immediately after.
 *
 * @param entries   - Array of flat record objects to export (e.g. Entry[]).
 * @param filename  - The download filename, with or without .csv extension.
 */
export function exportToCSV(entries: Record<string, unknown>[], filename: string): void {
  // Nothing to export — exit early to avoid creating an empty/invalid file.
  if (!entries || entries.length === 0) return;

  // Ensure the filename ends with .csv for correct OS association.
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  /**
   * Escape a single cell value per RFC 4180:
   * wrap in double quotes and double any internal double quotes.
   */
  const escapeCell = (value: unknown): string => {
    // Coerce null/undefined to empty string so the cell is blank, not "null".
    const str = value == null ? '' : String(value);

    // If the value contains a comma, double quote, or newline, it must be quoted.
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build the header row from the keys of the first object.
  const headers = Object.keys(entries[0]);
  const headerRow = headers.map(escapeCell).join(',');

  // Build one CSV row per entry, mapping each header to its value.
  const dataRows = entries.map((entry) =>
    headers.map((header) => escapeCell(entry[header])).join(','),
  );

  // Join all rows with CRLF (the RFC 4180 line separator).
  const csvContent = [headerRow, ...dataRows].join('\r\n');

  // Prepend a UTF-8 BOM so spreadsheet apps decode non-ASCII correctly.
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });

  // Create an object URL and trigger a download via a temporary anchor.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.style.display = 'none'; // Keep the anchor off-screen.
  document.body.appendChild(link);
  link.click();

  // Clean up the DOM node and release the blob URL to avoid memory leaks.
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* getCampaignStatus                                                   */
/* ------------------------------------------------------------------ */

/**
 * Derive the effective status of a campaign from its stored status and dates.
 *
 * The stored `status` field is the source of truth for admin-controlled
 * states (draft, paused, archived), but `active` and `ended` are
 * *time-derived*: a campaign that is still marked 'active' but whose
 * `end_date` has passed should be reported as 'ended' so the UI can
 * stop accepting entries and show analytics instead.
 *
 * Resolution order:
 *   1. 'draft'     → draft (not yet published).
 *   2. 'paused'    → paused (temporarily halted by an admin).
 *   3. 'archived'  → archived (soft-deleted / hidden).
 *   4. 'active' + before start_date → 'draft' (scheduled, not yet live).
 *   5. 'active' + after end_date    → 'ended' (window closed).
 *   6. 'active' + within window      → 'active' (live and playable).
 *   7. 'ended'                        → 'ended' (explicitly closed).
 *
 * @param campaign - A campaign-like object with `status`, `start_date`, `end_date`.
 * @returns The effective status: 'draft' | 'active' | 'ended' | 'archived'.
 */
interface CampaignStatusInput {
  status: string;
  start_date: string;
  end_date: string;
}

export function getCampaignStatus(campaign: CampaignStatusInput): string {
  // Admin-controlled states are returned as-is — they take precedence
  // over the time window because an admin explicitly set them.
  if (campaign.status === 'draft') return 'draft';
  if (campaign.status === 'paused') return 'draft'; // Paused is shown as draft (not live).
  if (campaign.status === 'archived') return 'archived';
  if (campaign.status === 'ended') return 'ended';

  // For 'active' campaigns, derive the effective state from the time window.
  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);

  // Scheduled but not yet started → treat as draft (not playable yet).
  if (now < start) return 'draft';

  // The end date has passed → the campaign is over.
  if (now > end) return 'ended';

  // Within the active window → live and playable.
  return 'active';
}
