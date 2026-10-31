-- Migration: 005_orders
-- Orders table with full order lifecycle (references promo_codes.code)

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^CC-[A-Z0-9]{7}$'),
  client_token uuid,
  customer_id uuid not null references public.profiles(id),
  email text not null,
  name text not null,
  phone text,
  address1 text not null,
  address2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  shipping_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','paid','packed','shipped','delivered','cancelled','refunded')),
  payment_method text not null check (payment_method in ('card','cod')),
  payment_status text not null default 'pending' check (payment_status in ('pending','succeeded','failed','refunded','voided')),
  payment_ref text,
  payment_brand text,
  payment_last4 text,
  promo_code text references public.promo_codes,
  source text not null default 'direct',
  item_count integer not null default 0,
  delivery_method text not null default 'standard' check (delivery_method in ('standard','express')),
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.orders enable row level security;
create policy "Customers read own orders" on orders for select using (auth.uid() = customer_id);
create policy "Admin full access" on orders for all using (auth.role() = 'admin');