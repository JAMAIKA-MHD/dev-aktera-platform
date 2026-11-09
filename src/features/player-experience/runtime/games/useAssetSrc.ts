import type { AssetRef } from "../../domain/types";
import { useOptionalExperienceServices } from "../../services/ServicesProvider";

// The URL a brand's image is drawn from. A stored image (Supabase Storage) has no URL of its
// own: the services resolve it. Without services, only an image that already carries its URL
// can be drawn. Same rule as HitTarget, shared by the games that draw a brand image.
export function useAssetSrc(image: AssetRef): string | null {
  const services = useOptionalExperienceServices();
  if (!image) return null;
  if (services) return services.assets.resolveUrl(image);
  return "url" in image ? image.url : null;
}
