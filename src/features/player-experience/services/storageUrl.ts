// Public URL of a Supabase Storage object (backend task B3.3). Pure: usable by the Supabase
// asset storage and by the preview frame, which must not import Supabase adapters.
// The bucket is public for reading (20260702214554_prompt8_storage_image_uploader.sql).

export const EXPERIENCE_BUCKET = "campaign-media";

export function publicStorageUrl(
  supabaseUrl: string,
  bucket: string,
  path: string,
): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
