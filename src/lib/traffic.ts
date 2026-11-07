/**
 * Lightweight client-side traffic tracker.
 * Records pageviews, product views, add-to-cart, checkout starts & purchases
 * into the `traffic_events` table via POST /api/tracks.
 *
 * - Generates (or retrieves) a stable visitorId from sessionStorage so the same
 *   browser tab counts as one visitor across page navigations.
 * - Derives source from common UTM params + document.referrer fallbacks.
 */

const VISITOR_KEY = "cc_visitor_id";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(VISITOR_KEY);
  if (!id) {
    // Simple random hex ID (UUID-lite, no library needed)
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    sessionStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function deriveSource(path: string): string {
  if (typeof window === "undefined") return "direct";

  // Resolve relative paths against the current location so URL parsing never throws.
  let url: URL;
  try {
    url = new URL(path, location.href);
  } catch {
    url = new URL(location.href);
  }

  const utmSource = url.searchParams.get("utm_source");
  if (utmSource) return utmSource.toLowerCase();

  const referrer = document?.referrer || "";
  if (!referrer) return "direct";

  try {
    const ref = new URL(referrer);
    const host = ref.hostname.toLowerCase();
    if (host.includes("google")) return "organic";
    if (host.includes("bing")) return "organic";
    if (host.includes("facebook") || host.includes("fb.com")) return "social";
    if (host.includes("twitter") || host.includes("x.com")) return "social";
    if (host.includes("instagram")) return "social";
    if (host.includes("tiktok")) return "social";
    if (host.includes("youtube")) return "social";
    if (host.includes("reddit")) return "referral";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "referral";
    if (host.includes("paypal")) return "referral";
    // Any other external domain
    if (host !== url.hostname) return "referral";
  } catch { /* ignore bad referrer */ }
  return "direct";
}

let lastPageviewPath = "";
let dedupMs = 2000; // minimum ms between same-path events

export async function trackEvent(
  type: "pageview" | "product_view" | "add_to_cart" | "checkout_start" | "purchase",
  path: string,
  extra?: { revenueCents?: number }
) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const lastTime = (window as any).__lastTrackTime || 0;
  if (type === "pageview" && path === lastPageviewPath && now - lastTime < dedupMs) return;
  (window as any).__lastTrackTime = now;
  lastPageviewPath = path;

  const payload = {
    type,
    path,
    visitorId: getVisitorId(),
    source: deriveSource(path),
    referrer: typeof document !== "undefined" ? document.referrer : null,
    ...(extra ?? {}),
  };

  fetch("/api/tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => { /* fire-and-forget, don't break UX */ });
}
