-- Migration: 007_order_events
-- Analytics events (references orders)

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  type text not null check (type in ('pageview','product_view','add_to_cart','checkout_start','purchase','status')),
  path text not null,
  referrer text,
  source text not null,
  visitor_id uuid,
  revenue_cents integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.order_events enable row level security;
create policy "Admin full access" on order_events for all using (auth.role() = 'admin');