"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/traffic";

/**
 * Auto-tracks pageviews on every route change.
 * Place this once inside your root layout's useEffect or at the top of the
 * page component for pages you want to track.
 */
export default function TrafficTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const path = `${pathname}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
    trackEvent("pageview", path);
  }, [pathname, searchParams]);

  return null;
}
