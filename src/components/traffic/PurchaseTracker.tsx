"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/traffic";

/** Fires a purchase event on the order-success page. */
export default function PurchaseTracker({ orderNumber }: { orderNumber?: string }) {
  useEffect(() => {
    trackEvent("purchase", `/order-success?order=${orderNumber ?? ""}`);
  }, [orderNumber]);
  return null;
}