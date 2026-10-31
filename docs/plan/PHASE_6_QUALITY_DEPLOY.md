# 📦 Phase 6: Quality and Deploy

**Status:** Starting  
**Started:** 2026-09-10  
**Estimated completion:** 2026-09-12

## 6.1 Quality Assurance

### 6.1.1 Unit Tests

**Pricing logic tests** (`__tests__/pricing.test.ts`):
- [ ] `priceCart()` returns correct subtotal, discount, shipping, tax, total
- [ ] Promo code `GIFT10` gives 10% off orders over Rs 3000
- [ ] Promo code `FREESHIP` waives shipping fee when subtotal ≥ Rs 5000
- [ ] Promo code `WELCOME5` gives Rs 5 off orders over Rs 2500
- [ ] Shipping is free when subtotal ≥ free_shipping_threshold_cents
- [ ] Express shipping costs more when subtotal < threshold
- [ ] Tax calculated as `subtotal × tax_rate_bps / 100`

**Order-state logic tests** (`__tests__/order-state.test.ts`):
- [ ] Status transition: pending → paid → packed → shipped → delivered
- [ ] Cancel at any stage restocks items, status = 'cancelled'
- [ ] Refund at packed/shipped/delivered → status = 'refunded'
- [ ] `place_order()` RPC atomicity: if stock insufficient, order fails, no side effects
- [ ] `cancel_order()` RPC restocks items correctly

**Zod validation tests** (`__tests__/validation.test.ts`):
- [ ] Contact form: name (min 1), email (valid format), phone (7-15 digits)
- [ ] Shipping address: all fields required, postal code 6 digits
- [ ] Payment card: Luhn check, expiry MM/YY future, name non-empty
- [ ] Promo code: format check, expiry check, min_subtotal check
- [ ] Admin password: min 1 cent confirmed match

**Run:** `pnpm test` or `vitest run` — 100% pass required.

### 6.1.2 Playwright Smoke Test

**`e2e/checkout.test.ts`** — Full checkout flow:

1. Visit `/`
2. Click on featured product → product page
3. Add to cart
   - [ ] Cart drawer opens, item shown with price in Rs
   - [ ] Quantity adjusted, subtotal updates
4. Click "Proceed to checkout"
   - [ ] Form: name, email, phone, shipping address
   - [ ] Free shipping banner: "Free over Rs 50"
   - [ ] Stripe card field (or demo card selector)
5. Click "Place Order"
   - [ ] Demo: card `4242 4242 4242 4242` → success → order number CC-XXXXX displayed
   - [ ] Demo: card `4000 0000 0000 0002` → 402 error shown
   - [ ] Stripe: redirects to Hosted Page, returns on success
6. Order confirmation page shows:
   - [ ] Order number
   - [ ] Items with prices in Rs
   - [ ] Estimated delivery date
   - [ ] "Track order" button → `/track/[orderNumber]`

**Run:** `pnpm playwright test` — headless Chromium, 3 retries.

### 6.1.3 Security Tests

