import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIN_TEXT_CONTRAST, contrastRatio } from "../domain/contrast";
import {
  THEMED_TEMPLATE_IDS,
  manifestAssetPaths,
  themeFilePath,
  themeManifestSchema,
} from "../domain/themeManifest";
import { THEME_MANIFESTS, THEME_MANIFEST_ERRORS } from "./themeManifests";

const THEMES = join(dirname(fileURLToPath(import.meta.url)), "..", "themes");

describe("theme manifests (themes/<id>/theme.json)", () => {
  it("all pass the schema", () => {
    expect(THEME_MANIFEST_ERRORS).toEqual([]);
  });

  it("exist for every template but the classic one", () => {
    expect(Object.keys(THEME_MANIFESTS).sort()).toEqual(
      [...THEMED_TEMPLATE_IDS].sort(),
    );
  });

  it("name only files that exist in their own folder or the shared one", () => {
    const missing = Object.values(THEME_MANIFESTS).flatMap((manifest) =>
      manifestAssetPaths(manifest)
        .filter(
          (path) => !existsSync(join(THEMES, themeFilePath(manifest.id, path))),
        )
        .map((path) => `${manifest.id}/${path}`),
    );
    expect(missing).toEqual([]);
  });

  it("keep their text readable on their own panel", () => {
    for (const manifest of Object.values(THEME_MANIFESTS)) {
      const { text, surface } = manifest.palette;
      expect(
        contrastRatio(text, surface),
        `${manifest.id}: text on surface`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it("keep the play screen of every game readable (score, timer counter, answers, cover)", () => {
    for (const manifest of Object.values(THEME_MANIFESTS)) {
      const palette = manifest.palette as Record<string, string>;
      const color = (value: string | undefined) =>
        value?.startsWith("@") ? palette[value.slice(1)] : value;
      const { quiz, scratch, hitIt } = manifest.games;
      const pairs: [string, string | undefined, string | undefined][] = [
        ["quiz answer", quiz.option?.text, quiz.option?.bg],
        ["quiz counter", quiz.counter?.text, quiz.counter?.bg],
        ["quiz question", quiz.question, manifest.card.bg],
        ["hit score", hitIt.score?.text, hitIt.score?.bg],
        ...(scratch.foil ?? []).map(
          (stop, index) =>
            [`scratch cover ${index + 1}`, scratch.coverText, stop] as [
              string,
              string,
              string,
            ],
        ),
      ];
      for (const [part, text, ground] of pairs) {
        const fg = color(text);
        const bg = color(ground);
        if (!fg || !bg) continue;
        expect(
          contrastRatio(fg, bg),
          `${manifest.id}: ${part}`,
        ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    }
  });

  it("refuses a value that would escape its CSS property or load an outside image", () => {
    const base = THEME_MANIFESTS["comic-burst"]!;
    const withPanelBg = (bg: string) =>
      themeManifestSchema.safeParse({ ...base, panel: { ...base.panel, bg } })
        .success;
    expect(withPanelBg("#312E81")).toBe(true);
    expect(withPanelBg("red; position: fixed")).toBe(false);
    expect(withPanelBg("url(https://example.com/x.png)")).toBe(false);
    expect(withPanelBg("} body { display: none")).toBe(false);
    const withBackground = (path: string) =>
      themeManifestSchema.safeParse({
        ...base,
        stage: {
          ...base.stage,
          backgrounds: { ...base.stage.backgrounds, default: path },
        },
      }).success;
    expect(withBackground("assets/backgrounds/bg-quiz.svg")).toBe(true);
    expect(withBackground("../../secret.svg")).toBe(false);
    expect(withBackground("https://example.com/bg.svg")).toBe(false);
  });
});
