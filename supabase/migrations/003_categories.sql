-- Migration: 003_categories
-- Categories table

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  product_count integer not null default 0,
  min_price_cents integer not null default 0,
  max_price_cents integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "Public read categories" on categories for select using (true);