"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { money } from "@/lib/format";
import { STORE_CONFIG, discountFor, type Promo } from "@/lib/store-config";
import { validatePromo, type ValidatedPromo } from "./actions";

export const dynamic = "force-dynamic";

function CheckoutPage() {
  const { items, ready, count, subtotal, setQty, remove } = useCart();
  const [promo, setPromo] = useState<ValidatedPromo | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [hydratedPromo, setHydratedPromo] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    delivery: "standard" | "express";
  }>({
    name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    delivery: "standard",
  });

  // One-time: restore a saved promo from sessionStorage.
  if (ready && !hydratedPromo) {
    const saved = localStorage.getItem("cc_promo");
    if (saved) {
      try {
        setPromo(JSON.parse(saved));
      } catch {}
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

  const savePromo = (p: ValidatedPromo | null) => {
    setPromo(p);
    if (p) localStorage.setItem("cc_promo", JSON.stringify(p));
    else localStorage.removeItem("cc_promo");
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

  if (!ready) {
    return (
      <main className="container-cc pb-20 pt-8 sm:pt-10">
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="skeleton h-40 w-full rounded-[26px]" />
          <div className="skeleton h-64 w-full rounded-[26px]" />
        </div>
      </main>
    );
  }

  if (isEmpty) {
    return (
      <main className="container-cc pb-20 pt-8 sm:pt-10">
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
      </main>
    );
  }

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-ink">Home</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Checkout</span>
      </nav>

      <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">
        Order Summary {count ? <span className="text-ink/40">({count})</span> : null}
      </h1>

      <form className="mt-8 max-w-3xl mx-auto space-y-6">
        {/* Items */}
        <section>
          <div className="rounded-[26px] border border-ink/8 bg-white p-4 shadow-soft">
            <h2 className="font-display text-lg font-extrabold mb-4">Items</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const [c1, c2] = (item.gradient || "").split(",");
                return (
                  <article
                    key={item.id}
                    className="flex gap-2 rounded-[16px] border border-ink/10 bg-white p-3 shadow-soft"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-12 w-12 object-cover rounded"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink truncate">{item.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">Gift</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(item.id, item.qty - 1)}
                        className="grid h-6 w-6 place-items-center rounded-full font-black transition hover:bg-ink/5"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-extrabold tabular">{item.qty}</span>
                      <button
                        onClick={() => setQty(item.id, item.qty + 1)}
                        className="grid h-6 w-6 place-items-center rounded-full font-black transition hover:bg-ink/5"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-display text-lg font-extrabold tabular">
                      {money(item.priceCents * item.qty)}
                    </span>
                  </article>
                );
              })}
              {items.length === 0 && <p className="text-ink/40">No items in bag</p>}
            </div>
          </div>
        </section>

        {/* Pricing Summary */}
        <section>
          <div className="rounded-[26px] border border-ink/8 bg-white p-4 shadow-soft">
            <h2 className="font-display text-lg font-extrabold mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
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
                <span>
                  {shipping === 0
                    ? freeShip
                      ? "FREE (code)"
                      : "FREE"
                    : money(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Tax (5%)</span>
                <span>{money(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-ink/8 pt-3">
                <span className="font-display text-lg font-extrabold">Total</span>
                <span className="font-display text-2xl font-extrabold">
                  {money(total)}
                </span>
              </div>
              {remaining > 0 && (
                <div className="mt-2 text-[10px] font-bold text-ink/60">
                  {remaining} Rs away from free shipping
                </div>
              )}
              {promo?.type === "free_shipping" && (
                <p className="mt-1 text-[10px] text-ink/50">
                  Free shipping over Rs{
                    " " + STORE_CONFIG.free_shipping_threshold_cents / 100
                  }{freeShip ? " (unlocked)" : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Form */}
        <section>
          <div className="rounded-[26px] border border-ink/8 bg-white p-4 shadow-soft">
            <h2 className="font-display text-lg font-extrabold mb-4">
              Customer Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-ink/60 mb-2">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value.trim() })
                  }
                  placeholder="Full name"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-ink/60 mb-2">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value.trim() })
                  }
                  type="email"
                  placeholder="name@example.com"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-ink/60 mb-2">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value.trim() })
                  }
                  placeholder="+92 XXX XXX XXXX"
                  className="input w-full"
                  required
                  minLength="7"
                  maxLength="15"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-ink/60 mb-2">
                  Address Line 1
                </label>
                <input
                  value={form.address1}
                  onChange={(e) =>
                    setForm({ ...form, address1: e.target.value.trim() })
                  }
                  placeholder="Street address"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-ink/60 mb-2">
                  Address Line 2
                </label>
                <input
                  value={form.address2}
                  onChange={(e) =>
                    setForm({ ...form, address2: e.target.value.trim() })
                  }
                  placeholder="Apt, suite, unit (optional)"
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-ink/60 mb-2">
                    City
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value.trim() })
                    }
                    placeholder="City"
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-ink/60 mb-2">
                    State
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value.trim() })
                    }
                    placeholder="State/Province"
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-ink/60 mb-2">
                    Postal Code
                  </label>
                  <input
                    value={form.postal_code}
                    onChange={(e) =>
                      setForm({ ...form, postal_code: e.target.value.trim() })
                    }
                    placeholder="Postal code"
                    className="input w-full"
                    required
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-ink/60 mb-2">
                    Country
                  </label>
                  <input
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value.trim() })
                    }
                    placeholder="Country"
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-ink/60 mb-2">
                  Delivery
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="standard"
                      checked={form.delivery === "standard"}
                      onChange={() => setForm({ ...form, delivery: "standard" })}
                      className="rounded border"
                    >
                    Standard (5-7 days) - Rs{
                      " " + money(STORE_CONFIG.standard_shipping_cents)
                    }
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="express"
                      checked={form.delivery === "express"}
                      onChange={() => setForm({ ...form, delivery: "express" })}
                      className="rounded border"
                    >
                    Express (2-3 days) - Rs{
                      " " + money(STORE_CONFIG.express_shipping_cents)
                    }
                  </label>
                </div>
                {form.delivery === "standard" && afterDiscount < STORE_CONFIG.free_shipping_threshold_cents && (
                  <p className="mt-1 text-[10px] text-ink/50">
                    You're{
                      " " +
                      money(STORE_CONFIG.free_shipping_threshold_cents - afterDiscount) +
                      " away from free standard shipping"
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Promo */}
        {(promo?.type !== "free_shipping" && promoMessage?.ok) ||
        promoMessage?.ok === false ? (
          <section className="mt-6">
            <div className="rounded-[26px] border border-ink/8 bg-white p-4 shadow-soft">
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
            </div>
          </div>
        ) : null}

        {/* Action */}
        <button
          type="button"
          disabled={!ready || items.length === 0}
          className="w-full mt-6 px-6 py-3 font-display font-extrabold text-white bg-gradient-to-r from-iris to-acid rounded-[26x] transition"
          onClick={() => alert("Order placement coming soon!")}
        >
          Place Order →
        </button>
      </form>
    </main>
  );
}

export default CheckoutPage;