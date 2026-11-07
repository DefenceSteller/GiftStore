"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/traffic";

/** Tracks a product_view event when the page mounts. */
export default function ProductTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent("product_view", `/product/${slug}`);
  }, [slug]);
  return null;
}