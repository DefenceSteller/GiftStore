"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/traffic";

/** Fires a checkout_start event when the user lands on /checkout. */
export default function CheckoutTracker() {
  useEffect(() => {
    trackEvent("checkout_start", "/checkout");
  }, []);
  return null;
}