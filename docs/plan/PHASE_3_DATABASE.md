# 🗃️ Phase 3: Database Migration

**Status:** Starting  
**Started:** 2026-08-24  
**Estimated completion:** 2026-08-26

## 3.1 SQLite → Postgres Schema Conversion

### Tables & Columns

| SQLite Table | Postgres Table | PK | Key Columns | Notes |
|---|---|---|---|---|
| `products` | `products` | uuid | id, slug, name, description, category, price_cents (int), compare_at_cents (int), emoji, gradient, rating (real), review_count (int), is_active (bool), stock (int), sort_order (int), created_at (timestamptz), updated_at (timestamptz) | price_cents stored as integer cents |
| `product_images` | `product_images` | uuid | id, product_id, url (text), alt_text (text), sort_order (int) | New table for uploaded images |
| `categories` | `categories` | uuid | id, name (text), product_count (int), min_price_cents (numeric), max_price_cents (numeric) | Derived from products query; stored for performance |
| `orders` | `orders` | uuid | id, order_number (text CC-XXXXX), client_token (uuid), customer_id (uuid ref profiles), email (text), name (text), phone (text), address1 (text), address2 (text), city (text), state (text), postal_code (text), country (text), subtotal_cents (numeric), discount_cents (numeric, default 0), shipping_cents (numeric, default 0), tax_cents (numeric, default 0), total_cents (numeric), currency (text default 'USD'), status (order_status enum), payment_method (payment_method enum), payment_status (text), payment_ref (text), payment_brand (text), payment_last4 (text), promo_code (text ref promo_codes), source (text), item_count (int), delivery_method (text), placed_at (timestamptz), updated_at (timestamptz), paid_at (timestamptz) | order_number format: CC- + 7 alphabetic |
| `order_items` | `order_items` | uuid | id, order_id (uuid ref orders), product_id (uuid ref products), name (text), slug (text), emoji (text), gradient (text), unit_price_cents (int), qty (int), line_total_cents (int) | |
| `order_events` | `order_events` | uuid | id, order_id (uuid ref orders), type (enum: pageview|product_view|add_to_cart|checkout_start|purchase|status), path (text), referrer (text), source (text), visitor_id (uuid), revenue_cents (int), created_at (timestamptz) | |
| `customers` | `customers` | uuid | id, profiles_id (uuid ref profiles), email (text), name (text), phone (text), city (text), created_at (timestamptz) | Linked to auth.profiles |
| `promotions` | `promo_codes` | uuid | id, code (text unique), type (enum: percent|fixed|free_shipping), value (int), min_subtotal_cents (int), active (bool), uses (int, default 0), description (text), expires_at (timestamptz), created_at (timestamptz) | code format: GIFT10, FREESHIP, WELCOME5 |
| `activity_log` | `audit_log` | uuid | id, kind (text), message (text), meta (jsonb), actor (text), created_at (timestamptz) | |
| `traffic_events` | `traffic_events` | uuid | id, type (text), path (text), referrer (text), source (text), visitor_id (uuid), revenue_cents (int, default 0), created_at (timestamptz) | |
| `stock_movements` | `stock_movements` | uuid | id, product_id (uuid ref products), delta (int, can be negative), reason (text: order|cancel|refund|restock), ref (text: order number or reason), created_at (timestamptz) | |

### Enhanced Postgres Features

- **UUID PKs** via `gen_random_uuid()` instead of auto-increment
- **timestamptz** instead of `Date.now()` — timezoned, durable
- **numeric(10,2)** for money columns, or **integer cents** (avoid float)
- **jsonb** for `meta` in `audit_log` and `meta` in `order_events`
- **Enums** for `order_status`, `payment_method`, `promo_type`
- **RLS** (Row Level Security) on every table
- **triggers** for automatic `stock_movements` creation on order create/cancel/refund

### 3.2 Supabase Migrations (`supabase/migrations/`)

Create migration files following Supabase conventions:

```sql
-- 20260824_001_create_profiles.up.sql
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('customer', 'admin')),
  email text not null,
  created_at timestamptz not null default now()
);

-- 20260824_002_create_products.up.sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text not null,
  price_cents integer not null check (price_cents > 0),
  compare_at_cents integer,  -- null or > price_cents
  emoji text,
  gradient text not null,
  rating numeric(3,1) check (rating >= 0 and rating <= 5),
  review_count integer not null default 0,
  is_active boolean not null default true,
  stock integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 20260824_003_add_rls_policies.up.sql
-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.orders enable row level security;
-- ... etc

-- Add policies after enabling
create policy "Public can read active products" on products for select using (is_active = true);
create policy "Admins can do everything" on products for all using (auth.role() = 'admin');
-- ... etc for all tables
```

