# 📋 Confetti Club — Migration to Next.js + Supabase

## Work Log

### Phase 1 — Analysis (In Progress)
- [x] Read and cataloged entire Express+SQLite repository
- [x] Documented all database tables & columns (products, orders, order_items, customers, promotions, analytics_events, activity_log, stock_movements, admins)
- [x] Listed every API endpoint (public: /health, /store/config, /store/categories, /store/products, /store/products/:slug, /store/promo/:code, /checkout, /orders/:orderNumber, /track/event, /track/heartbeat; admin: /login, /logout, /me, /password, /stats, /stats/live, /analytics, /orders, /orders/:id, /products, /products/:id, /products/:id/stock, /customers, /promos, /promos/:id, /settings, /activity, /export/orders.csv)
- [x] Extracted all business rules (order lifecycle, pricing, promo, tax, shipping, stock/restock, order status transitions, refund/cancel)
- [x] Created feature checklist
- [x] Waited for user approval of summary before proceeding

**Output provided:** (a) list of tables and columns, (b) every API endpoint with its purpose, (c) business rules (pricing, promo, tax, shipping, stock/restock, order status transitions, refund/cancel), (d) a feature checklist. Waiting for approval of this summary.

---

### Phase 2 — Target Architecture (Pending)
- [ ] Next.js 15 App Router, TypeScript, Tailwind (reuse existing design tokens)
- [ ] shadcn/ui for forms, dialogs, selects and date pickers
- [ ] Supabase: Postgres, Auth, Storage, Realtime. Use @supabase/ssr
- [ ] Server Components for storefront pages (SEO); Server Actions or Route Handlers for mutations
- [ ] Zod validation on every input. No fixed max-width caps; responsive grids and responsive grids
- [ ] Folder layout: src/app (routes), src/modules/<feature>/{components,services,schemas,types}, src/lib/supabase, supabase/migrations

**Next:** Wait for user approval of Phase 2 definition before writing migration code.

---

### Phase 3 — Database (Pending)
- [ ] Convert SQLite schema to Postgres: products, product_images, categories, orders, order_items, order_events (status history), customers (profiles), promo_codes, settings, audit_log, traffic_events
- [ ] uuid PKs, timestamptz, numeric(10,2) money (or integer cents), enums for order status
- [ ] Enable RLS on every table: public can read active products and categories; customers can read only their own orders; admins (profiles.role = 'admin') can do everything
- [ ] Postgres functions (RPC) for atomic operations: place_order (price + stock decrement in one transaction), cancel_order (restock), refund_order
- [ ] Seed script with the demo catalog

---

### Phase 4 — Auth (Pending)
- [ ] Supabase Auth (email/password). A profiles table with role (customer | admin).
- [ ] Middleware protects /admin. Remove the hard-coded default admin; create the first admin through a one-time seed command.
- [ ] Optional customer sign-up and "my orders".

---

### Phase 5 — Features to Port (Pending)
**Storefront:** home, shop with filters, product page, cart drawer, checkout, order tracking. Pricing stays server-side only (promo, shipping, tax).

**Admin:** overview KPIs and charts, live view via Supabase Realtime (replacing polling), orders (status transitions, refund, cancel with restock), products and stock with image upload to Supabase Storage, customers, analytics (traffic, funnel, sources), settings and promo codes. Keep the audit log.

**Payments:** keep the pluggable provider interface; the demo provider works, and implement Stripe Checkout plus a webhook route as the real provider.

---

### Phase 6 — Quality and Deploy (Pending)
- [ ] Rate limiting on public mutation routes
- [ ] Security headers in next.config
- [ ] Unit tests for pricing and order-state logic
- [ ] Playwright smoke test of the checkout flow
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

- Work in phases and stop after each for review.
- Do not delete the old Express code until the new app reaches feature parity.
- Short, clear commit messages.
- No placeholder or mock data outside the seed.

---

**Last updated:** 2026-08-24  
**Project:** Confetti Club gift shop migration  
**From:** Express + SQLite + static HTML/Tailwind gift shop with admin dashboard  
**To:** Next.js (App Router, TypeScript) + Supabase  
**Visual design:** Keep existing design tokens (ink #0D0D12, iris #7C5CFF, acid #D6FF3E, coral, aqua, butter, bubble; fonts Bricolage Grotesque + Manrope + JetBrains Mono admin)