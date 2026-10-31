-- Migration: 004_promo_codes
-- Promo codes table with code as primary key (text type, matches orders.promo_code)

create table public.promo_codes (
  code text primary key,
  type text not null check (type in ('percent','fixed','free_shipping')),
  value integer not null,
  min_subtotal_cents integer not null default 0,
  active boolean not null default true,
  uses integer not null default 0,
  description text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
create policy "Public read active promos" on promo_codes for select using (active = true);
create policy "Admin full access" on promo_codes for all using (auth.role() = 'admin');