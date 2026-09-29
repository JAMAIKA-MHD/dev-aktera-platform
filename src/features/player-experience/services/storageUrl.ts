// Public URL of a Supabase Storage object (backend task B3.3). Pure: usable by the Supabase
// asset storage and by the preview frame, which must not import Supabase adapters.
// The bucket is public for reading (20260702214554_prompt8_storage_image_uploader.sql).

export const EXPERIENCE_BUCKET = "campaign-media";

// Public URLs of this app's own Supabase project (VITE_SUPABASE_URL), for the preview frame
// (backend task B4.2): images uploaded from the Studio show in the preview. Resolves to null
// when the project URL is not configured.
export function resolveAppStorage(bucket: string, path: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? publicStorageUrl(base, bucket, path) : null;
}

export function publicStorageUrl(
  supabaseUrl: string,
  bucket: string,
  path: string,
): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
