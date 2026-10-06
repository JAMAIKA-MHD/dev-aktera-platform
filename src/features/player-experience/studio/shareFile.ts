import { parseExperienceConfig } from "../domain/schema";
import type { ExperienceConfig } from "../domain/types";

// Export and import of a configuration as a JSON file (plan §9.2, Share). An import is
// accepted only when it is a valid configuration as it is (after migration of an older
// version): a file the schema would have to repair is refused, with the reasons, and the
// configuration being edited stays untouched.

export type ImportResult =
  | { ok: true; config: ExperienceConfig }
  | { ok: false; message: string; details: string[] };

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_DETAILS = 5;

export function readImportedConfig(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "This file is not valid JSON.",
      details: [],
    };
  }
  const parsed = parseExperienceConfig(data);
  if (parsed.recovered) {
    return {
      ok: false,
      message:
        "This file is not a Player Experience configuration, or it is damaged. Nothing was changed.",
      details: parsed.issues.slice(0, MAX_DETAILS),
    };
  }
  return { ok: true, config: parsed.config };
}

// "player-experience-rentree-zeta-2026-09-23.json": lower case, ASCII, dashes only.
export function exportFileName(name: string | null, date: Date): string {
  const slug = (name ?? "standalone")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const day = date.toISOString().slice(0, 10);
  return `player-experience-${slug || "campaign"}-${day}.json`;
}

export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
