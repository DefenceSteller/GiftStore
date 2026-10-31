-- Migration: 002_products
-- Products table (27 items adapted from original PRODUCTS array)

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text not null,
  price_cents integer not null check (price_cents > 0),
  compare_at_cents integer,
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
alter table public.products enable row level security;
create policy "Public read active products" on products for select using (is_active = true);
create policy "Admin full access" on products for all using (auth.role() = 'admin');