import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guard of the engine and teaser contracts (plan §8.6, tasks.md T5.1): a mechanic reads only
// the container it is given (never the screen's own size) and the outcome it is handed
// (never a probability, stock or server code of its own, N1).

const GAMES = dirname(fileURLToPath(import.meta.url));

interface Rule {
  name: string;
  pattern: RegExp;
}

const RULES: readonly Rule[] = [
  {
    name: "window.innerWidth: read the container's own size instead (useElementSize)",
    pattern: /window\.innerWidth/g,
  },
  {
    name: "window.innerHeight: read the container's own size instead (useElementSize)",
    pattern: /window\.innerHeight/g,
  },
  {
    name: "matchMedia: a mechanic never queries the screen, only its container",
    pattern: /\bmatchMedia\(/g,
  },
  {
    name: "vw/vh unit: size from the container (cqw/cqh/cqmin), never the viewport",
    pattern: /(?<![\w-])\d+(?:\.\d+)?(?:vw|vh)(?![\w-])/g,
  },
  {
    name: "services/local import: a mechanic never imports an adapter directly (N1)",
    pattern: /(?:from\s+|import\()\s*["'][^"']*\/services\/local[^"']*["']/g,
  },
];

function findViolations(source: string): string[] {
  return RULES.flatMap((rule) =>
    [...source.matchAll(rule.pattern)].map(
      (match) => `${match[0]} — ${rule.name}`,
    ),
  );
}

function gameFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return gameFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the engine and teaser contract, guarded in runtime/games/", () => {
  it("finds no viewport read and no local adapter import", () => {
    const violations = gameFiles(GAMES).flatMap((file) =>
      findViolations(readFileSync(file, "utf8")).map(
        (violation) => `${relative(GAMES, file)}: ${violation}`,
      ),
    );
    expect(violations).toEqual([]);
  });

  it("catches what a mechanic must never do", () => {
    const violating = `
      const wide = window.innerWidth > 768;
      const tall = window.innerHeight;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const width = "calc(100vw - 2rem)";
      const height = "50vh";
      import { createDemoCouponCode } from "../../services/local/demoDrawEngine";
      const gateway = await import("../../services/local/scriptedParticipationGateway");`;
    expect(findViolations(violating)).toEqual([
      "window.innerWidth — window.innerWidth: read the container's own size instead (useElementSize)",
      "window.innerHeight — window.innerHeight: read the container's own size instead (useElementSize)",
      "matchMedia( — matchMedia: a mechanic never queries the screen, only its container",
      "100vw — vw/vh unit: size from the container (cqw/cqh/cqmin), never the viewport",
      "50vh — vw/vh unit: size from the container (cqw/cqh/cqmin), never the viewport",
      `from "../../services/local/demoDrawEngine" — services/local import: a mechanic never imports an adapter directly (N1)`,
      `import("../../services/local/scriptedParticipationGateway" — services/local import: a mechanic never imports an adapter directly (N1)`,
    ]);
  });

  it("allows the container units and the demo campaign, its own presets", () => {
    const allowed = `
      const width = "min(100cqw, 100cqh)";
      const size = "clamp(4.5rem, 22cqmin, 8rem)";
      import { createDemoCampaign } from "../../presets/demoCampaign";
      import type { CampaignSnapshot } from "../../domain/campaign";`;
    expect(findViolations(allowed)).toEqual([]);
  });
});
