"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { money } from "@/lib/format";
import { STORE_CONFIG, discountFor } from "@/lib/store-config";
import { validatePromo, placeOrder, type ValidatedPromo } from "./actions";

type FormErrors = Record<string, string>;

export const dynamic = "force-dynamic";

/* ── helpers ─────────────────────────────────────────────── */
function brandOf(number: string) {
  const d = number.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^6(?:011|5)/.test(d)) return "discover";
  return "";
}

function luhn(num: string) {
  const digits = num.replace(/\D/, "");
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/* ── empty state returned by server actions ─────────────── */
const emptyActionState = {
  errors: {} as FormErrors,
  step: 1 as number,
  submitError: "",
};

/* ── main page ───────────────────────────────────────────── */
export default function CheckoutPage() {
  const { items, ready, count, subtotal, remove, setQty } = useCart();

  // step / UI state
  const [step, setStep] = useState(1);
  const [promo, setPromo] = useState<ValidatedPromo | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // server action state
  const [formState, setFormState] = useState(emptyActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // form refs
  const formRef = useRef<HTMLFormElement>(null);

  // hydrate promo from sessionStorage once
  useEffect(() => {
    if (!ready) return;
    try {
      const saved = sessionStorage.getItem("cc_promo");
      if (saved) {
        const p = JSON.parse(saved) as ValidatedPromo;
        setPromo(p);
      }
    } catch { /* ignore */ }
    // restore previously highlighted field from server validation
    if (formState.errors.firstName) scrollToField("c-first");
    else if (formState.errors.lastName) scrollToField("c-last");
    else if (formState.errors.email) scrollToField("c-email");
    else if (formState.errors.phone) scrollToField("c-phone");
    else if (formState.errors.address1) scrollToField("a-address1");
    else if (formState.errors.city) scrollToField("a-city");
    else if (formState.errors.state) scrollToField("a-state");
    else if (formState.errors.postal) scrollToField("a-zip");
    else if (formState.errors["card-number"]) scrollToField("card-number");
  }, [ready, formState.errors]);

  function scrollToField(id: string) {
    setTimeout(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  /* ── pricing derived state ─────────────────────────────── */
  const discount = discountFor(subtotal, promo);
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShip = promo?.type === "free_shipping";
  const shippingCost =
    freeShip || afterDiscount >= STORE_CONFIG.free_shipping_threshold_cents
      ? 0
      : STORE_CONFIG.standard_shipping_cents;
  const tax = Math.round((afterDiscount * STORE_CONFIG.tax_rate_bps) / 10000);
  const total = afterDiscount + shippingCost + tax;

  /* ── promo submit ──────────────────────────────────────── */
  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoMsg({ text: "Checking…", ok: true });
    const result = await validatePromo(promoInput);
    if (result.ok && result.promo) {
      setPromo(result.promo);
      sessionStorage.setItem("cc_promo", JSON.stringify(result.promo));
      setPromoMsg({ text: result.message, ok: true });
    } else {
      setPromo(null);
      sessionStorage.removeItem("cc_promo");
      setPromoMsg({ text: result.message, ok: false });
    }
    setPromoInput("");
  };

  /* ── step validation ───────────────────────────────────── */
  const validateStep1 = (): boolean => {
    const errors: FormErrors = {};
    const first = (document.getElementById("c-first") as HTMLInputElement)?.value.trim();
    const last = (document.getElementById("c-last") as HTMLInputElement)?.value.trim();
    const email = (document.getElementById("c-email") as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById("c-phone") as HTMLInputElement)?.value.trim();
    const address1 = (document.getElementById("a-address1") as HTMLInputElement)?.value.trim();
    const city = (document.getElementById("a-city") as HTMLInputElement)?.value.trim();
    const state = (document.getElementById("a-state") as HTMLInputElement)?.value.trim();
    const zip = (document.getElementById("a-zip") as HTMLInputElement)?.value.trim();

    if (!first) errors.firstName = "First name is required";
    if (!last) errors.lastName = "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email";
    if (phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone";
    if (address1.length < 3) errors.address1 = "Street address required";
    if (city.length < 2) errors.city = "City required";
    if (state.length < 2) errors.state = "State required";
    if (zip.length < 3) errors.postal = "ZIP required";

    setFormState({ ...emptyActionState, errors, step: 1 });

    if (Object.keys(errors).length > 0) {
      const firstErr = Object.keys(errors)[0];
      const idMap: Record<string, string> = {
        firstName: "c-first", lastName: "c-last", email: "c-email",
        phone: "c-phone", address1: "a-address1", city: "a-city",
        state: "a-state", postal: "a-zip",
      };
      setTimeout(() => document.getElementById(idMap[firstErr])?.focus(), 50);
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const errors: FormErrors = {};
    const method = (document.querySelector('input[name="payment"]:checked') as HTMLInputElement)?.value;

    if (method === "cod") {
      setFormState({ ...emptyActionState, step: 2 });
      return true;
    }

    const number = (document.getElementById("card-number") as HTMLInputElement)?.value.trim();
    const cardName = (document.getElementById("card-name") as HTMLInputElement)?.value.trim();
    const exp = (document.getElementById("card-exp") as HTMLInputElement)?.value.trim();
    const cvc = (document.getElementById("card-cvc") as HTMLInputElement)?.value.trim();

    if (!luhn(number)) errors["card-number"] = "That card number is not valid";
    if (cardName.length < 2) errors["card-name"] = "Name required";
    const expMatch = /^(\d{2})\s*\/\s*(\d{2})$/.exec(exp);
    if (!expMatch) errors["card-exp"] = "Use MM/YY";
    else {
      const end = new Date(2000 + Number(expMatch[2]), Number(expMatch[1]) - 1, 1);
      if (Number(expMatch[1]) < 1 || Number(expMatch[1]) > 12 || end < new Date()) {
        errors["card-exp"] = "Card expired";
      }
    }
    if (!/^\d{3,4}$/.test(cvc)) errors["card-cvc"] = "3–4 digits";

    setFormState({ ...emptyActionState, errors, step: 2 });

    if (Object.keys(errors).length > 0) {
      const idMap: Record<string, string> = {
        "card-number": "card-number", "card-name": "card-name",
        "card-exp": "card-exp", "card-cvc": "card-cvc",
      };
      setTimeout(() => {
        const firstErr = Object.keys(errors)[0];
        document.getElementById(idMap[firstErr])?.focus();
      }, 50);
      return false;
    }
    return true;
  };

  /* ── next / back handlers ──────────────────────────────── */
  const handleNext = (nextStep: number) => {
    if (nextStep === 2 && !validateStep1()) return;
    if (nextStep === 3 && !validateStep2()) return;
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = (prevStep: number) => {
    setStep(prevStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── review content (computed) ─────────────────────────── */
  const getReviewName = () => {
    const first = (document.getElementById("c-first") as HTMLInputElement)?.value.trim() ?? "";
    const last = (document.getElementById("c-last") as HTMLInputElement)?.value.trim() ?? "";
    return `${first} ${last}`.trim();
  };
  const getReviewAddress = () => {
    const parts = [
      (document.getElementById("a-address1") as HTMLInputElement)?.value.trim(),
      (document.getElementById("a-address2") as HTMLInputElement)?.value.trim(),
      (document.getElementById("a-city") as HTMLInputElement)?.value.trim(),
      (document.getElementById("a-state") as HTMLInputElement)?.value.trim(),
      (document.getElementById("a-zip") as HTMLInputElement)?.value.trim(),
    ].filter(Boolean);
    return parts.join(", ");
  };
  const getReviewContact = () => {
    const email = (document.getElementById("c-email") as HTMLInputElement)?.value.trim() ?? "";
    const phone = (document.getElementById("c-phone") as HTMLInputElement)?.value.trim() ?? "";
    return `${email} · ${phone}`;
  };
  const getReviewPayment = () => {
    const method = (document.querySelector('input[name="payment"]:checked') as HTMLInputElement)?.value;
    if (method === "cod") return "💵 Pay on delivery";
    const number = (document.getElementById("card-number") as HTMLInputElement)?.value.trim() ?? "";
    const last4 = number.replace(/\D/g, "").slice(-4);
    const brand = brandOf(number).toUpperCase();
    return `💳 ${brand || "CARD"} •••• ${last4}`;
  };
  const getReviewDelivery = () => {
    const method = (document.querySelector('input[name="delivery"]:checked') as HTMLInputElement)?.value;
    if (method === "express") {
      const days = STORE_CONFIG.delivery_days_express ?? "2–3";
      return `⚡ Express — arrives in ${days} days`;
    }
    const days = STORE_CONFIG.delivery_days_standard ?? "5–7";
    return `🚚 Standard — arrives in ${days} days`;
  };

  /* ── place order handler ───────────────────────────────── */
  const handlePlaceOrder = async () => {
    if (!validateStep1()) return;
    if ((document.querySelector('input[name="payment"]:checked') as HTMLInputElement)?.value !== "cod" && !validateStep2()) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("cartItems", JSON.stringify(items));
    formData.set("promoCode", promo?.code ?? "");
    formData.set("delivery", (document.querySelector('input[name="delivery"]:checked') as HTMLInputElement)?.value ?? "standard");

    // contact fields
    const getField = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value ?? "";
    formData.set("name", `${getField("c-first")} ${getField("c-last")}`.trim());
    formData.set("email", getField("c-email"));
    formData.set("phone", getField("c-phone"));

    // shipping fields
    formData.set("address1", getField("a-address1"));
    formData.set("address2", getField("a-address2"));
    formData.set("city", getField("a-city"));
    formData.set("state", getField("a-state"));
    formData.set("postal_code", getField("a-zip"));
    formData.set("country", getField("a-country"));

    // payment method
    const paymentMethod = (document.querySelector('input[name="payment"]:checked') as HTMLInputElement)?.value ?? "card";
    formData.set("payment_method", paymentMethod);

    if (paymentMethod === "card") {
      formData.set("card_number", getField("card-number"));
      formData.set("card_name", getField("card-name"));
      formData.set("card_exp", getField("card-exp"));
      formData.set("card_cvc", getField("card-cvc"));
    }

    try {
      await placeOrder({} as any, formData);
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      if (err?.fields) {
        setFormState({ ...emptyActionState, errors: err.fields as FormErrors, step: 1 });
      } else {
        setFormState({ ...emptyActionState, submitError: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── empty cart ────────────────────────────────────────── */
  if (!ready) {
    return (
      <main className="container-cc pb-24 pt-8">
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_370px]">
          <div className="skeleton h-96 w-full rounded-[28px]" />
          <div className="skeleton h-64 w-full rounded-[28px]" />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container-cc pb-24 pt-8">
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

  /* ── render ────────────────────────────────────────────── */
  return (
    <main className="container-cc pb-24 pt-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-iris">
            🔒 Secure checkout
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">
            Almost theirs.
          </h1>
        </div>

        {/* Step pills */}
        <ol className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
          {([1, 2, 3] as const).map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => { if (s < step) handleBack(s); }}
                data-step-pill={s}
                className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 transition ${
                  s <= step
                    ? "border-ink bg-ink text-white shadow-sticker-sm"
                    : "border-ink/15 bg-white text-ink/50"
                }`}
                disabled={s > step}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${
                    s <= step ? "bg-acid text-ink" : "bg-ink/10"
                  }`}
                >
                  {s}
                </span>
                {s === 1 && "Details"}
                {s === 2 && "Payment"}
                {s === 3 && "Review"}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Main grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_370px]">
        {/* Left: form steps */}
        <div>
          {/* ── STEP 1: Details ── */}
          <section
            data-step="1"
            className={`rounded-[28px] border border-ink/8 bg-white p-6 shadow-soft sm:p-7 ${
              step !== 1 ? "hidden" : ""
            }`}
          >
            <h2 className="font-display text-xl font-extrabold">
              Where&apos;s it going?{" "}
              <span className="ml-1 text-base font-bold text-ink/40">1 of 3</span>
            </h2>

            {/* Contact */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-first" className="label">First name</label>
                <input
                  id="c-first"
                  className="input"
                  autoComplete="given-name"
                  required
                />
                {formState.errors.firstName && (
                  <p className="field-error show" data-error-for="c-first">{formState.errors.firstName}</p>
                )}
              </div>
              <div>
                <label htmlFor="c-last" className="label">Last name</label>
                <input
                  id="c-last"
                  className="input"
                  autoComplete="family-name"
                  required
                />
                {formState.errors.lastName && (
                  <p className="field-error show" data-error-for="c-last">{formState.errors.lastName}</p>
                )}
              </div>
              <div>
                <label htmlFor="c-email" className="label">
                  Email{" "}
                  <span className="font-bold text-ink/35">(for receipt + tracking)</span>
                </label>
                <input
                  id="c-email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  required
                />
                {formState.errors.email && (
                  <p className="field-error show" data-error-for="c-email">{formState.errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="c-phone" className="label">
                  Phone{" "}
                  <span className="font-bold text-ink/35">(delivery updates)</span>
                </label>
                <input
                  id="c-phone"
                  type="tel"
                  className="input"
                  autoComplete="tel"
                  placeholder="555 123 4567"
                  required
                />
                {formState.errors.phone && (
                  <p className="field-error show" data-error-for="c-phone">{formState.errors.phone}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="mt-5 grid gap-4">
              <div>
                <label htmlFor="a-address1" className="label">Street address</label>
                <input
                  id="a-address1"
                  className="input"
                  autoComplete="address-line1"
                  placeholder="123 Maple St"
                  required
                />
                {formState.errors.address1 && (
                  <p className="field-error show" data-error-for="a-address1">{formState.errors.address1}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="a-address2" className="label">
                    Apt / suite{" "}
                    <span className="font-bold text-ink/35">(optional)</span>
                  </label>
                  <input
                    id="a-address2"
                    className="input"
                    autoComplete="address-line2"
                  />
                </div>
                <div>
                  <label htmlFor="a-city" className="label">City</label>
                  <input
                    id="a-city"
                    className="input"
                    autoComplete="address-level2"
                    required
                  />
                  {formState.errors.city && (
                    <p className="field-error show" data-error-for="a-city">{formState.errors.city}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="a-state" className="label">State</label>
                  <input
                    id="a-state"
                    className="input"
                    autoComplete="address-level1"
                    placeholder="TX"
                    maxLength={40}
                    required
                  />
                  {formState.errors.state && (
                    <p className="field-error show" data-error-for="a-state">{formState.errors.state}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="a-zip" className="label">ZIP code</label>
                  <input
                    id="a-zip"
                    className="input"
                    autoComplete="postal-code"
                    placeholder="78701"
                    required
                  />
                  {formState.errors.postal && (
                    <p className="field-error show" data-error-for="a-zip">{formState.errors.postal}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="a-country" className="label">Country</label>
                  <select
                    id="a-country"
                    className="input"
                    autoComplete="country"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="NZ">New Zealand</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Delivery */}
            <h3 className="mt-7 font-display text-base font-extrabold">Delivery speed</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-ink bg-mist p-4 transition has-[:checked]:shadow-sticker-sm">
                <input
                  type="radio"
                  name="delivery"
                  value="standard"
                  defaultChecked
                  className="mt-1 accent-iris"
                />
                <span>
                  <span className="block text-sm font-extrabold">Standard 🚚</span>
                  <span className="block text-xs font-bold text-ink/55">
                    Arrives in{" "}
                    <span data-days-standard={STORE_CONFIG.delivery_days_standard ?? "5–7"}>
                      {STORE_CONFIG.delivery_days_standard ?? "5–7"}
                    </span>{" "}
                    days
                  </span>
                  <span className="mt-1 block text-sm font-extrabold" id="ship-standard-label">
                    Free over Rs {Math.round(STORE_CONFIG.free_shipping_threshold_cents / 100)}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-ink/15 bg-white p-4 transition has-[:checked]:border-ink has-[:checked]:shadow-sticker-sm">
                <input
                  type="radio"
                  name="delivery"
                  value="express"
                  className="mt-1 accent-iris"
                />
                <span>
                  <span className="block text-sm font-extrabold">Express ⚡</span>
                  <span className="block text-xs font-bold text-ink/55">
                    Arrives in{" "}
                    <span data-days-express={STORE_CONFIG.delivery_days_express ?? "2–3"}>
                      {STORE_CONFIG.delivery_days_express ?? "2–3"}
                    </span>{" "}
                    days
                  </span>
                  <span className="mt-1 block text-sm font-extrabold" id="ship-express-label">
                    {money(STORE_CONFIG.express_shipping_cents)}
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-7 flex justify-end">
              <button
                type="button"
                className="btn-primary text-base"
                onClick={() => handleNext(2)}
              >
                Continue to payment →
              </button>
            </div>
          </section>

          {/* ── STEP 2: Payment ── */}
          <section
            data-step="2"
            className={`rounded-[28px] border border-ink/8 bg-white p-6 shadow-soft sm:p-7 ${
              step !== 2 ? "hidden" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-extrabold">
                How are you paying?{" "}
                <span className="ml-1 text-base font-bold text-ink/40">2 of 3</span>
              </h2>
              <button
                type="button"
                className="text-xs font-extrabold text-ink/45 transition hover:text-ink"
                onClick={() => handleBack(1)}
              >
                ← Edit details
              </button>
            </div>

            {/* Payment method */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink bg-mist p-4 transition has-[:checked]:shadow-sticker-sm">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  defaultChecked
                  className="accent-iris"
                />
                <span className="text-sm font-extrabold">💳 Card</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink/15 bg-white p-4 transition has-[:checked]:border-ink has-[:checked]:shadow-sticker-sm">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  className="accent-iris"
                />
                <span className="text-sm font-extrabold">💵 Pay on delivery</span>
              </label>
            </div>

            {/* Card fields */}
            <div id="card-fields" className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="card-number" className="label">Card number</label>
                <div className="relative">
                  <input
                    id="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className="input pr-24 tracking-widest"
                    placeholder="4242 4242 4242 4242"
                    maxLength={23}
                  />
                  <span
                    id="card-brand"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-ink/40"
                  />
                </div>
                {formState.errors["card-number"] && (
                  <p className="field-error show" data-error-for="card-number">
                    {formState.errors["card-number"]}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="card-name" className="label">Name on card</label>
                <input
                  id="card-name"
                  autoComplete="cc-name"
                  className="input"
                  placeholder="ALEX RIVERA"
                />
                {formState.errors["card-name"] && (
                  <p className="field-error show" data-error-for="card-name">
                    {formState.errors["card-name"]}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="card-exp" className="label">Expiry (MM/YY)</label>
                <input
                  id="card-exp"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  className="input"
                  placeholder="12/29"
                  maxLength={5}
                />
                {formState.errors["card-exp"] && (
                  <p className="field-error show" data-error-for="card-exp">
                    {formState.errors["card-exp"]}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="card-cvc" className="label">CVC</label>
                <input
                  id="card-cvc"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  className="input"
                  placeholder="123"
                  maxLength={4}
                />
                {formState.errors["card-cvc"] && (
                  <p className="field-error show" data-error-for="card-cvc">
                    {formState.errors["card-cvc"]}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 rounded-2xl bg-mist p-4 text-xs font-bold text-ink/55">
                🔒 Demo payments are processed by our sandbox provider —{" "}
                <strong>no real charge will be made</strong> and card details are never stored on
                our servers. Use any Luhn-valid number (e.g.{" "}
                <span className="font-mono">4242 4242 4242 4242</span>) or a future expiry date.
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => handleBack(1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn-primary text-base"
                onClick={() => handleNext(3)}
              >
                Review order →
              </button>
            </div>
          </section>

          {/* ── STEP 3: Review ── */}
          <section
            data-step="3"
            className={`rounded-[28px] border border-ink/8 bg-white p-6 shadow-soft sm:p-7 ${
              step !== 3 ? "hidden" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-extrabold">
                Give it one last look{" "}
                <span className="ml-1 text-base font-bold text-ink/40">3 of 3</span>
              </h2>
              <button
                type="button"
                className="text-xs font-extrabold text-ink/45 transition hover:text-ink"
                onClick={() => handleBack(2)}
              >
                ← Edit payment
              </button>
            </div>

            {/* Review info */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-ink/40">
                  Shipping to
                </p>
                <p id="review-name" className="mt-1.5 text-sm font-extrabold">{getReviewName()}</p>
                <p id="review-address" className="text-sm font-semibold text-ink/60">{getReviewAddress()}</p>
                <p id="review-contact" className="mt-1 text-xs font-bold text-ink/45">{getReviewContact()}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-extrabold text-iris"
                  onClick={() => handleBack(1)}
                >
                  Edit
                </button>
              </div>
              <div className="rounded-2xl border border-ink/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-ink/40">
                  Payment
                </p>
                <p id="review-payment" className="mt-1.5 text-sm font-extrabold">{getReviewPayment()}</p>
                <p id="review-delivery" className="text-sm font-semibold text-ink/60">{getReviewDelivery()}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-extrabold text-iris"
                  onClick={() => handleBack(2)}
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Items review */}
            <div className="mt-5 rounded-2xl border border-ink/10">
              <div className="divide-y divide-ink/8">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 truncate text-sm font-extrabold">
                      {item.qty} × {item.name}
                    </span>
                    <span className="text-sm font-extrabold tabular">
                      {money(item.priceCents * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-ink/10 bg-mist px-4 py-3">
                <span className="text-sm font-extrabold">Total due today</span>
                <span className="font-display text-2xl font-extrabold tabular">{money(total)}</span>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => handleBack(2)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn-lime text-base"
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing…" : "🎁 Place order"}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] font-bold text-ink/45">
              By placing this order you agree to our (imaginary) terms. 30-day returns, always.
            </p>

            {formState.submitError && (
              <p className="mt-3 rounded-xl bg-coral/10 border border-coral/30 p-3 text-sm font-bold text-coral text-center">
                {formState.submitError}
              </p>
            )}
          </section>
        </div>

        {/* Right: sticky summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border-2 border-ink bg-white p-6 shadow-sticker">
            <h2 className="font-display text-lg font-extrabold">Your items</h2>
            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span
                    className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-lg"
                    style={{
                      background: `linear-gradient(135deg, ${(item.gradient || "").split(",")[0]}, ${(item.gradient || "").split(",")[1] || "#000"})`,
                    }}
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-black text-white">
                      {item.qty}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">
                    {item.name}
                  </span>
                  <span className="text-[13px] font-extrabold tabular">
                    {money(item.priceCents * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-ink/10 pt-4 text-sm font-bold">
              <div className="flex justify-between">
                <dt className="text-ink/55">Subtotal</dt>
                <dd className="tabular">{money(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-iris">
                  <dt>Discount</dt>
                  <dd className="tabular">-{money(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink/55">Shipping</dt>
                <dd className="tabular">{shippingCost === 0 ? "FREE" : money(shippingCost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/55">
                  Tax{" "}
                  <span className="text-ink/35">({(STORE_CONFIG.tax_rate_bps / 100).toFixed(2)}%)</span>
                </dt>
                <dd className="tabular">{money(tax)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-end justify-between border-t border-ink/10 pt-3">
              <span className="text-sm font-extrabold text-ink/60">Total</span>
              <span className="font-display text-2xl font-extrabold tabular">{money(total)}</span>
            </div>

            {promo && (
              <p id="ck-promo-note" className="mt-3 rounded-xl bg-acid/40 px-3 py-2 text-xs font-extrabold">
                🏷️ {promo.code} — {promo.description || "applied"}
              </p>
            )}

            {/* Promo input */}
            <form onSubmit={handlePromoSubmit} className="mt-4 flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Promo code"
                className="input flex-1 uppercase text-xs"
                autoComplete="off"
              />
              <button type="submit" className="btn-outline btn-sm shrink-0">
                Apply
              </button>
            </form>
            {promoMsg && (
              <p
                className={`mt-2 text-xs font-extrabold ${promoMsg.ok ? "text-iris" : "text-coral"}`}
              >
                {promoMsg.text}
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
