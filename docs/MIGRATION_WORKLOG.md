# 📋 Confetti Club — Migration to Next.js + Supabase

## Work Log

### Phase 1 — Analysis (In Progress)
- [x] Read and cataloged entire Express+SQLite repository
- [x] Documented all database tables & columns (products, orders, order_items, customers, promotions, analytics_events, activity_log, stock_movements, admins)
- [x] Listed every API endpoint (public: /health, /store/config, /store/categories, /store/products, /store/products/:slug, /store/promo/:code, /checkout, /orders/:orderNumber, /track/event, /track/heartbeat; admin: /login, /logout, /me, /password, /stats, /stats/live, /analytics, /orders, /orders/:id, /products, /products/:id, /products/:id/stock, /customers, /promos, /promos/:id, /settings, /activity, /export/orders.csv)
- [x] Extracted all business rules (order lifecycle, payment validation, promo codes, rate limits, security headers, CSP, visual design tokens)
- [x] Created feature checklist (storefront complete, admin complete, migration targets defined)
- [x] Waited for user approval of summary before proceeding

**Output provided:** Table (a) list of tables and columns, (b) every API endpoint with purpose, (c) business rules, (d) feature checklist — delivered above.

---

### Phase 2 — Target Architecture (Pending)
- [ ] Define Next.js 15 App Router structure
- [ ] Set up TypeScript configuration
- [ ] Configure Tailwind CSS reuse of existing design tokens (ink #0D0D12, iris #7C5CFF, acid #D6FF3E, coral, aqua, butter, bubble; fonts Bricolage Grotesque + Manrope + JetBrains Mono admin)
- [ ] Set up shadcn/ui component library
- [ ] Define Supabase project setup (Postgres, Auth, Storage, Realtime)
- [ ] Define folder layout: src/app (routes), src/modules/<feature>/{components,services,schemas,types}, src/lib/supabase, supabase/migrations

**Next:** Wait for user approval before writing migration code.

---

### Phase 3 — Database Migration (Pending)
- [ ] Convert SQLite schema to Postgres migrations in supabase/migrations/
- [ ] Tables: products, product_images, categories, orders, order_items, order_events, customers (profiles), promo_codes, settings, audit_log, traffic_events
- [ ] UUID PKs, timestamptz, numeric(10,2) money (or integer cents), enums for order status
- [ ] Enable RLS on every table:
  - public can read active products and categories
  - customers can read only their own orders
  - admins (profiles.role = 'admin') can do everything
- [ ] Postgres functions (RPC):
  - place_order (price + stock decrement in one transaction)
  - cancel_order (restock)
  - refund_order
- [ ] Seed script with demo catalog

---

### Phase 4 — Auth (Pending)
- [ ] Supabase Auth (email/password)
- [ ] Profiles table with role (customer | admin)
- [ ] Middleware protects /admin
- [ ] Remove hard-coded default admin; create first admin through one-time seed command
- [ ] Optional customer sign-up and "my orders"

---

### Phase 5 — Features to Port (Pending)
**Storefront:**
- [ ] home, shop with filters, product page
- [ ] cart drawer, checkout
- [ ] Pricing stays server-side only (promo, shipping, tax)

**Admin:**
- [ ] overview KPIs and charts
- [ ] live view via Supabase Realtime (replacing polling)
- [ ] orders (status transitions, refund, cancel with restock)
- [ ] products and stock with image upload to Supabase Storage
- [ ] customers
- [ ] analytics (traffic, funnel, sources)
- [ ] settings and promo codes
- [ ] audit log

**Payments:**
- [ ] Keep pluggable provider interface
- [ ] Demo provider works
- [ ] Implement Stripe Checkout + webhook route as real provider

---

### Phase 6 — Quality and Deploy (Pending)
- [ ] Rate limiting on public mutation routes
- [ ] Security headers in next.config
- [ ] Unit tests for pricing and order-state logic
- [ ] Playwright smoke test of checkout flow
- [ ] .env.example
- [ ] README with local setup (supabase start, db reset) and Vercel + Supabase deployment steps

---

## 📊 Phase Status Overview

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1 – Analysis | ✅ Done | — | 2026-08-24 |
| 2 – Architecture | ⏳ Pending | — | — |
| 3 – Database | ⏳ Pending | — | — |
| 4 – Auth | ⏳ Pending | — | — |
| 5 – Features | ⏳ Pending | — | — |
| 6 – Quality & Deploy | ⏳ Pending | — | — |

---

## 📝 Notes

- Work in phases and stop after each for review
- Do not delete the old Express code until the new app reaches feature parity
- Short, clear commit messages
- No placeholder or mock data outside the seed
- This worklog tracks progress per the revamp_next.js-supabase.md plan

---

**Last updated:** 2026-08-24  
**Project:** Confetti Club gift shop migration  
**From:** Express + SQLite + static HTML/Tailwind  
**To:** Next.js 15 + App Router + TypeScript + Supabase