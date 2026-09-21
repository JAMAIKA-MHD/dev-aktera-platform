import type { AssetRef } from "../../domain/types";
import { MAX_IMAGE_BYTES } from "../../domain/validation";
import type {
  AssetErrorCode,
  AssetPurpose,
  AssetStorage,
  UploadResult,
} from "../ports";

// AssetStorage for the MVP (plan §5.3): images are resized, compressed and kept inside the
// configuration as data URLs. Decoding and encoding go through an ImageCodec: the browser one
// by default, a fake one in tests (jsdom has no working canvas).

// Longest side per use: sharp on large screens, light enough for localStorage.
export const MAX_SIDE_BY_PURPOSE: Readonly<Record<AssetPurpose, number>> = {
  background: 1920,
  logo: 512,
  scratchCover: 1280,
};
export const ENCODE_QUALITY = 0.82;

// What a 2D canvas can draw (an ImageBitmap in the browser).
export type DrawableImage = Parameters<
  CanvasRenderingContext2D["drawImage"]
>[0];

export interface RasterImage {
  width: number;
  height: number;
  source: DrawableImage;
  close(): void;
}

export interface ImageCodec {
  decode(file: Blob): Promise<RasterImage>; // rejects when the file cannot be decoded
  encode(
    image: RasterImage,
    size: { width: number; height: number },
    type: string,
    quality: number,
  ): Promise<Blob | null>;
}

export const browserImageCodec: ImageCodec = {
  async decode(file) {
    // "from-image": phone photos keep their EXIF orientation.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    };
  },
  encode(image, size, type, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return Promise.resolve(null);
    // JPEG has no transparency: paint white rather than let transparent pixels turn black.
    if (type === "image/jpeg") {
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, size.width, size.height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, 0, 0, size.width, size.height);
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  },
};

// Scales down to fit maxSide on the longest side; never scales up.
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const MESSAGES: Record<AssetErrorCode, string> = {
  NOT_AN_IMAGE: "This file is not an image. Use a PNG, JPEG or WebP file.",
  UNREADABLE:
    "This image could not be read. Try another file (PNG, JPEG or WebP).",
  TOO_LARGE: `This image is still over ${MAX_IMAGE_BYTES / 1024} KB after compression. Use a smaller or simpler image.`,
};

const failure = (code: AssetErrorCode): UploadResult => ({
  ok: false,
  error: { code, message: MESSAGES[code] },
});

export interface DataUrlAssetStorageOptions {
  codec?: ImageCodec;
  // Public URL of a Supabase Storage object, once that adapter exists; none in the MVP.
  resolveStorage?: (bucket: string, path: string) => string | null;
}

export function createDataUrlAssetStorage(
  options: DataUrlAssetStorageOptions = {},
): AssetStorage {
  const codec = options.codec ?? browserImageCodec;
  const resolveStorage = options.resolveStorage ?? (() => null);

  // WebP first: smallest, and it keeps transparency. Browsers that cannot encode WebP
  // silently return PNG; then JPEG for photos, PNG for logos (which are often transparent).
  async function encode(
    image: RasterImage,
    purpose: AssetPurpose,
  ): Promise<Blob | null> {
    const size = fitWithin(
      image.width,
      image.height,
      MAX_SIDE_BY_PURPOSE[purpose],
    );
    const webp = await codec.encode(image, size, "image/webp", ENCODE_QUALITY);
    if (webp?.type === "image/webp") return webp;
    const fallback = purpose === "logo" ? "image/png" : "image/jpeg";
    return codec.encode(image, size, fallback, ENCODE_QUALITY);
  }

  return {
    async upload(file: File, purpose: AssetPurpose): Promise<UploadResult> {
      if (!file.type.startsWith("image/")) return failure("NOT_AN_IMAGE");
      let image: RasterImage;
      try {
        image = await codec.decode(file);
      } catch {
        return failure("UNREADABLE");
      }
      try {
        const blob = await encode(image, purpose);
        // The configuration schema only accepts data:image/… URLs.
        if (!blob?.type.startsWith("image/")) return failure("UNREADABLE");
        if (blob.size > MAX_IMAGE_BYTES) return failure("TOO_LARGE");
        const asset: AssetRef = {
          kind: "dataUrl",
          url: await blobToDataUrl(blob),
        };
        return { ok: true, asset };
      } catch {
        return failure("UNREADABLE");
      } finally {
        image.close();
      }
    },

    resolveUrl(ref: AssetRef): string | null {
      if (!ref) return null;
      if (ref.kind === "storage") return resolveStorage(ref.bucket, ref.path);
      return ref.url; // dataUrl or remote (https only, checked by the schema)
    },
  };
}
