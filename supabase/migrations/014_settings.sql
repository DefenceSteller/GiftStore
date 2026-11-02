-- Migration: 014_settings
-- Store settings table (mirrors original SQLite settings table from server/db.js:181)

create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Admin full access" on public.settings for all using (auth.role() = 'admin');
create policy "Authenticated read" on public.settings for select using (auth.role() = 'authenticated');

-- Seed default settings
insert into public.settings (key, value) values
  ('store_name', 'Confetti Club'),
  ('currency', 'USD'),
  ('free_shipping_threshold_cents', '5000'),
  ('standard_shipping_cents', '599'),
  ('express_shipping_cents', '1299'),
  ('tax_rate_bps', '500'),
  ('delivery_days_standard', '5-7'),
  ('delivery_days_express', '2-3'),
  ('announcement_banner', 'FREE SHIPPING OVER Rs 50...')
on conflict (key) do nothing;