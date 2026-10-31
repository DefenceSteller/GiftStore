import { createClient } from "@/lib/supabase/server";
import type { Promo } from "@/lib/store-config";

/** Validate a promo code against the database (server-side). */
export async function getPromo(code: string): Promise<Promo | null> {
  const supabase = await createClient();
  const normalized = code.trim().toUpperCase();

  const { data } = await supabase
    .from("promo_codes")
    .select("code, type, value, active, min_subtotal_cents, description, expires_at")
    .eq("code", normalized)
    .maybeSingle();

  if (!data || !data.active) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  return {
    code: data.code,
    type: data.type as Promo["type"],
    value: data.value,
    description: data.description ?? undefined,
    minSubtotalCents: data.min_subtotal_cents ?? 0,
  };
}
