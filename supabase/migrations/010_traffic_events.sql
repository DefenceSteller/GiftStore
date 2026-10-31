-- Migration: 010_traffic_events
-- Website traffic tracking

create table public.traffic_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pageview','product_view','add_to_cart','checkout_start')),
  path text not null,
  referrer text,
  source text not null,
  visitor_id uuid,
  revenue_cents integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.traffic_events enable row level security;
create policy "Admin full access" on traffic_events for all using (auth.role() = 'admin');