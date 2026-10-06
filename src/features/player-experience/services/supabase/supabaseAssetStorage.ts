import type { SupabaseClient } from "@supabase/supabase-js";
import { createUuid } from "../../domain/uuid";
import type { AssetRef } from "../../domain/types";
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
import { EXPERIENCE_BUCKET, publicStorageUrl } from "../storageUrl";

// AssetStorage on Supabase Storage (backend task B3.3): images are compressed like before
// (imageCompression.ts), then uploaded to the public campaign-media bucket. The configuration
// only keeps { kind: "storage", bucket, path }, so the players' page stays light.
//
// Path: <organizationId>/experience/<campaignId>/<purpose>-<uuid>.<ext>. The first folder must
// be the organization: the bucket's upload policy only accepts a member's own organization.

// The bucket's own limit (5 MB). After compression, images are far below it.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Readonly<Record<string, string>> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

const MESSAGES: Record<AssetErrorCode, string> = {
  NOT_AN_IMAGE: "This file is not an image. Use a PNG, JPEG or WebP file.",
  UNREADABLE:
    "This image could not be read. Try another file (PNG, JPEG or WebP).",
  TOO_LARGE: `This image is still over ${MAX_UPLOAD_BYTES / 1024 / 1024} MB after compression. Use a smaller or simpler image.`,
};
const UPLOAD_FAILED =
  "The image could not be uploaded. Check your connection and try again.";

const failure = (
  code: AssetErrorCode,
  message = MESSAGES[code],
): UploadResult => ({
  ok: false,
  error: { code, message },
});

export interface SupabaseAssetStorageOptions {
  client: SupabaseClient;
  supabaseUrl: string;
  organizationId: string;
  campaignId: string;
  codec?: ImageCodec;
}

export function createSupabaseAssetStorage(
  options: SupabaseAssetStorageOptions,
): AssetStorage {
  const { client, supabaseUrl, organizationId, campaignId } = options;
  const codec = options.codec ?? browserImageCodec;

  return {
    async upload(file: File, purpose: AssetPurpose): Promise<UploadResult> {
      const compressed = await compressImage(file, purpose, codec);
      if (compressed.ok === false) return failure(compressed.code);
      const { blob } = compressed;
      if (blob.size > MAX_UPLOAD_BYTES) return failure("TOO_LARGE");

      const extension = EXTENSIONS[blob.type] ?? "img";
      const path = `${organizationId}/experience/${campaignId}/${purpose}-${createUuid()}.${extension}`;
      try {
        const { error } = await client.storage
          .from(EXPERIENCE_BUCKET)
          .upload(path, blob, {
            contentType: blob.type,
            cacheControl: "31536000", // a new upload always gets a new path
            upsert: false,
          });
        if (error) return failure("UNREADABLE", UPLOAD_FAILED);
      } catch {
        return failure("UNREADABLE", UPLOAD_FAILED);
      }
      const asset: AssetRef = {
        kind: "storage",
        bucket: EXPERIENCE_BUCKET,
        path,
      };
      return { ok: true, asset };
    },

    resolveUrl(ref: AssetRef): string | null {
      if (!ref) return null;
      if (ref.kind === "storage") {
        return publicStorageUrl(supabaseUrl, ref.bucket, ref.path);
      }
      return ref.url; // older designs keep their data URLs; remote URLs as they are
    },
  };
}
