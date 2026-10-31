# 🎯 Phase 2: Target Architecture

**Status:** In Progress  
**Started:** 2026-08-24  
**Estimated completion:** 2026-08-26

## 2.1 Framework & App Structure

- **Next.js 15** with **App Router** (`src/app/`)
- **TypeScript** configured and strict
- **Tailwind CSS v3** — reuse existing design tokens
  - Colors: ink `#0D0D12`, iris `#7C5CFF`, acid `#D6FF3E`, coral, aqua, butter, bubble
  - Fonts: **Bricolage Grotesque** (UI), **Manrope** (body), **JetBrains Mono** (admin)
  - No `unsafe-evals`; `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- **shadcn/ui** component library for:
  - Forms, dialogs, selects, date pickers
  - Tables, badges, pills, avatars
  - Navigation, accordions, tabs

**Folder layout:**
```
src/
  app/              → Next.js App Router pages & layouts
  modules/          → Feature modules (each has own sub-folder)
    storefront/     → home, shop, product, cart, checkout, track
    admin/          → dashboard, KPIs, orders, products, customers, analytics, settings, promos
    shared/         → shared components, utils, constants
  lib/              → utilities not tied to a single module
    supabase/       → Supabase client instances, types
    validators/     → Zod schemas
  components/       → Global reusable components (outside modules)
```

## 2.2 Supabase Configuration

- **Supabase Project** created (separate from code)
- **@supabase/ssr** for both server and client
- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- **Initialization** in `src/lib/supabase/browser.ts` and `src/lib/supabase/server.ts`

**Realtime channels** for live dashboard:
- `orders` channel with status changes
- `traffic` channel for visitor counts
- `analytics` funnel events

## 2.3 Database Schema (Supabase Postgres)

Convert SQLite tables to Postgres with these enhancements:

| Table | PK | Key Columns | RLS |
|-------|-----|-------------|-----|
| `profiles` | uuid | id, role (customer | admin), email, created_at | public: read own; admin: all |
| `products` | uuid | id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at, updated_at | public: read active; admin: all |
| `product_images` | uuid | id, product_id, url, alt_text, sort_order | admin: all |
| `categories` | uuid | id, name, product_count, min_price_cents, max_price_cents | public: read active |
| `orders` | uuid | id, order_number (CC-XXXXX), client_token, customer_id, email, name, phone, address1, address2, city, state, postal_code, country, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency, status, payment_method, payment_status, payment_ref, payment_brand, payment_last4, promo_code, source, item_count, delivery_method, placed_at, updated_at, paid_at | admin: all; customers: read own |
| `order_items` | uuid | id, order_id, product_id, name, slug, emoji, gradient, unit_price_cents, qty, line_total_cents | admin: all |
| `order_events` | uuid | id, order_id, type (pageview|product_view|add_to_cart|checkout_start|purchase|status), path, referrer, source, visitor_id, revenue_cents, created_at | admin: all |
| `customers` | uuid | id, profiles_id (FK), email, name, phone, city, created_at | admin: all; public: own |
| `promo_codes` | uuid | id, code, type (percent|fixed|free_shipping), value, min_subtotal_cents, active, uses, description, expires_at, created_at | public: read active |
| `settings` | uuid | id, key, value (store_name, announcement, currency, delivery_days_standard, delivery_days_express, tax_rate_bps, free_shipping_threshold_cents, standard_shipping_cents, express_shipping_cents), updated_at | admin: all; public: read key 'store_name', 'currency' |
| `audit_log` | uuid | id, kind, message, meta (jsonb), actor, created_at | admin: all |
| `traffic_events` | uuid | id, type, path, referrer, source, visitor_id, revenue_cents, created_at | admin: all |
| `stock_movements` | uuid | id, product_id, delta, reason, ref, created_at | admin: all |

**Enums:**
- `order_status`: pending → paid → packed → shipped → delivered, cancelled, refunded
- `payment_method`: card, cod
- `promo_type`: percent, fixed, free_shipping

**Postgres Functions (RPC):**
- `place_order(p_customer_id, p_order_data)` — atomic: validates stock, decrements prices, creates order, records events, returns order_number
- `cancel_order(p_order_id)` — restocks items, updates status, records audit, returns restocked quantities
- `refund_order(p_order_id, p_amount_cents)` — processes refund, updates payment_status, records audit

**UUID PKs** instead of auto-integer.  
**timestamptz** instead of JavaScript `Date.now()`.  
**numeric(10,2)** or **integer cents** for money (avoid float imprecision).

## 2.3 RLS Policies (Row Level Security)

```sql
-- profiles
CREATE POLICY "Public can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can do everything" ON profiles FOR ALL USING (auth.role() = 'admin');

-- products
CREATE POLICY "Public can read active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can do everything" ON products FOR ALL USING (auth.role() = 'admin');

-- categories
CREATE POLICY "Public can read active categories" ON categories FOR SELECT USING (true);

