import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALES, hasText } from "./locale";
import {
  PARTICIPATION_ERROR_MESSAGES,
  createClientRequestId,
  isRetryable,
  type ParticipationErrorCode,
} from "./participation";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const ALL_CODES = Object.keys(
  PARTICIPATION_ERROR_MESSAGES,
) as ParticipationErrorCode[];

describe("createClientRequestId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a unique UUID v4", () => {
    const first = createClientRequestId();
    const second = createClientRequestId();
    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });

  it("still returns a UUID v4 outside a secure context (no randomUUID)", () => {
    const webCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: webCrypto.getRandomValues.bind(webCrypto),
    });
    const ids = new Set(Array.from({ length: 50 }, createClientRequestId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});

describe("isRetryable", () => {
  it("allows retrying technical failures only", () => {
    expect(isRetryable("NETWORK")).toBe(true);
    expect(isRetryable("UNKNOWN")).toBe(true);
    expect(isRetryable("ALREADY_PARTICIPATED")).toBe(false);
    expect(isRetryable("CAMPAIGN_CLOSED")).toBe(false);
    expect(isRetryable("INVALID_INPUT")).toBe(false);
  });
});

describe("PARTICIPATION_ERROR_MESSAGES", () => {
  it("has a message for every code in every player language", () => {
    expect(ALL_CODES).toHaveLength(5);
    for (const code of ALL_CODES) {
      for (const locale of LOCALES) {
        expect(hasText(PARTICIPATION_ERROR_MESSAGES[code], locale)).toBe(true);
      }
    }
  });
});

describe("server contract", () => {
  it("knows exactly the error codes select-prize returns", () => {
    // Resolved with node:path: Vite rewrites new URL("literal", import.meta.url) into an asset URL.
    const here = dirname(fileURLToPath(import.meta.url));
    const server = readFileSync(
      resolve(here, "../../../../supabase/functions/select-prize/index.ts"),
      "utf8",
    );
    // Every error select-prize returns carries one of the codes of its ErrorCode type.
    const union = server.match(/type ErrorCode =([^;]+);/)?.[1] ?? "";
    const serverCodes = [...union.matchAll(/"([A-Z_]+)"/g)]
      .map((m) => m[1])
      .sort();

    expect(serverCodes).toEqual([
      "ALREADY_PARTICIPATED",
      "CAMPAIGN_CLOSED",
      "CONSENT_REQUIRED",
      "DRAW_FAILED",
      "INVALID_INPUT",
      "SERVER_ERROR",
    ]);
    // The others are server-side only: the live gateway maps them onto the player's codes
    // (CONSENT_REQUIRED → INVALID_INPUT, DRAW_FAILED and SERVER_ERROR → retryable failures).
    const SERVER_ONLY_CODES = [
      "CONSENT_REQUIRED",
      "DRAW_FAILED",
      "SERVER_ERROR",
    ];
    for (const code of serverCodes) {
      expect([...ALL_CODES, ...SERVER_ONLY_CODES]).toContain(code);
    }
  });
});
