import { describe, expect, it, vi } from "vitest";
import type { ImageCodec, RasterImage } from "../imageCompression";
import { EXPERIENCE_BUCKET, publicStorageUrl } from "../storageUrl";
import {
  createFakeSupabase,
  type FakeHandlers,
} from "./__tests__/fakeSupabaseClient";
import {
  MAX_UPLOAD_BYTES,
  createSupabaseAssetStorage,
} from "./supabaseAssetStorage";

const ORG = "00000000-0000-0000-0000-000000000001";
const CAMPAIGN = "11111111-1111-4111-8111-111111111111";
const SUPABASE_URL = "http://127.0.0.1:54321";

const png = () =>
  new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" });

// Stands in for the browser's decoder and encoder.
function fakeCodec(
  options: {
    outputType?: string;
    outputBytes?: number;
    decodeFails?: boolean;
  } = {},
) {
  const {
    outputType = "image/webp",
    outputBytes = 2_000,
    decodeFails = false,
  } = options;
  const close = vi.fn();
  const codec: ImageCodec = {
    async decode() {
      if (decodeFails) throw new Error("Cannot decode");
      return {
        width: 800,
        height: 600,
        source: {} as RasterImage["source"],
        close,
      };
    },
    async encode(_image, _size, type) {
      return new Blob([new Uint8Array(outputBytes)], {
        type: type === "image/webp" ? outputType : type,
      });
    },
  };
  return { codec, close };
}

function setup(upload?: FakeHandlers["upload"], codec = fakeCodec().codec) {
  const fake = createFakeSupabase({ upload });
  const storage = createSupabaseAssetStorage({
    client: fake.client,
    supabaseUrl: SUPABASE_URL,
    organizationId: ORG,
    campaignId: CAMPAIGN,
    codec,
  });
  return { ...fake, storage };
}

describe("publicStorageUrl", () => {
  it("builds the public URL of an object, encoding each path segment", () => {
    expect(
      publicStorageUrl(
        "http://127.0.0.1:54321/",
        "campaign-media",
        "org/experience/c/logo 1.webp",
      ),
    ).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/campaign-media/org/experience/c/logo%201.webp",
    );
  });
});

describe("createSupabaseAssetStorage — upload", () => {
  it("uploads the compressed image under the organization and campaign, and returns a storage ref", async () => {
    const { codec, close } = fakeCodec();
    let uploaded: {
      bucket: string;
      path: string;
      body: unknown;
      options: unknown;
    } | null = null;
    const { storage } = setup((bucket, path, body, options) => {
      uploaded = { bucket, path, body, options };
      return { data: { path } };
    }, codec);

    const result = await storage.upload(png(), "background");

    expect(result.ok).toBe(true);
    if (result.ok === false) return;
    expect(result.asset).toEqual({
      kind: "storage",
      bucket: EXPERIENCE_BUCKET,
      path: uploaded!.path,
    });
    expect(uploaded!.bucket).toBe("campaign-media");
    expect(uploaded!.path).toMatch(
      new RegExp(
        `^${ORG}/experience/${CAMPAIGN}/background-[0-9a-f-]{36}\\.webp$`,
      ),
    );
    expect((uploaded!.body as Blob).type).toBe("image/webp");
    expect(uploaded!.options).toEqual({
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("names the file after the encoded type (PNG fallback for a logo)", async () => {
    const paths: string[] = [];
    const { storage } = setup(
      (_bucket, path) => {
        paths.push(path);
        return {};
      },
      fakeCodec({ outputType: "image/png" }).codec,
    );
    await storage.upload(png(), "logo");
    expect(paths[0]).toMatch(/\/logo-[0-9a-f-]{36}\.png$/);
  });

  it("refuses a file that is not an image, without uploading", async () => {
    const { storage, calls } = setup();
    const result = await storage.upload(
      new File(["x"], "notes.txt", { type: "text/plain" }),
      "logo",
    );
    expect(result.ok === false && result.error.code).toBe("NOT_AN_IMAGE");
    expect(calls).toEqual([]);
  });

  it("refuses an image it cannot read", async () => {
    const { storage, calls } = setup(
      undefined,
      fakeCodec({ decodeFails: true }).codec,
    );
    const result = await storage.upload(png(), "logo");
    expect(result.ok === false && result.error.code).toBe("UNREADABLE");
    expect(calls).toEqual([]);
  });

  it("refuses an image still over the bucket limit after compression", async () => {
    const { storage, calls } = setup(
      undefined,
      fakeCodec({ outputBytes: MAX_UPLOAD_BYTES + 1 }).codec,
    );
    const result = await storage.upload(png(), "background");
    expect(result.ok === false && result.error.code).toBe("TOO_LARGE");
    expect(result.ok === false && result.error.message).toContain("5 MB");
    expect(calls).toEqual([]);
  });

  it("reports a failed upload (server error or network) with a clear message", async () => {
    for (const upload of [
      () => ({
        error: { message: "new row violates row-level security policy" },
      }),
      () => Promise.reject(new TypeError("Failed to fetch")),
    ]) {
      const result = await setup(upload).storage.upload(png(), "logo");
      expect(result).toEqual({
        ok: false,
        error: {
          code: "UNREADABLE",
          message:
            "The image could not be uploaded. Check your connection and try again.",
        },
      });
    }
  });
});

describe("createSupabaseAssetStorage — resolveUrl", () => {
  it("resolves storage, data URL and remote references", () => {
    const { storage } = setup();
    expect(storage.resolveUrl(null)).toBeNull();
    expect(
      storage.resolveUrl({
        kind: "storage",
        bucket: "campaign-media",
        path: `${ORG}/experience/x.webp`,
      }),
    ).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/campaign-media/${ORG}/experience/x.webp`,
    );
    expect(
      storage.resolveUrl({ kind: "dataUrl", url: "data:image/png;base64,AA" }),
    ).toBe("data:image/png;base64,AA");
    expect(
      storage.resolveUrl({
        kind: "remote",
        url: "https://cdn.example/logo.png",
      }),
    ).toBe("https://cdn.example/logo.png");
  });
});
