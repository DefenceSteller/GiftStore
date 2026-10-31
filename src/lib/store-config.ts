/** Store pricing config — mirrors the original Express defaults (server/lib/settings.js). */
export const STORE_CONFIG = {
  store_name: "Confetti Club",
  currency: "USD",
  free_shipping_threshold_cents: 5000, // Rs 50
  standard_shipping_cents: 599, // Rs 5.99
  express_shipping_cents: 1299, // Rs 12.99
  tax_rate_bps: 500, // 5%
  delivery_days_standard: "5-7",
  delivery_days_express: "2-3",
} as const;

export type Promo = {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  description?: string;
  minSubtotalCents?: number;
};

/** Compute discount for a subtotal given an applied promo (client-side preview only). */
export function discountFor(subtotal: number, promo: Promo | null): number {
  if (!promo) return 0;
  if (promo.type === "percent") return Math.round((subtotal * promo.value) / 100);
  if (promo.type === "fixed") return Math.min(promo.value, subtotal);
  return 0;
}
