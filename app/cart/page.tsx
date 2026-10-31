"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { money } from "@/lib/format";
import { STORE_CONFIG, discountFor, type Promo } from "@/lib/store-config";
import { validatePromo } from "./actions";

const PROMO_KEY = "cc_promo";

function loadPromo(): Promo | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(PROMO_KEY) || "null");
  } catch {
    return null;
  }
}

export default function CartPage() {
  const { items, ready, count, subtotal, setQty, remove } = useCart();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [hydratedPromo, setHydratedPromo] = useState(false);

  // One-time: restore a saved promo from sessionStorage.
  if (ready && !hydratedPromo) {
    const saved = loadPromo();
    if (saved) {
      setPromo(saved);
      setPromoInput(saved.code);
    }
    setHydratedPromo(true);
  }

  const discount = discountFor(subtotal, promo);
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShip = promo?.type === "free_shipping";
  const shipping =
    freeShip || afterDiscount >= STORE_CONFIG.free_shipping_threshold_cents
      ? 0
      : STORE_CONFIG.standard_shipping_cents;
  const tax = Math.round((afterDiscount * STORE_CONFIG.tax_rate_bps) / 10000);
  const total = afterDiscount + shipping + tax;

  const pct = Math.min(
    100,
    Math.round((afterDiscount / STORE_CONFIG.free_shipping_threshold_cents) * 100)
  );
  const remaining = Math.max(
    0,
    STORE_CONFIG.free_shipping_threshold_cents - afterDiscount
  );

  const savePromo = (p: Promo | null) => {
    setPromo(p);
    if (p) sessionStorage.setItem(PROMO_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PROMO_KEY);
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoMessage({ text: "Checking…", ok: true });
    const result = await validatePromo(promoInput);
    if (result.ok && result.promo) {
      savePromo(result.promo);
      setPromoMessage({ text: result.message, ok: true });
    } else {
      savePromo(null);
      setPromoMessage({ text: result.message, ok: false });
    }
  };

  const isEmpty = items.length === 0;

  return (
    <main className="container-cc pb-20 pt-8 sm:pt-10">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-ink">Home</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Bag</span>
      </nav>

      <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">
        Your bag {count ? <span className="text-ink/40">({count})</span> : null}
      </h1>

      {!ready ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="skeleton h-40 w-full rounded-[26px]" />
          <div className="skeleton h-64 w-full rounded-[26px]" />
        </div>
      ) : isEmpty ? (
        <div className="mt-8 rounded-[28px] border-2 border-dashed border-ink/15 p-16 text-center">
          <span className="text-6xl">🛒</span>
          <h2 className="mt-4 font-display text-2xl font-extrabold">Your bag is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-ink/55">
            Fix that. Future you (and whoever gets the gift) will say thanks.
          </p>
          <Link href="/shop" className="btn-lime mt-6 inline-block px-6 py-3">
            Shop the drop
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Items */}
          <section className="space-y-4">
            {items.map((item) => {
              const [c1, c2] = (item.gradient || "").split(",");
              return (
                <article
                  key={item.id}
                  className="flex gap-4 rounded-[26px] border border-ink/8 bg-white p-4 shadow-soft sm:gap-5 sm:p-5"
                >
                  <Link
                    href={`/product/${encodeURIComponent(item.slug)}`}
                    className="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-ink/10 sm:h-32 sm:w-32"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">Gift</p>
                        <h2 className="truncate font-display text-lg font-extrabold sm:text-xl">
                          <Link href={`/product/${encodeURIComponent(item.slug)}`} className="transition hover:text-iris">
                            {item.name}
                          </Link>
                        </h2>
                        <p className="mt-0.5 text-sm font-bold text-ink/50">{money(item.priceCents)} each</p>
                      </div>
                      <button onClick={() => remove(item.id)} className="text-ink/35 transition hover:text-coral" aria-label="Remove">
                        ✕
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <div className="flex items-center gap-1 rounded-full border-2 border-ink/10 p-1">
                        <button onClick={() => setQty(item.id, item.qty - 1)} className="grid h-8 w-8 place-items-center rounded-full font-black transition hover:bg-ink/5" aria-label="Decrease">−</button>
                        <span className="w-7 text-center font-extrabold tabular">{item.qty}</span>
                        <button onClick={() => setQty(item.id, item.qty + 1)} className="grid h-8 w-8 place-items-center rounded-full font-black transition hover:bg-ink/5" aria-label="Increase">＋</button>
                      </div>
                      <span className="font-display text-xl font-extrabold tabular">{money(item.priceCents * item.qty)}</span>
                    </div>
                  </div>
                </article>
              );
            })}

            <Link href="/shop" className="btn-outline btn-sm inline-block">← Keep shopping</Link>
          </section>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[26px] border border-ink/8 bg-white p-5 shadow-soft">
              {/* Free shipping progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[13px] font-bold">
                  <span className="text-ink/60">
                    {remaining > 0 ? `${money(remaining)} to free shipping` : "Free shipping unlocked 🎉"}
                  </span>
                  <span className="text-ink">{pct}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-iris to-acid transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Promo */}
              <form onSubmit={handlePromoSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo code"
                  className="input flex-1 uppercase"
                  autoComplete="off"
                />
                <button type="submit" className="btn-outline btn-sm shrink-0">Apply</button>
              </form>
              {promoMessage && (
                <p className={`mt-2 text-xs font-extrabold ${promoMessage.ok ? "text-iris" : "text-coral"}`}>
                  {promoMessage.text}
                </p>
              )}

              <div className="mt-5 space-y-2 border-t border-ink/8 pt-4 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-ink/60">Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                {(discount > 0 || freeShip) && (
                  <div className="flex justify-between text-iris">
                    <span>Discount {promo ? `(${promo.code})` : ""}</span>
                    <span>-{money(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink/60">Shipping</span>
                  <span>{shipping === 0 ? (freeShip ? "FREE (code)" : "FREE") : money(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Tax (5%)</span>
                  <span>{money(tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-ink/8 pt-3">
                  <span className="font-display text-lg font-extrabold">Total</span>
                  <span className="font-display text-2xl font-extrabold">{money(total)}</span>
                </div>
              </div>

              <Link href="/checkout" className="btn-primary mt-4 block w-full text-center">
                Checkout →
              </Link>
              <p className="mt-2 text-center text-xs font-semibold text-ink/45">
                Shipping &amp; tax calculated at checkout.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
