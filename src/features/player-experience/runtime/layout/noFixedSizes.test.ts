import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guard of the responsive rules (plan §8.3): the runtime is rendered in an iframe at the
// simulated device's size, so screen variants and fixed pixel sizes would break it.

const RUNTIME = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface Rule {
  name: string;
  pattern: RegExp;
}

const RULES: readonly Rule[] = [
  {
    name: "screen variant (sm:, md:, lg:, xl:): use split:, tight:, roomy:, compact:, wide:",
    pattern: /(?<![\w-])(?:sm|md|lg|xl|2xl):[\w[-]/g,
  },
  {
    name: "fixed size in pixels: size on the container (cqw, cqh, %) or on the content",
    pattern:
      /(?<![\w-])(?:w|h|size|min-h|max-h|min-w|max-w)-\[\d+(?:\.\d+)?px\]/g,
  },
  {
    // ltr:/rtl: match the dir of any ancestor: a French scope around an Arabic one applies both.
    name: "ltr:/rtl: variant: use logical properties (start/end, ps/pe, ms/me, text-start)",
    pattern: /(?<![\w-])(?:ltr|rtl):[\w[-]/g,
  },
  {
    name: "100vh: only the runtime root uses the viewport height (100dvh)",
    pattern: /100vh|(?<![\w-])(?:min-|max-)?h-screen(?![\w-])/g,
  },
];

// Touch targets may have a pixel minimum (44 to 56 px); borders are not sizes.
const ALLOWED = /^(?:min-h|min-w)-\[(?:4[4-9]|5[0-6])px\]$/;

function findViolations(source: string): string[] {
  const found: string[] = [];
  for (const rule of RULES) {
    for (const match of source.matchAll(rule.pattern)) {
      if (!ALLOWED.test(match[0])) found.push(`${match[0]} — ${rule.name}`);
    }
  }
  return found;
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

describe("no fixed sizes in the runtime", () => {
  it("finds no screen variant, fixed pixel size or 100vh in runtime/", () => {
    const violations = runtimeFiles(RUNTIME).flatMap((file) =>
      findViolations(readFileSync(file, "utf8")).map(
        (violation) => `${relative(RUNTIME, file)}: ${violation}`,
      ),
    );
    expect(violations).toEqual([]);
  });

  it("catches what the prototype used to do", () => {
    const prototype = `
      <div className="w-[260px] h-[260px] sm:w-[280px] min-h-[620px] md:text-lg max-w-[320px]" />
      <div className="h-screen" style={{ height: "100vh" }} />
      <span className="ltr:right-2 rtl:left-2" />`;
    expect(findViolations(prototype)).toEqual([
      "sm:w — screen variant (sm:, md:, lg:, xl:): use split:, tight:, roomy:, compact:, wide:",
      "md:t — screen variant (sm:, md:, lg:, xl:): use split:, tight:, roomy:, compact:, wide:",
      "w-[260px] — fixed size in pixels: size on the container (cqw, cqh, %) or on the content",
      "h-[260px] — fixed size in pixels: size on the container (cqw, cqh, %) or on the content",
      "w-[280px] — fixed size in pixels: size on the container (cqw, cqh, %) or on the content",
      "min-h-[620px] — fixed size in pixels: size on the container (cqw, cqh, %) or on the content",
      "max-w-[320px] — fixed size in pixels: size on the container (cqw, cqh, %) or on the content",
      "ltr:r — ltr:/rtl: variant: use logical properties (start/end, ps/pe, ms/me, text-start)",
      "rtl:l — ltr:/rtl: variant: use logical properties (start/end, ps/pe, ms/me, text-start)",
      "h-screen — 100vh: only the runtime root uses the viewport height (100dvh)",
      "100vh — 100vh: only the runtime root uses the viewport height (100dvh)",
    ]);
  });

  it("allows touch target minima, borders, container units and the root's 100dvh", () => {
    const allowed = `
      <button className="min-h-[52px] min-w-[44px] border-[2px] w-[80cqw] h-[min(60cqh,100%)]" />
      .xp-runtime { min-height: 100dvh; }
      <div className="split:flex-row tight:gap-2 compact:px-3 wide:max-w-[40rem]" />`;
    expect(findViolations(allowed)).toEqual([]);
  });

  it("still refuses a pixel minimum outside the touch range", () => {
    expect(
      findViolations('className="min-h-[40px] min-h-[60px]"'),
    ).toHaveLength(2);
  });
});
