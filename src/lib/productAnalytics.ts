// Product events of the dashboard (not the players' analytics). No analytics tool is connected
// yet: events go to `window.dataLayer`, which a tag manager reads once one is installed, and to
// the console in development.
type ProductEvent =
  "tour_started" | "tour_step_viewed" | "tour_skipped" | "tour_completed";

declare global {
  interface Window {
    dataLayer?: object[];
  }
}

export function trackProductEvent(
  event: ProductEvent,
  properties: Record<string, string | number | boolean> = {},
) {
  window.dataLayer?.push({ event, ...properties });
  if (import.meta.env.DEV) console.debug("[product]", event, properties);
}
