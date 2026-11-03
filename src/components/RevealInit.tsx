"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Port of the main-branch storefront's `initReveal()` (public/assets/js/store.js).
 *
 * The compiled design system (/assets/css/styles.css) ships:
 *   .reveal { opacity: 0; transform: translateY(22px); ... }
 *   .reveal.is-in { opacity: 1; transform: none; ... }
 * so every `.reveal` element stays invisible until JavaScript adds `.is-in`.
 * Without this observer, whole home-page sections (Bento, testimonials,
 * newsletter, ...) never appear.
 *
 * Runs again on every client-side navigation so freshly rendered pages
 * re-arm their reveals, mirroring the main branch's per-page-load behavior.
 */
export default function RevealInit() {
  const pathname = usePathname();

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)");
    if (!targets.length) return;

    // No IntersectionObserver (very old browser): show everything immediately.
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = Number(
            (entry.target as HTMLElement).dataset.delay || 0
          );
          window.setTimeout(() => {
            entry.target.classList.add("is-in");
          }, delay);
          observer.unobserve(entry.target);
        });
      },
      // Same trigger as the main branch: fire slightly before the bottom edge.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
