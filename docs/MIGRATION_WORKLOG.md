# 📋 Confetti Club — Migration to Next.js + Supabase

## Work Log

> **Status: all 6 phases complete ✅** — migration finished 2026-10-31 (commit `ca8b714` "All phases done"), followed by hardening and enhancements through 2026-11-12.

---

### Phase 1 — Analysis ✅ (2026-08-24)
- [x] Read and cataloged entire Express+SQLite repository
- [x] Documented all database tables & columns (products, orders, order_items, customers, promotions, analytics_events, activity_log, stock_movements, admins)
- [x] Listed every API endpoint (public + admin)
- [x] Extracted all business rules (order lifecycle, pricing, promo, tax, shipping, stock/restock, status transitions, refund/cancel)
- [x] Created feature checklist
- [x] Summary delivered and approved before any code was written

---

### Phase 2 — Target Architecture ✅ (2026-10-31)
- [x] Next.js 16 App Router + TypeScript, Tailwind CSS reusing the original design tokens (ink #0D0D12, iris #7C5CFF, acid #D6FF3E, coral/aqua/butter/bubble; Bricolage Grotesque + Manrope)
- [x] Supabase: Postgres, Auth, Storage, Realtime via `@supabase/ssr` (anon server / browser / service-role clients)
- [x] Server Components for storefront pages; Server Actions + Route Handlers for mutations
- [x] Zod validation on every input (`src/lib/validators.ts`, 15+ schemas)
- [x] `proxy.ts` route guard for role-based redirects (admin/customer)
- [x] Compiled design stylesheet kept at `public/assets/css/styles.css` (Tailwind build verified additive-only)

---

### Phase 3 — Database ✅ (2026-10-31)
- [x] SQLite → Postgres schema in `supabase/migrations/` (products, categories, orders, order_items, order_events, profiles/customers, promo_codes, settings, audit_log, traffic_events)
- [x] UUID PKs, timestamptz, integer cents, enums for order status / payment method
- [x] RLS enabled on every table (public reads catalog; customers read own orders; admins full access)
- [x] RPC functions for atomic operations (place/cancel/refund with stock decrement + restock)
- [x] Seed data: 26 products, 3 promo codes (GIFT10, FREESHIP, WELCOME5)
- [x] `is_featured` boolean added (migration 018); storefront falls back to `sort_order <= 6`

---

### Phase 4 — Auth ✅ (2026-10-31, extended 2026-11-06→09)
- [x] Supabase email/password auth with `profiles` table + role (customer | admin)
- [x] `proxy.ts` protects `/admin`; first admin created via one-time seed (`scripts/seed-admin.mjs`)
- [x] Customer sign-in + "my orders" on the profile page
- [x] Google OAuth added (`f0558e4`)
- [x] Email confirmation required on signup so fake emails can't create usable accounts (`2ec7671`)
- [x] Login page redesigned (`d8f08b9`); auth cookie polling for same-path sign-in redirects
- [x] Server-seeded `initialUser` in root layout → no signed-out flash, no hydration mismatch

---

### Phase 5 — Features ✅ (2026-10-31, commit `b93d109`)
**Storefront (6/6):**
- [x] Home (hero, product grid, reveal animations ported as `RevealInit.tsx`)
- [x] Shop with category filters, price range, search, sort, pagination
- [x] Product page with image, price, add-to-cart, related products
- [x] Cart drawer + cart page (per-user cart keys, free-shipping threshold)
- [x] Checkout: 3-step wizard, sticky sidebar, COD + card, server-side pricing (subtotal/discount/shipping/tax), promo validation
- [x] Order tracking with email verification + timeline; `/order-success` page

**Admin (8/8):**
- [x] Dashboard KPI cards with Supabase Realtime live view
- [x] Orders list with status tabs, search, drawer transitions, Address column (phone + delivery info)
- [x] Products CRUD with image upload to Supabase Storage, `is_featured`
- [x] Customers with lifetime value, order link, CSV export
- [x] Analytics (traffic, funnel, sources, hourly, top pages)
- [x] Settings (store name/announcement/currency/delivery days)
- [x] Promos CRUD with RPC validation
- [x] Activity/audit log with filter + CSV export

**Payments (3/3):**
- [x] Demo provider (4242…→ success, 4000…0002 → decline)
- [x] Stripe Checkout Route Handler + webhook fulfillment (`checkout.session.completed`)
- [x] `PAYMENT_PROVIDER` env var switches demo/stripe

**Extra (post-parity):**
- [x] `/surprise` random gift picker page + Surprise me button in header (`6ebcee2`)
- [x] Header: Admin link removed, Sign out restyled

---

### Phase 6 — Quality and Deploy ✅ (2026-10-31, adapted)
- [x] Security headers in `next.config.mjs` (`headers()` — X-Frame-Options, Content-Security-Policy; CSP later extended for Supabase API fetch `bdcc6f3` and `unsafe-eval` `88c7f88`)
- [x] `.env.example` with full config; `README.md` with setup + deploy steps
- [x] E2E smoke tests as Puppeteer scripts in `scripts/` (replacing Playwright):
  - `e2e-auth-cart.js` — 15/15 checks (signed-out → popout → sign in → scoped cart → auto-add)
  - `e2e-admin-login.js`, `e2e-admin-customers.js`, `e2e-google-oauth.js`, `e2e-order-cart.js`, `e2e-profile.js`
  - `smoke-test.js`, `loadtest.js` (concurrency + p95 load test)
- [x] `vitest.config.mjs` configured (jsdom) — **no unit test files written yet** (gap)
- [ ] Rate limiting — **exists only in legacy Express** (`server/middleware/rateLimits.js`); not ported to the Next.js app (gap — mitigated by Vercel + Supabase but should be added to public mutation routes)
- [x] Deployed: **Vercel** (`confetti-club-alpha.vercel.app`) + **Supabase Cloud** (`ppolhziswextahhjfggi`), branch `nextjs-supabase`

---

## 🛠️ Post-Migration Hardening & Enhancements (Nov 2026)

### Week of Nov 2–9 — parity polish & bug fixes
- **2026-11-02/03:** home page pixel-match (`d580115`, `c3989a8`), admin panel redesign (`6211d1c`), checkout rewritten to 3-step wizard (`020f0ab`), reveal scroll observer port (`a801589`), surprise-me page, product CRUD service-role fixes + `is_featured` column (`bc8cf8c`…`5864ef6`), `.next/` gitignored
- **2026-11-04:** service-role client for checkout API + all admin API routes (`04d8339`, `7e16a90`), `/order-success` page, postal validation relaxed
- **2026-11-05:** **auth-gated per-user carts** (`3de89f3`) — SignInPopout modal, per-user keys `cc_cart_v2:<userId>`, pending-add carry-over after sign-in, e2e 15/15; signed-out bag cleared (`e8933f1`); postal code unified to `min(3).max(12)` (`be55d5c`)
- **2026-11-06/07:** auth fixes (`286effa`), Google OAuth (`f0558e4`), login redesign + cart fix (`d8f08b9`), admin order/product/customer/analytics fixes (`04601cb`, `cafb6aa`, `fda5c4b`)
- **2026-11-08:** contact page (`fd77378`), admin overview/live-traffic/logout (`f7740cc`), admin settings (`ebd7a74`), mobile hamburger header (`feeb8a3`, `a5e6399`, `fc356a6`), compiled CSS incl. mobile breakpoints (`cd77f5f`), favicon (`c995272`), navbar hover parity (`3855e8b`), admin orders Address column (`922387c`), mobile header overflow fixes
- **2026-11-09:** cart drawer breakpoint cascade fixes (`ca09332`, `6df312c`), hero overflow/rotation clipping fixes (`87f53f6`, `7af41c8`), shop sort immediate apply (`56bb048`), **mobile responsive overflow fixes across user + admin pages** (`5247fa8`), analytics purchase-rate >100% fix + unique-visitor dedupe (`93d508b`, `2ca4971`), email confirmation on signup (`2ec7671`), `NEXT_PUBLIC_SITE_URL` → `SITE_URL` (`39ac9d4`), country dropdown removed from checkout (`90e614c`)

### Nov 10–11 — Transactional email, Pakistan defaults, mobile profile fix
- **Order confirmation emails (Brevo):**
  - Started with Resend (`4db165c`), SMTP attempts failed on Vercel serverless (port 587 blocked) → **switched to Brevo HTTP API** (`POST https://api/brevo.com/v3/smtp/email`, `api-key` header) — always works over HTTPS (`661bb3a`)
  - Sender: verified `Confetti Club <confetticlubadmin@gmail.com>` (no custom domain verification needed) (`5416799`)
  - `src/lib/order-email.ts` — branded HTML template with order details, PKR-aware currency (`Rs` vs `$`), **"Track My Order" CTA**
  - Sent from `app/checkout/actions.ts` after order insert; **never blocks or fails checkout** (errors logged only)
  - API key stored in Vercel env `SMTP_USER`; diagnostic endpoints `/api/test-bare`, `/api/test-email`, `/api/env-check`
  - End-to-end verified: `{success: true, messageId: "<202611102236.51487301388@smtp-relay.mailin.fr>"}`
- **Pakistan defaults (`fcf4364`):** default country `PK`, currency `PKR` everywhere — `store-config.ts`, `validators.ts` (postal 4–5 digits), `checkout/actions.ts`, `api/checkout/route.tsx`, admin settings default, test email (Karachi/Sindh/75500)
- **Checkout email pre-fill (`1f6c9b2`):** email input `defaultValue={user?.email ?? ""}` from the logged-in account; user can still edit. Uses server-seeded `initialUser` (no DOM-mutating effect) → no React #441 hydration error (earlier attempt fixed in `4869acb`)
- **Profile page mobile fix (`4be796e`):** Account details card forced a 396px min-content width (UUID row), causing shrink-to-fit zoom-out on phones <396px → added `min-w-0` to the `aside`. Verified 0 horizontal overflow at 320/360/375/390px; desktop (≥1024px) layout unchanged
- CSP: allow browser fetch to Supabase API (`bdcc6f3`)

---

## 📊 Phase Status Overview

| Phase | Status | Completed |
|-------|--------|-----------|
| 1 – Analysis | ✅ Done | 2026-08-24 |
| 2 – Architecture | ✅ Done | 2026-10-31 |
| 3 – Database | ✅ Done | 2026-10-31 |
| 4 – Auth | ✅ Done | 2026-10-31 |
| 5 – Features | ✅ Done | 2026-10-31 |
| 6 – Quality & Deploy | ✅ Done (adapted) | 2026-10-31 |
| Post-migration hardening | ✅ Done | 2026-11-11 |

**Known gaps (not blocking):** unit tests (vitest configured, no files), rate limiting not ported from Express to Next.js.

---

## 📝 Notes

- Work in phases and stop after each for review.
- Do not delete the old Express code until the new app reaches feature parity — **feature parity achieved 2026-10-31**; Express code kept in git history only.
- Short, clear commit messages.
- No placeholder or mock data outside the seed.
- This worklog tracks progress per the `revamp_next.js-supabase.md` plan.
- Layout CSS is a **precompiled** stylesheet (`public/assets/css/styles.css`) — new Tailwind classes must be recompiled into it or they silently do nothing.

---

**Last updated:** 2026-11-12  
**Project:** Confetti Club gift shop migration  
**From:** Express + SQLite + static HTML/Tailwind  
**To:** Next.js (App Router, TypeScript) + Supabase — **live on Vercel**  
**Visual design:** Existing design tokens preserved (ink #0D0D12, iris #7C5CFF, acid #D6FF3E, coral, aqua, butter, bubble; fonts Bricolage Grotesque + Manrope + JetBrains Mono admin)
