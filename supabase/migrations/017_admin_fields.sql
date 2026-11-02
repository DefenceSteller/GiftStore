-- Migration: 017_admin_fields
-- Add columns needed by the admin panel to match main branch functionality.
-- Orders need carrier/tracking/timestamps; traffic_events needs 'purchase' type.

-- Add missing order lifecycle columns
alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists note text;
alter table public.orders add column if not exists packed_at timestamptz;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;

-- Add 'purchase' event type to traffic_events
alter table public.traffic_events drop constraint if exists traffic_events_type_check;
alter table public.traffic_events add constraint traffic_events_type_check
  check (type in ('pageview','product_view','add_to_cart','checkout_start','purchase'));

-- Add stock_movements table (used by admin for stock adjustments)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  delta integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
alter table public.stock_movements enable row level security;
create policy "Admin full access" on stock_movements for all using (auth.role() = 'admin');