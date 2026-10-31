-- Migration: 006_order_items
-- Order line items (references orders and products)

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name text not null,
  slug text,
  emoji text,
  gradient text,
  unit_price_cents integer not null,
  qty integer not null check (qty > 0),
  line_total_cents integer not null check (line_total_cents = unit_price_cents * qty)
);
alter table public.order_items enable row level security;
create policy "Admin full access" on order_items for all using (auth.role() = 'admin');