- [ ] Helmet CSP headers present: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ...`
- [ ] `x-powered-by: null` header
- [ ] Rate limiting active on `/api/checkout`, `/api/admin/*`
- [ ] CSRF token check on mutation routes (JSON content-type check)
- [ ] Supabase Auth session verified on every protected route
- [ ] No sensitive data in URLs (order numbers, emails not exposed in path)

### 6.1.4 Cross-Browser Testing

- [ ] Chromium (default Playwright)
- [ ] Firefox — verify Tailwind rendering, no flex gaps
- [ ] WebKit (Safari) — verify responsive grid, no `gap` issues, `font-family` preserved

### 6.1.5 Performance Tests

- [ ] Lighthouse score > 90 for Performance, Accessibility, Best Practices, SEO
- [ ] First Contentful Paint < 1.5s on home page
- [ ] Time to Interactive < 3s on product page
- [ ] No CLS (Cumulative Layout Shift) > 0.1
- [ ] Image loading: `loading="lazy"` on all product images, `width`/`height` attributes preserved

### 6.1.9 Accessibility (a11y)

- [ ] All images have `alt` text (product name or descriptive)
- [ ] Form labels associated with inputs via `htmlFor`/`id`
- [ ] Focus visible state on all interactive elements
- [ ] Color contrast: ink `#0D0D12` text on acid `#D6FF3E` background passes WCAG AA
- [ ] Skip link at top of page (`<a href="#main">Skip to content</a>`)
- [ ] `aria-current="page"` on active pagination links
- [ ] `role="dialog"` on modals (product form, promo create, etc.)

---

## 6.2 Deployment

### 6.2.1 Local Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd giftshop

# 2. Environment variables
cp .env.example .env
# Edit .env with:
#   NEXT_PUBLIC_SUPABASE_URL=__
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=__
#   SUPABASE_SERVICE_ROLE_KEY=__
#   STRIPE_PUBLIC_KEY=__ (optional)
#   STRIPE_SECRET_KEY=__ (optional)
#   STRIPE_WEBHOOK_SECRET=__ (optional)

# 3. Install dependencies
pnpm install  # or npm install

# 4. Build Tailwind + TypeScript
pnpm run build  # or: next build

# 5. Start database locally
supabase start

# 6. Run migrations (run once)
supabase db reset  # executes supabase/migrations/

# 7. Seed demo data
psql -a -f supabase/seed.sql  # or via supabase SQL editor

# 8. Start dev server
pnpm run dev  # or: next dev — visits http://localhost:3000
```

### 6.2.2 Vercel Deployment

```bash
# 1. Connect repo to Vercel
# 2. Add environment variables in Vercel Dashboard:
#   - NEXT_PUBLIC_SUPABASE_URL
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - SUPABASE_SERVICE_ROLE_KEY
#   - STRIPE_PUBLIC_KEY (optional)
#   - STRIPE_SECRET_KEY (optional)
#   - STRIPE_WEBHOOK_SECRET (optional)

# 3. Vercel automatically runs `next build` on deploy
# 4. Supabase Realtime works via Vercel Edge Functions if needed

# 4. Set environment variable:
VERCEL_URL=your-project.vercel.app
# Then in code, use VERCEL_URL for redirect URLs, cookie domains, etc.
```

### 6.2.3 Supabase Dashboard Settings

- **Authentication → Email settings:** From email, reply-to, branding
- **Authentication → URL Config:** `Site URL` = `https://vercel.app` (or deployed URL)
- **Authentication → Redirect URLs:** `https://your-domain.com/auth/callback`
- **Storage → bucket `product-images`:** Public access, `Allowed origins` = `*`

### 6.2.4 Environment Variable Checklist

```
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (keep secret!)
STRIPE_PUBLIC_KEY=pk_test_******************
STRIPE_SECRET_KEY=sk_live_****************** (keep secret!)
STRIPE_WEBHOOK_SECRET=whsec_****************** (keep secret!)
```

### 6.2.5 Deployment Checklist

- [ ] `next build` succeeds (no TypeScript errors, no Tailwind errors)
- [ ] `supabase db reset` executed on new project (or migrate existing DB)
- [ ] Seed data loaded (27 products, admin profile, promos, settings)
- [ ] All env vars set in Vercel/Dashboard
- [ ] Stripe keys added (or PAYMENT_PROVIDER=demo)
- [ ] Realtime tested: `supabase realtime` channel subscriptions work
- [ ] Custom domain configured (if needed)
- [ ] SSL/HTTPS active (Vercel provides automatically)
- [ ] Sitemap `/sitemap.xml` generated (`next package`)
- [ ] Robots.txt generated
- [ ] 404 page custom (`app/404.tsx`)
- [ ] favicon `/public/favicon.ico` or `/public/favicon.svg` (already in original)

---

## 6.3 Rollback Plan

If the new Next.js app has critical issues:

1. **Keep the Express app running** on `localhost:3000` or separate port
2. **Environment switch:** Set `NEXT_PUBLIC_SITE_URL=http://old-express-host` for feature flags
3. **Database:** Supabase keeps the PostgreSQL data; Express can connect via `pg` package if needed
4. **Rollback command:** `supabase revert` to last migration, `pnpm run dev` on Express
5. **Communication:** Feature flag in `.env`: `NEW_SITE_ENABLED=false` redirects all traffic to Express

---

## 6.4 Final Checklist Before "Go Live"

- [ ] Phase 1–5 all complete and tested
- [ ] Unit tests passing (pricing, order-state, validation)
- [ ] Playwright smoke test passing end-to-end checkout
- [ ] Security headers verified (Helmet, CSP, no x-powered-by)
- [ ] Rate limiting active, no false 429s on normal traffic
- [ ] Supabase Realtime working on dashboard
- [ ] Image upload tested (product form)
- [ ] Promo codes tested (all 3 types: percent, fixed, free_shipping)
- [ ] Stripe webhook tested (success + failure paths)
- [ ] Mobile responsive on 3 devices (iPhone, Android, iPad)
- [ ] Accessibility audit passed (a11y score > 90)
- [ ] Lighthouse > 90 (Performance, A11y, Best Practices, SEO)
- [ ] `.env.example` committed (no secrets committed)
- [ ] Git history: clear commit messages per phase
- [ ] Documentation: `MIGRATION_WORKLOG.md`, `MIGRATION_PROGRESS.md`, all `PHASE_*.md` in `docs/plan/`
- [ ] Old Express code preserved in `git history` (not deleted)
- [ ] Team on-call if issues arise post-deploy

---

## 📦 Phase 6 Deliverables

- [ ] Unit test suite (pricing, order-state, validation) — passing
- [ ] Playwright e2e smoke test (checkout flow)
- [ ] Security audit report (headers, CSP, rate limit, CSRF)
- [ ] Lighthouse report (Performance, A11y, SEO > 90)
- [ ] Vercel deployment with all env vars
- [ ] Supabase project live, Realtime working
- [ ] Custom domain (optional) with SSL
- [ ] Rollback plan documented
- [ ] Final `MIGRATION_PROGRESS.md` updated to 100%
- [ ] `MIGRATION_WORKLOG.md` updated with all phase completions

---

## ✅ Phase 6 Complete Criteria

All of the following must be true:

1. `pnpm test` — 0 failures
2. `pnpm playwright test` — 1 pass (checkout flow)
3. `next build` — 0 errors, 0 warnings
4. `supabase start` — Realtime connections active
5. Lighthouse (home) — Performance 95+, A11y 100, Best Practices 100, SEO 100
6. Helmet CSP headers verified
7. `.env.example` has all required vars (no secrets)
8. Git `main` branch: all `PHASE_*.md` documented, old Express code in history only
9. Team lead sign-off on deployment readiness

---

## 📦 Phase 6 Summary

**Quality gate:** All tests pass, security verified, performance > 90, accessibility AA.

**Deployment:** Vercel + Supabase, env vars configured, rollback plan ready.

**Hand-off:** Team trained on new stack, old Express app in maintenance mode only.

**Final step:** `MIGRATION_PROGRESS.md` updated to 100%, team celebration, old Express turned off.

---