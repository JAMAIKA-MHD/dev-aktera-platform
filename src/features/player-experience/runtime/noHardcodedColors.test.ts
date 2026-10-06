import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guard of rule C5: every color of the player screens comes from the theme variables
// (--xp-*), and transparency from color-mix() on them. A written color would ignore the
// brand, the preset and the dark or light mode.

const RUNTIME = dirname(fileURLToPath(import.meta.url));

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILITIES =
  "text|bg|border(?:-[xytrblse])?|ring(?:-offset)?|outline|divide|from|via|to|fill|stroke|shadow|decoration|accent|caret|placeholder";

interface Rule {
  name: string;
  pattern: RegExp;
}

const RULES: readonly Rule[] = [
  {
    name: "hex color: use a theme variable, var(--xp-…)",
    pattern:
      /(?<![\w&/-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
  },
  {
    name: "color function: use var(--xp-…), or color-mix() on it for transparency",
    pattern: /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g,
  },
  {
    name: "Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
    pattern: new RegExp(
      `(?<![\\w-])(?:${COLOR_UTILITIES})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?![\\w-])`,
      "g",
    ),
  },
  {
    name: "named color: use a theme variable, var(--xp-…)",
    pattern: /["'](?:white|black)["']/g,
  },
];

function findViolations(source: string): string[] {
  return RULES.flatMap((rule) =>
    [...source.matchAll(rule.pattern)].map(
      (match) => `${match[0]} — ${rule.name}`,
    ),
  );
}

function runtimeFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return runtimeFiles(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)
      ? [path]
      : [];
  });
}

describe("no hard-coded colors in the runtime", () => {
  it("finds no written color in runtime/", () => {
    const violations = runtimeFiles(RUNTIME).flatMap((file) =>
      findViolations(readFileSync(file, "utf8")).map(
        (violation) => `${relative(RUNTIME, file)}: ${violation}`,
      ),
    );
    expect(violations).toEqual([]);
  });

  it("catches what the prototype used to do", () => {
    const prototype = `
      <header className="border-slate-800/60 bg-slate-900/40 text-white" />
      <div className="text-amber-500 dark:border-amber-700/40 from-violet-500" />
      <div style={{ backgroundColor: "#0A1120", color: 'white' }} />
      <div style={{ backgroundImage: "linear-gradient(rgba(10, 17, 32, 0.82), #fff)" }} />`;
    expect(findViolations(prototype)).toEqual([
      "#0A1120 — hex color: use a theme variable, var(--xp-…)",
      "#fff — hex color: use a theme variable, var(--xp-…)",
      "rgba( — color function: use var(--xp-…), or color-mix() on it for transparency",
      "border-slate-800 — Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
      "bg-slate-900 — Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
      "text-white — Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
      "text-amber-500 — Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
      "border-amber-700 — Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
      "from-violet-500 — Tailwind palette color: use a theme variable, text-[var(--xp-…)]",
      "'white' — named color: use a theme variable, var(--xp-…)",
    ]);
  });

  it("allows the theme variables, color-mix() and the colorless keywords", () => {
    const allowed = `
      <p className="text-[var(--xp-text-muted)] border-transparent bg-transparent fill-current" />
      <div style={{ color: "var(--xp-on-primary)", borderColor: "color-mix(in srgb, var(--xp-primary) 40%, transparent)" }} />
      <div className="border-[color-mix(in_srgb,var(--xp-text)_12%,transparent)] text-balance text-start" />
      <a href="#terms" className="text-current stroke-current" />`;
    expect(findViolations(allowed)).toEqual([]);
  });
});
