import type { AssetErrorCode, AssetPurpose } from "./ports";

// Image preparation shared by the asset storages (plan §5.3, backend task B3.3): images are
// resized to their use and re-encoded (WebP first), whether they end up inside the
// configuration (data URL, local) or in Supabase Storage. Decoding and encoding go through an
// ImageCodec: the browser one by default, a fake one in tests (jsdom has no working canvas).

// Longest side per use: sharp on large screens, light on mobile data.
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

// WebP first: smallest, and it keeps transparency. Browsers that cannot encode WebP silently
// return PNG; then JPEG for photos, PNG for logos (which are often transparent).
async function encodeForPurpose(
  image: RasterImage,
  purpose: AssetPurpose,
  codec: ImageCodec,
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

export type CompressResult =
  | { ok: true; blob: Blob }
  | { ok: false; code: Exclude<AssetErrorCode, "TOO_LARGE"> };

// Decodes, resizes and re-encodes an uploaded file. The size limit is the caller's: it
// depends on where the image is kept.
export async function compressImage(
  file: File,
  purpose: AssetPurpose,
  codec: ImageCodec,
): Promise<CompressResult> {
  if (!file.type.startsWith("image/"))
    return { ok: false, code: "NOT_AN_IMAGE" };
  let image: RasterImage;
  try {
    image = await codec.decode(file);
  } catch {
    return { ok: false, code: "UNREADABLE" };
  }
  try {
    const blob = await encodeForPurpose(image, purpose, codec);
    // The configuration schema only accepts image types.
    if (!blob?.type.startsWith("image/"))
      return { ok: false, code: "UNREADABLE" };
    return { ok: true, blob };
  } catch {
    return { ok: false, code: "UNREADABLE" };
  } finally {
    image.close();
  }
}