### 3.3 Postgres RPC Functions

```sql
-- place_order — atomic: validates stock, decrements prices, creates order, records events
create or replace function public.place_order(
  p_customer_id uuid,
  p_order_data jsonb
) returns jsonb language sql stable as $$
declare
  v_order jsonb;
begin
  -- 1. Validate stock
  -- 2. Calculate price (server-side priceCart equivalent)
  -- 3. Create order
  -- 4. Decrement stock, create stock_movements
  -- 5. Record order_events
  -- 6. Return order data
  return v_order;
end;
$$;

-- cancel_order — restock items, update status, record audit
create or replace function public.cancel_order(
  p_order_id uuid
) returns jsonb language sql stable as $$
begin
  -- 1. Restock items
  -- 2. Update order status to 'cancelled'
  -- 3. Create audit_log entry
  -- 4. Return confirmation
  return jsonb_build_object('restocked', true, 'order_id', p_order_id);
end;
$$;

-- refund_order — process refund, update payment_status, record audit
create or replace function public.refund_order(
  p_order_id uuid,
  p_amount_cents int
) returns jsonb language sql stable as $$
begin
  -- 1. Validate refund eligibility
  -- 2. Update payment_status
  -- 3. Create audit_log entry
  -- 4. Return confirmation
  return jsonb_build_object('refunded', true, 'amount', p_amount_cents);
end;
$$;
```

### 3.4 RLS Policies (Complete)

All tables enabled with RLS. Key policies:

```sql
-- profiles
create policy "Public read own profile" on profiles for select using (auth.uid() = id);
create policy "Admin full access" on profiles for all using (auth.role() = 'admin');

-- products
create policy "Public read active products" on products for select using (is_active = true);
create policy "Admin full access" on products for all using (auth.role() = 'admin');

-- orders
create policy "Customers read own orders" on orders for select using (auth.uid() = customer_id);
create policy "Admin full access" on orders for all using (auth.role() = 'admin');

-- order_items
create policy "Admin full access" on order_items for all using (auth.role() = 'admin');

-- categories
create policy "Public read active categories" on categories for select using (true);

-- promo_codes
create policy "Public read active promos" on promo_codes for select using (active = true);

-- settings
create policy "Public read key settings" on settings for select using (key in ('store_name', 'currency'));
create policy "Admin full access" on settings for all using (auth.role() = 'admin');

-- audit_log
create policy "Admin read audit log" on audit_log for select using (auth.role() = 'admin');

-- traffic_events
create policy "Admin read traffic" on traffic_events for select using (auth.role() = 'admin');
```

### 3.5 Seed Script (Supabase)

```bash
supabase db reset
# Then run seed via Supabase SQL editor or migration

insert into public.profiles (id, role, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@confetticlub.shop');

insert into public.products (id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at, updated_at) values
  -- 27 products from original seed, adapted for Postgres UUIDs
```

### 3.5 Type Generation

```bash
supabase gen types --project-ref $SUPABASE_PROJECT_REF --output formats/typescript
# Output goes to src/lib/supabase/types.ts
# Import: import type { Database } from '../lib/supabase/types'
```

This generates the full `Database` type used throughout the app for type-safe queries.

---

## 3.1 Checklist: Phase 3 Complete When

- [ ] All 11 SQLite tables converted to Postgres with correct columns/types
- [ ] UUID PKs generated via `gen_random_uuid()`
- [ ] `numeric(10,2)` or integer cents for all money columns
- [ ] `timestamptz` for all created_at/updated_at/placed_at/paid_at
- [ ] Enums: `order_status` (pending|paid|packed|shipped|delivered|cancelled|refunded), `payment_method` (card|cod), `promo_type` (percent|fixed|free_shipping)
- [ ] RLS enabled on every table with appropriate policies
- [ ] Three RPC functions: `place_order`, `cancel_order`, `refund_order`
- [ ] Seed script executed, demo catalog present
- [ ] `supabase gen types` run, Typescript types imported
- [ ] Old SQLite data no longer used (coexistence period, then decommission)

---

## 📦 Phase 3 Deliverables

- [ ] `supabase/migrations/` — all migration files
- [ ] `src/lib/supabase/browser.ts` — client instance
- [ ] `src/lib/supabase/server.ts` — server instance with Service Role Key
- [ ] `src/lib/supabase/types.ts` — generated types
- [ ] Updated `src/lib/pricing.ts` — adapted from server-side priceCart
- [ ] `supabase/seed.sql` — demo catalog + admin profile
- [ ] Migration executed: `supabase db reset`
- [ ] TypeScript types verified against Supabase client

---

**Ready to proceed to Phase 4: Auth** upon approval and successful database migration.  
**Old Express code:** Will remain untouched until new Next.js app reaches feature parity.

---