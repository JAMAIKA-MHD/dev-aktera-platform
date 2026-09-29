import type { AssetRef } from "../../domain/types";
import { MAX_IMAGE_BYTES } from "../../domain/validation";
import {
  browserImageCodec,
  compressImage,
  type ImageCodec,
} from "../imageCompression";
import type {
  AssetErrorCode,
  AssetPurpose,
  AssetStorage,
  UploadResult,
} from "../ports";

// AssetStorage for the MVP (plan §5.3): images are resized, compressed (imageCompression.ts)
// and kept inside the configuration as data URLs.

// Re-exported: the compression moved to imageCompression.ts (backend task B3.3).
export {
  ENCODE_QUALITY,
  MAX_SIDE_BY_PURPOSE,
  browserImageCodec,
  fitWithin,
} from "../imageCompression";
export type {
  DrawableImage,
  ImageCodec,
  RasterImage,
} from "../imageCompression";

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
  // Public URL of a Supabase Storage object (publicStorageUrl), for configurations whose
  // images were uploaded to Storage; none by default.
  resolveStorage?: (bucket: string, path: string) => string | null;
}

export function createDataUrlAssetStorage(
  options: DataUrlAssetStorageOptions = {},
): AssetStorage {
  const codec = options.codec ?? browserImageCodec;
  const resolveStorage = options.resolveStorage ?? (() => null);

  return {
    async upload(file: File, purpose: AssetPurpose): Promise<UploadResult> {
      const compressed = await compressImage(file, purpose, codec);
      if (compressed.ok === false) return failure(compressed.code);
      if (compressed.blob.size > MAX_IMAGE_BYTES) return failure("TOO_LARGE");
      try {
        const asset: AssetRef = {
          kind: "dataUrl",
          url: await blobToDataUrl(compressed.blob),
        };
        return { ok: true, asset };
      } catch {
        return failure("UNREADABLE");
      }
    },

    resolveUrl(ref: AssetRef): string | null {
      if (!ref) return null;
      if (ref.kind === "storage") return resolveStorage(ref.bucket, ref.path);
      return ref.url; // dataUrl or remote (https only, checked by the schema)
    },
  };
}
