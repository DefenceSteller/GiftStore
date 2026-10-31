"use server";

import { getPromo } from "@/lib/promo";
import type { Promo } from "@/lib/store-config";

export type PromoState = {
  ok: boolean;
  promo?: Promo;
  message: string;
};

/** Validate a promo code (called from the cart page). */
export async function validatePromo(code: string): Promise<PromoState> {
  const trimmed = (code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(trimmed)) {
    return { ok: false, message: "That code does not look right." };
  }

  const promo = await getPromo(trimmed);
  if (!promo) {
    return { ok: false, message: `Code ${trimmed} is not valid.` };
  }

  return {
    ok: true,
    promo,
    message: `✓ ${promo.description || `${trimmed} applied`}`,
  };
}