-- orders
CREATE POLICY "Customers read own orders" ON orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Admins can do everything" ON orders FOR ALL USING (auth.role() = 'admin');

-- promo_codes
CREATE POLICY "Public can read active promos" ON promo_codes FOR SELECT USING (active = true);

-- settings
CREATE POLICY "Public can read key settings" ON settings FOR SELECT USING (key IN ('store_name', 'currency'));
CREATE POLICY "Admins can do everything" ON settings FOR ALL USING (auth.role() = 'admin');
```

## 2.4 API Routes (Next.js Route Handlers + Server Actions)

**Pattern:** Server Components for read-heavy pages (SEO); Route Handlers or Server Actions for mutations.

**Public routes (no auth):**
- `GET /` — home (Server Component, fetches featured products)
- `GET /shop` — shop with filters (Server Component)
- `GET /product/[slug]` — product page (Server Component)
- `GET /cart` — cart drawer (Server Component + client state)
- `POST /api/checkout` — Route Handler (mutation)
- `GET /api/orders/[orderNumber]` — Route Handler (read)
- `POST /api/track/event` — Route Handler (beacon)

**Admin routes (auth protected):**
- `GET /admin/*` — Server Components with supabase-server
- `POST /admin/login` — Server Action / Route Handler
- `GET /admin/stats` — KPIs (Server Component)
- `GET /admin/orders` — Server Component with pagination/filter
- `GET /admin/orders/[id]` — Order drawer (Server Component)
- `PATCH /admin/orders/[id]/status` — Route Handler (status transition)
- `GET /admin/products` — Product CRUD (Server Components + Modal)
- `PATCH /admin/products/[id]` — Stock adjust / Archive (Route Handler)
- `GET /admin/customers` — Server Component
- `GET /admin/analytics` — Server Component with Realtime
- `GET /admin/promos` — List + create (Server Components)
- `PATCH /admin/promos/[id]` — Enable/disable/delete (Route Handler)
- `GET /admin/settings` — Server Component
- `PATCH /admin/settings` — Update (Route Handler)

## 2.5 Payment Provider Interface (Keep)

- `services/payments.js` pattern preserved
- `demo` provider: Luhn validation + card `4242 4242 4242 4242` → success, `4000 0000 0000 0002` → 402
- Stripe Checkout integration:
  - `POST /api/stripe/checkout` — Route Handler
  - Stripe Webhook route: `POST /api/stripe/webhook` — verifies signature, processes `checkout.session.completed`, fulfills order
- Pluggable: `PAYMENT_PROVIDER=demo|stripe` in `.env`

## 2.6 Validation (Zod)

- **Zod schemas** on every input:
  - Contact validation (name, email, phone)
  - Shipping address validation
  - Payment card + expiry + Luhn
  - Promo code format + expiry + min_subtotal
  - Product form (name, tagline, price, compare, stock, category, gradient)
  - Admin password (min $1/cents confirmed)
- **Never trust client prices** — server-side `priceCart()` always recalculates

## 2.7 Styling & Design Tokens

- **Tailwind config** reuses existing tokens:
  ```js
  module.exports = {
    theme: {
      colors: {
        ink: '#0D0D12',
        iris: '#7C5CFF',
        acid: '#D6FF3E',
        coral: '#FF6B6E',
        aqua: '#4A90E2',
        butter: '#FFD93D',
        bubble: '#63B3ED',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  }
  ```
- **shadcn/ui** components styled to match (no `bg-gray-200`, use ink/acid palette)
- **Responsive grids** fill screen, no fixed max-width caps
- **CSS variables** for color tokens if needed across JSX

## 2.8 TypeScript Types

Generated from Supabase types via `supabase gen types`:

```typescript
// src/lib/supabase/types.sql or auto-generated
type Database = {
  public: {
    Tables: { profiles; products; orders; ... }
    Functions: { place_order; cancel_order; refund_order; }
    Enums: { order_status; payment_method; promo_type; }
  }
  Auth: { user: ... }
}
```

All route handlers & server components typed against this.

---

## 📦 Phase 2 Deliverables (Ready to Start Phase 3)

- [ ] Next.js 15 project initialized with `create-next-app@latest`
- [ ] TypeScript config strict mode
- [ ] Tailwind CSS with design tokens imported
- [ ] shadcn/ui installed and configured
- [ ] Supabase project created + @supabase/ssr set up
- [ ] Folder structure: `src/app/`, `src/modules/storefront/`, `src/modules/admin/`
- [ ] Environment variables template `.env.example`
- [ ] Database schema defined (see 2.3)
- [ ] RLS policies defined (see 2.4)
- [ ] API route patterns documented (see 2.5)
- [ ] Zod schemas defined (see 2.6)
- [ ] Payment provider interface preserved (see 2.7)
- [ ] TypeScript types generated from Supabase

---

**Ready to proceed to Phase 3: Database Migration** upon approval.  
**Old Express code:** Will remain untouched until new Next.js app reaches feature parity.

---