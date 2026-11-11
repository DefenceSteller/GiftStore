# Migration Progress — Confetti Club

## Status: Complete ✅ — 6/6 phases done, live on Vercel (updated 2026-11-12)

Express + SQLite → Next.js 16 + TypeScript + Supabase Cloud (`ppolhziswextahhjfggi`).
Branch `nextjs-supabase` · deployed at `confetti-club-alpha.vercel.app` · latest commit `4be796e`.

### What's done
- **Foundation:** Next 16.4.3, React 19.3.1, `@supabase/ssr`, build + typecheck green (38 routes).
- **Supabase clients** (anon server, browser, service role), auth, admin auth, `proxy.ts` role guard.
- **Storefront:** home / shop / product / cart / checkout (3-step wizard) / surprise / track / order-success / profile / contact.
- **Admin shell + pages:** dashboard, orders (incl. Address column), products, customers, promos, settings, activity, analytics.
- **Admin API routes** all use `createServiceClient()` (bypasses RLS) — orders, stats, customers, promos, settings, export/orders.csv, products/[id]/stock.
- **Checkout API + server action** also use service role; postal validation unified to `min(3).max(12)`.
- **Data:** 26 products, 3 promo codes (GIFT10, FREESHIP, WELCOME5), order lifecycle, Stripe + demo payments (`PAYMENT_PROVIDER`).
- **`is_featured` boolean** (migration 018); storefront falls back to `sort_order <= 6`.
- **Reveal animation fix** ported as `RevealInit.tsx` in root layout.
- **CSS:** rebuilt `public/assets/css/styles.css` after adding `.tsx` to `tailwind.config.js` content globs. Verified additive-only (0 declarations lost, 54 new classes). **Note: Tailwind is not recompiled at build time — new classes must be recompiled into this file or they silently do nothing.**
- **Auth-gated per-user carts** (commit `3de89f3`):
  - `AuthProvider.tsx`: server-seeded `initialUser`, `usePathname()` soft-nav sync, `onAuthStateChange`, `visibilitychange`/`pageshow`, and continuous cookie polling for sign-in redirects that land on the same path.
  - `SignInPopout.tsx`: modal shown when a signed-out visitor clicks Add; stashes the product in `sessionStorage` (`cc_pending_add`) and carries the return path as `next`.
  - `CartProvider.tsx`: per-user key `cc_cart_v2:<userId>` (guest = `cc_cart_v2`); re-hydrates on user change; auto-adds the pending product after sign-in and opens the drawer.
  - `AddToCartButton.tsx` / `ProductPurchase.tsx`: gate on signed-out click → popout instead of add.
  - `app/layout.tsx`: passes `initialUser` from `getSessionUser()`; mounts `AuthProvider` → `CartProvider` → `SignInPopout`.
  - `scripts/e2e-auth-cart.js`: 15/15 checks pass (signed-out → popout → sign in → return → scoped cart → auto-add → drawer open).
- **Cart:** signed-out state renders an empty bag (stale guest-cart data cleared), per-user keys for signed-in users.
- **Auth extras:** Google OAuth (`f0558e4`), email confirmation required on signup (`2ec7671`), redesigned login page.
- **Order confirmation email (Brevo)** — `src/lib/order-email.ts`:
  - Brevo **HTTP API** (`POST https://api.brevo.com/v3/smtp/email`, `api-key` header) — SMTP port 587 is blocked on Vercel serverless, HTTPS always works.
  - Sender: verified `Confetti Club <confetticlubadmin@gmail.com>` (no domain verification needed).
  - Branded HTML: order number, items, totals in **Rs (PKR)**, shipping address, **"Track My Order"** CTA.
  - Sent from `app/checkout/actions.ts` after the order insert; **errors are logged only — checkout never fails or blocks because of email**.
  - API key lives in Vercel env `SMTP_USER`; diagnostics: `/api/test-bare`, `/api/test-email`, `/api/env-check`. End-to-end verified (messageId returned).
- **Pakistan defaults** (commit `fcf4364`): country `PK`, currency `PKR` in `store-config.ts`, `validators.ts` (postal 4–5 digits), `checkout/actions.ts`, `api/checkout/route.tsx`, admin settings default.
- **Checkout email pre-fill** (commit `1f6c9b2`): email input `defaultValue={user?.email ?? ""}` — server-seeded `initialUser` keeps server/client render identical (no React #441 hydration error; earlier DOM-mutation attempt removed in `4869acb`). User can still edit the field.
- **Profile page mobile fix** (commit `4be796e`): Account details card forced a 396px min-content width (UUID row), so phones <396px shrink-to-fit zoomed out with blank space on the right. Fix: `min-w-0` on the `aside`. Verified 0 horizontal overflow at 320/360/375/390px; desktop (≥1024px) untouched.
- [x] **Signup confirmation link restored** (commit `031f3b2`): Supabase's `resend({type: "signup"})` is rate-limited (2/hour per address) and fails on fresh signups with `over_email_send_rate_limit` — the action still returned the "check your inbox" success message, so users never got the activation link. Fix: `sendConfirmationLink()` in `app/auth/actions.ts` tries `resend` first, then falls back to `generateLink` + Brevo (`src/lib/signup-email.ts`) so the link always goes out. Verified end-to-end: resend → rate-limit error → generateLink → valid link → Brevo 201 messageId.

### Known issues / gaps
- **Unit tests:** `vitest.config.mjs` configured (jsdom) but no test files written yet.
- **Rate limiting:** exists only in the legacy Express server (`server/middleware/rateLimits.js`); not ported to Next.js public mutation routes (Vercel + Supabase partially mitigate).
- ~~Postal code validation mismatch~~ — fixed: `min(3).max(12)` everywhere (was `^[0-9]{6}$` in the API route).

---

**Last updated:** 2026-11-12  
**Docs:** `docs/plan/` contains the full plan set (MIGRATION_PROGRESS, MIGRATION_WORKLOG, PHASE_2…6) — all phases marked Done.
