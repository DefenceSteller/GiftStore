"use client";

/**
 * Empties the bag on the order-confirmation page.
 *
 * The bag lives in localStorage (keyed per user) while orders are written by
 * a server action or a Stripe redirect — neither can touch browser storage,
 * so the items used to survive checkout. This clears them the moment the
 * confirmation page loads, but only while the page is fresh (<15s) and only
 * when an order reference is in the URL, so a later back-button visit or a
 * hand-typed URL can't wipe a bag the shopper has since refilled.
 *
 * The `items` dependency also covers the auth user resolving a moment late:
 * the cart re-hydrates under the signed-in key and this clears on the next
 * pass, still inside the freshness window.
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "./CartProvider";

const FRESH_MS = 15_000;

export default function ClearCartAfterOrder() {
  const params = useSearchParams();
  const { items, ready, clear } = useCart();
  const loadedAt = useRef(0);
  if (loadedAt.current === 0) loadedAt.current = Date.now();

  const hasOrder =
    params.has("orderNumber") ||
    params.has("session_id") ||
    params.get("mock") === "true";

  useEffect(() => {
    if (!hasOrder || !ready || items.length === 0) return;
    if (Date.now() - loadedAt.current > FRESH_MS) return;
    clear();
  }, [hasOrder, ready, items, clear]);

  return null;
}
