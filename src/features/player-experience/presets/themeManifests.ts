import {
  themeManifestSchema,
  type ThemeManifest,
  type ThemedTemplateId,
} from "../domain/themeManifest";

// The theme.json of every themed template (themes/<id>/theme.json), read at build time and
// checked against the schema. Pure data: the assets they name are resolved to URLs by
// theme/themeAssets.ts, which only the runtime and the Studio import.
//
// A manifest that does not pass the schema is left out — its template then looks like the
// classic one — and its errors are kept for themes.test.ts, which fails on any of them: a
// broken theme never reaches a player page, and never goes unnoticed either.

const RAW = import.meta.glob<unknown>("../themes/*/theme.json", {
  eager: true,
  import: "default",
});

export const THEME_MANIFEST_ERRORS: string[] = [];

function load(): Readonly<Partial<Record<ThemedTemplateId, ThemeManifest>>> {
  const manifests: Partial<Record<ThemedTemplateId, ThemeManifest>> = {};
  for (const [path, raw] of Object.entries(RAW)) {
    const folder = path.split("/").at(-2) ?? "";
    const parsed = themeManifestSchema.safeParse(raw);
    if (!parsed.success) {
      THEME_MANIFEST_ERRORS.push(
        ...parsed.error.issues.map(
          (issue) => `${folder}: ${issue.path.join(".")} — ${issue.message}`,
        ),
      );
      continue;
    }
    // The folder is the id: one place to look for a theme's files.
    if (parsed.data.id !== folder) {
      THEME_MANIFEST_ERRORS.push(
        `${folder}: id "${parsed.data.id}" does not match its folder`,
      );
      continue;
    }
    manifests[parsed.data.id] = parsed.data;
  }
  return manifests;
}

export const THEME_MANIFESTS = load();

export function getThemeManifest(
  id: string | null | undefined,
): ThemeManifest | null {
  return id && id in THEME_MANIFESTS
    ? (THEME_MANIFESTS[id as ThemedTemplateId] ?? null)
    : null;
}
