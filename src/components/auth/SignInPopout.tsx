"use client";

/**
 * Sign-in gate popout. Mounted once in the root layout.
 *
 * Firing `openSignInPopout()` from anywhere shows the modal. It carries the
 * current path as `next` so the sign-in page returns the user to exactly where
 * they were, and stashes the product they tried to add so it can be added for
 * them after they sign in.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AddableProduct } from "@/components/cart/CartProvider";

const PENDING_ADD_KEY = "cc_pending_add";

export function openSignInPopout(product?: AddableProduct) {
  console.log("[SignInPopout] openSignInPopout called with product=", product?.name ?? "none");
  if (typeof window !== "undefined") (window as any).__OPEN_SIGNIN_CALLED = true;
  try {
    if (product) sessionStorage.setItem(PENDING_ADD_KEY, JSON.stringify(product));
    else sessionStorage.removeItem(PENDING_ADD_KEY);
  } catch {
    /* storage blocked — popout still works, just no auto-add */
  }
  window.dispatchEvent(new CustomEvent("signin:open"));
}

/** Read + clear the product the user tried to add before signing in. */
export function takePendingAdd(): AddableProduct | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ADD_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_ADD_KEY);
    return JSON.parse(raw) as AddableProduct;
  } catch {
    return null;
  }
}

export default function SignInPopout() {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  console.log("[SignInPopout] component mounted");

  useEffect(() => {
    const onOpen = (e: Event) => {
      console.log("[SignInPopout] signin:open event received");
      setReturnTo(window.location.pathname + window.location.search);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("signin:open", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("signin:open", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const next = encodeURIComponent(returnTo);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-popout-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Card */}
      <div className="relative w-full max-w-md animate-pop rounded-[28px] border-2 border-ink bg-white p-7 shadow-sticker">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 text-base transition hover:border-ink"
          aria-label="Close"
        >
          ✕
        </button>

        <span className="sticker -rotate-3 bg-acid">Members only-ish</span>

        <div className="mt-5 grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-iris text-3xl shadow-sticker-sm">
          🔐
        </div>

        <h2
          id="signin-popout-title"
          className="mt-4 font-display text-2xl font-extrabold leading-tight"
        >
          Psst — your bag is waiting
        </h2>

        <p className="mt-2 text-sm font-medium leading-relaxed text-ink/60">
          Sign in and this goes straight into <strong>your</strong> bag — kept
          separate from everyone else&apos;s, right where you left it next time
          you visit. No shared carts, no strangers grabbing your gifts.
        </p>

        <Link
          href={`/auth/signin?next=${next}`}
          className="btn-primary mt-5 block w-full text-center"
          onClick={() => setOpen(false)}
        >
          Sign in to continue →
        </Link>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-bold text-ink/50">
          <span>New here?</span>
          <Link
            href={`/auth/signup?next=${next}`}
            className="text-iris underline transition hover:text-ink"
            onClick={() => setOpen(false)}
          >
            Create an account
          </Link>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="btn-ghost mt-3 w-full text-[13px]"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
