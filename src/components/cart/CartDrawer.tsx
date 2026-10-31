"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { money } from "@/lib/format";
import { STORE_CONFIG } from "@/lib/store-config";

/** Slide-over bag drawer, mounted once in the root layout. */
export default function CartDrawer() {
  const { items, count, subtotal, setQty, remove } = useCart();
  const [open, setOpen] = useState(false);

  // Close on Escape + open when `cart:open` is dispatched (header/card buttons).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cart:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cart:open", onOpen);
    };
  }, []);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const threshold = STORE_CONFIG.free_shipping_threshold_cents;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div
      className={`fixed inset-0 z-[70] ${open ? "" : "hidden"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[430px] flex-col bg-paper shadow-lift transition-transform duration-300 ease-[cubic-bezier(.2,.8,.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
          <h2 className="font-display text-xl font-extrabold">
            Your bag{" "}
            <span className="text-ink/40">{count ? `(${count})` : ""}</span>
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink/10 text-lg transition hover:border-ink"
            aria-label="Close bag"
          >
            ✕
          </button>
        </div>

        {/* Free shipping progress */}
        <div className="border-b border-ink/8 bg-white px-5 py-4">
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span className="text-ink/60">
              {remaining > 0
                ? `${money(remaining)} away from free shipping 🚚`
                : "You unlocked free shipping 🎉"}
            </span>
            <span className="text-ink">{pct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-iris to-acid transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
              <span className="text-5xl">🛒</span>
              <p className="font-display text-lg font-extrabold">Your bag is empty</p>
              <p className="max-w-[240px] text-sm font-medium text-ink/50">
                Fix that. Future you (and whoever gets the gift) will say thanks.
              </p>
              <Link href="/shop" onClick={() => setOpen(false)} className="btn-lime btn-sm mt-1">
                Shop the drop
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const [c1, c2] = (item.gradient || "").split(",");
              return (
                <div
                  key={item.id}
                  className="mb-3 flex gap-3 rounded-3xl border border-ink/8 bg-white p-3 shadow-soft"
                >
                  <Link
                    href={`/product/${encodeURIComponent(item.slug)}`}
                    onClick={() => setOpen(false)}
                    className="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-extrabold">{item.name}</p>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-ink/35 transition hover:text-coral"
                        aria-label={`Remove ${item.name}`}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs font-bold text-ink/45">{money(item.priceCents)}</p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <div className="flex items-center gap-1 rounded-full border-2 border-ink/10 p-0.5">
                        <button
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full text-sm font-black transition hover:bg-ink/5"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-black tabular">{item.qty}</span>
                        <button
                          onClick={() => setQty(item.id, item.qty + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full text-sm font-black transition hover:bg-ink/5"
                          aria-label="Increase"
                        >
                          ＋
                        </button>
                      </div>
                      <span className="text-sm font-extrabold">{money(item.priceCents * item.qty)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink/8 bg-white px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink/60">Subtotal</span>
            <span className="font-display text-2xl font-extrabold">{money(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-ink/45">
            Shipping &amp; tax calculated at checkout.
          </p>
          <Link
            href="/checkout"
            onClick={() => setOpen(false)}
            className={`btn-primary mt-4 block w-full text-center ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          >
            Checkout →
          </Link>
          <button onClick={() => setOpen(false)} className="btn-ghost mt-1 w-full">
            Keep browsing
          </button>
        </div>
      </aside>
    </div>
  );
}

/** Open the bag drawer from anywhere (header/card buttons). */
export function openCart() {
  window.dispatchEvent(new CustomEvent("cart:open"));
}
