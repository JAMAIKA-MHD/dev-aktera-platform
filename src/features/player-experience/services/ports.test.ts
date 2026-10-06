import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ExperienceConfig } from "../domain/types";
import type {
  ExperienceRepository,
  ExperienceServices,
  ParticipationGateway,
  SaveResult,
  UploadResult,
} from "./ports";

describe("ports.ts", () => {
  it("only declares types: no implementation", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(here, "ports.ts"), "utf8")
      .replace(/\/\/.*$/gm, "") // comments
      .replace(/"[^"]*"/g, '""'); // string literals
    const statements = source
      .split("\n")
      .filter((line) => /^(import|export)\b/.test(line));
    expect(statements.length).toBeGreaterThan(20);
    for (const line of statements) {
      expect(line).toMatch(/^(import type|export type|export interface)\b/);
    }
    // Nothing but type declarations at the top level.
    expect(source).not.toMatch(/^(const|let|var|function|class|enum)\b/m);
  });

  it("groups the five services", () => {
    expectTypeOf<keyof ExperienceServices>().toEqualTypeOf<
      | "repository"
      | "participation"
      | "assets"
      | "analytics"
      | "humanVerification"
    >();
  });

  it("returns expected failures as values", () => {
    expectTypeOf<
      Awaited<ReturnType<ExperienceRepository["save"]>>
    >().toEqualTypeOf<SaveResult>();
    expectTypeOf<
      Extract<SaveResult, { ok: true }>["config"]
    >().toEqualTypeOf<ExperienceConfig>();
    expectTypeOf<
      Extract<UploadResult, { ok: false }>["error"]["code"]
    >().toEqualTypeOf<"NOT_AN_IMAGE" | "TOO_LARGE" | "UNREADABLE">();
    expectTypeOf<ParticipationGateway["mode"]>().toEqualTypeOf<
      "demo" | "scripted" | "live"
    >();
  });
});
