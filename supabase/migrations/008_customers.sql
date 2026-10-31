-- Migration: 008_customers
-- Customer records (references profiles)

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profiles_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  name text not null,
  phone text,
  city text,
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create policy "Customers read own profile" on customers for select using (auth.uid() = profiles_id);
create policy "Admin full access" on customers for all using (auth.role() = 'admin');