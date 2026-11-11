import { createServiceClient } from "@/lib/supabase/service";

/** Default values — used as fallback when a key is missing from the DB. */
export type StoreConfig = {
  store_name: string;
  currency: string;
  announcement: string;
  support_email: string;
  free_shipping_threshold_cents: number;
  standard_shipping_cents: number;
  express_shipping_cents: number;
  tax_rate_bps: number;
  delivery_days_standard: string;
  delivery_days_express: string;
};

export const STORE_CONFIG_DEFAULTS: StoreConfig = {
  store_name: "Confetti Club",
  currency: "PKR",
  announcement: "",
  support_email: "hello@confetticlub.shop",
  free_shipping_threshold_cents: 5000,
  standard_shipping_cents: 599,
  express_shipping_cents: 1299,
  tax_rate_bps: 500,
  delivery_days_standard: "5-7",
  delivery_days_express: "2-3",
};

/** Backwards-compatible constant — server-side code that needs a synchronous default. */
export const STORE_CONFIG = STORE_CONFIG_DEFAULTS;

/** Read merged store config from the DB, falling back to defaults for any missing key. */
export async function getServerStoreConfig(): Promise<StoreConfig> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  return {
    store_name: map.store_name || STORE_CONFIG_DEFAULTS.store_name,
    currency: map.currency || STORE_CONFIG_DEFAULTS.currency,
    announcement: map.announcement_banner || map.announcement || STORE_CONFIG_DEFAULTS.announcement,
    support_email: map.support_email || STORE_CONFIG_DEFAULTS.support_email,
    free_shipping_threshold_cents: Number(map.free_shipping_threshold_cents) || STORE_CONFIG_DEFAULTS.free_shipping_threshold_cents,
    standard_shipping_cents: Number(map.standard_shipping_cents) || STORE_CONFIG_DEFAULTS.standard_shipping_cents,
    express_shipping_cents: Number(map.express_shipping_cents) || STORE_CONFIG_DEFAULTS.express_shipping_cents,
    tax_rate_bps: Number(map.tax_rate_bps) || STORE_CONFIG_DEFAULTS.tax_rate_bps,
    delivery_days_standard: map.delivery_days_standard || STORE_CONFIG_DEFAULTS.delivery_days_standard,
    delivery_days_express: map.delivery_days_express || STORE_CONFIG_DEFAULTS.delivery_days_express,
  };
}

/** Client-side fetch wrapper for getServerStoreConfig. */
export async function fetchStoreConfig(): Promise<StoreConfig> {
  const res = await fetch("/api/store/config", { cache: "no-store" });
  if (!res.ok) return { ...STORE_CONFIG_DEFAULTS };
  return res.json() as unknown as StoreConfig;
}

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