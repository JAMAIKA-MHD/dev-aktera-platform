import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateDataUrlBytes } from "../../domain/validation";
import type { AssetPurpose } from "../ports";
import {
  ENCODE_QUALITY,
  browserImageCodec,
  createDataUrlAssetStorage,
  fitWithin,
  type ImageCodec,
  type RasterImage,
} from "./dataUrlAssetStorage";

// A real 1×1 PNG.
const PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);
const png = (name = "logo.png") =>
  new File([PNG_BYTES], name, { type: "image/png" });

interface FakeCodecOptions {
  width?: number;
  height?: number;
  decodeFails?: boolean;
  supportsWebp?: boolean;
  outputBytes?: number;
  output?: "blob" | "null" | "untyped" | "throw";
}

// Stands in for the browser: records what it is asked to encode.
function fakeCodec(options: FakeCodecOptions = {}) {
  const {
    width = 4000,
    height = 3000,
    decodeFails = false,
    supportsWebp = true,
    outputBytes = 1_000,
    output = "blob",
  } = options;
  const encodes: {
    width: number;
    height: number;
    type: string;
    quality: number;
  }[] = [];
  const close = vi.fn();
  const codec: ImageCodec = {
    async decode() {
      if (decodeFails) throw new Error("Cannot decode");
      return { width, height, source: {} as RasterImage["source"], close };
    },
    async encode(_image, size, type, quality) {
      encodes.push({ ...size, type, quality });
      if (output === "null") return null;
      if (output === "throw") throw new Error("Encoder crashed");
      const produced =
        output === "untyped"
          ? ""
          : type === "image/webp" && !supportsWebp
            ? "image/png" // what browsers without WebP encoding return
            : type;
      return new Blob([new Uint8Array(outputBytes)], { type: produced });
    },
  };
  return { codec, encodes, close };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("upload", () => {
  it("turns a PNG into a compressed WebP data URL", async () => {
    const { codec, close } = fakeCodec({ outputBytes: 12_345 });
    const result = await createDataUrlAssetStorage({ codec }).upload(
      png(),
      "logo",
    );
    expect(result).toEqual({
      ok: true,
      asset: {
        kind: "dataUrl",
        url: expect.stringMatching(/^data:image\/webp;base64,/),
      },
    });
    const url =
      result.ok === true && result.asset?.kind === "dataUrl"
        ? result.asset.url
        : "";
    expect(estimateDataUrlBytes(url)).toBe(12_345);
    expect(close).toHaveBeenCalledOnce(); // the decoded image is released
  });

  it("resizes to the longest side of each use, without enlarging", async () => {
    const sizes: Record<AssetPurpose, [number, number]> = {
      background: [1920, 1440],
      logo: [512, 384],
      scratchCover: [1280, 960],
    };
    for (const [purpose, [width, height]] of Object.entries(sizes)) {
      const { codec, encodes } = fakeCodec();
      await createDataUrlAssetStorage({ codec }).upload(
        png(),
        purpose as AssetPurpose,
      );
      expect(encodes).toEqual([
        { width, height, type: "image/webp", quality: ENCODE_QUALITY },
      ]);
    }
    const small = fakeCodec({ width: 300, height: 200 });
    await createDataUrlAssetStorage({ codec: small.codec }).upload(
      png(),
      "background",
    );
    expect(small.encodes[0]).toMatchObject({ width: 300, height: 200 });
  });

  it("falls back to JPEG for photos and PNG for logos without WebP", async () => {
    const photo = fakeCodec({ supportsWebp: false });
    const background = await createDataUrlAssetStorage({
      codec: photo.codec,
    }).upload(png("bg.png"), "background");
    expect(photo.encodes.map((encode) => encode.type)).toEqual([
      "image/webp",
      "image/jpeg",
    ]);
    expect(background).toMatchObject({
      ok: true,
      asset: { url: expect.stringMatching(/^data:image\/jpeg;base64,/) },
    });
    const logo = fakeCodec({ supportsWebp: false });
    await createDataUrlAssetStorage({ codec: logo.codec }).upload(
      png(),
      "logo",
    );
    expect(logo.encodes.map((encode) => encode.type)).toEqual([
      "image/webp",
      "image/png", // keeps the logo's transparency
    ]);
  });

  it("refuses a file that is not an image", async () => {
    const { codec, encodes } = fakeCodec();
    const text = new File(["hello"], "notes.txt", { type: "text/plain" });
    expect(
      await createDataUrlAssetStorage({ codec }).upload(text, "logo"),
    ).toEqual({
      ok: false,
      error: {
        code: "NOT_AN_IMAGE",
        message: "This file is not an image. Use a PNG, JPEG or WebP file.",
      },
    });
    expect(encodes).toEqual([]);
  });

  it("refuses an image that cannot be read or encoded", async () => {
    for (const options of [
      { decodeFails: true },
      { output: "null" },
      { output: "untyped" },
      { output: "throw" },
    ] as FakeCodecOptions[]) {
      const { codec } = fakeCodec(options);
      const result = await createDataUrlAssetStorage({ codec }).upload(
        png(),
        "logo",
      );
      expect(result.ok === false ? result.error.code : null).toBe("UNREADABLE");
    }
  });

  it("refuses an image still over 400 KB after compression, and accepts 400 KB", async () => {
    const heavy = fakeCodec({ outputBytes: 400 * 1024 + 1 });
    const refused = await createDataUrlAssetStorage({
      codec: heavy.codec,
    }).upload(png(), "background");
    expect(refused).toEqual({
      ok: false,
      error: {
        code: "TOO_LARGE",
        message:
          "This image is still over 400 KB after compression. Use a smaller or simpler image.",
      },
    });
    expect(heavy.close).toHaveBeenCalledOnce();
    const limit = fakeCodec({ outputBytes: 400 * 1024 });
    expect(
      (
        await createDataUrlAssetStorage({ codec: limit.codec }).upload(
          png(),
          "background",
        )
      ).ok,
    ).toBe(true);
  });
});

describe("upload: data URL", () => {
  it("reports an unreadable image when the data URL cannot be produced", async () => {
    vi.stubGlobal(
      "FileReader",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        error = new DOMException("Read failed", "NotReadableError");
        readAsDataURL() {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    const { codec, close } = fakeCodec();
    const result = await createDataUrlAssetStorage({ codec }).upload(
      png(),
      "logo",
    );
    expect(result.ok === false ? result.error.code : null).toBe("UNREADABLE");
    expect(close).toHaveBeenCalledOnce();
  });
});

describe("resolveUrl", () => {
  it("gives the URL to display for each kind of image", () => {
    const storage = createDataUrlAssetStorage({ codec: fakeCodec().codec });
    expect(storage.resolveUrl(null)).toBeNull();
    expect(
      storage.resolveUrl({ kind: "dataUrl", url: "data:image/png;base64,AA" }),
    ).toBe("data:image/png;base64,AA");
    expect(
      storage.resolveUrl({
        kind: "remote",
        url: "https://cdn.example.com/a.png",
      }),
    ).toBe("https://cdn.example.com/a.png");
    expect(
      storage.resolveUrl({ kind: "storage", bucket: "brand", path: "a.png" }),
    ).toBeNull();
  });

  it("resolves Supabase Storage objects once a resolver is given", () => {
    const storage = createDataUrlAssetStorage({
      resolveStorage: (bucket, path) =>
        `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}`,
    });
    expect(
      storage.resolveUrl({
        kind: "storage",
        bucket: "brand",
        path: "logo.webp",
      }),
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/brand/logo.webp",
    );
  });
});

describe("fitWithin", () => {
  it("keeps the proportions, in portrait too, and never goes below 1 pixel", () => {
    expect(fitWithin(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 });
    expect(fitWithin(10_000, 2, 512)).toEqual({ width: 512, height: 1 });
    expect(fitWithin(512, 512, 512)).toEqual({ width: 512, height: 512 });
  });
});

describe("browserImageCodec", () => {
  function stubCanvas(context: Partial<CanvasRenderingContext2D> | null) {
    const created: HTMLCanvasElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const element = createElement(tag);
      if (tag === "canvas") created.push(element as HTMLCanvasElement);
      return element;
    }) as typeof document.createElement);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (callback, type) {
        callback(new Blob(["x"], { type: type ?? "image/png" }));
      },
    );
    return created;
  }

  it("decodes with createImageBitmap, keeping the photo orientation", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() };
    const createImageBitmap = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const file = png();
    const image = await browserImageCodec.decode(file);
    expect(createImageBitmap).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
    expect(image).toMatchObject({ width: 800, height: 600, source: bitmap });
    image.close();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("draws at the requested size and encodes with the requested type", async () => {
    const context = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "" };
    const canvases = stubCanvas(context);
    const image: RasterImage = {
      width: 800,
      height: 600,
      source: {} as RasterImage["source"],
      close: () => {},
    };
    const webp = await browserImageCodec.encode(
      image,
      { width: 400, height: 300 },
      "image/webp",
      0.82,
    );
    expect(webp?.type).toBe("image/webp");
    expect(canvases[0]).toMatchObject({ width: 400, height: 300 });
    expect(context.drawImage).toHaveBeenCalledWith(
      image.source,
      0,
      0,
      400,
      300,
    );
    expect(context.fillRect).not.toHaveBeenCalled(); // WebP keeps transparency
    await browserImageCodec.encode(
      image,
      { width: 400, height: 300 },
      "image/jpeg",
      0.82,
    );
    expect(context.fillStyle).toBe("#FFFFFF");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
  });

  it("gives up when the browser has no 2D canvas", async () => {
    stubCanvas(null);
    const image: RasterImage = {
      width: 1,
      height: 1,
      source: {} as RasterImage["source"],
      close: () => {},
    };
    expect(
      await browserImageCodec.encode(
        image,
        { width: 1, height: 1 },
        "image/webp",
        0.82,
      ),
    ).toBeNull();
  });

  it("is the codec used by default", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() })),
    );
    stubCanvas({ fillRect: vi.fn(), drawImage: vi.fn() });
    const result = await createDataUrlAssetStorage().upload(png(), "logo");
    expect(result).toMatchObject({
      ok: true,
      asset: { url: expect.stringMatching(/^data:image\/webp;base64,/) },
    });
  });
});
