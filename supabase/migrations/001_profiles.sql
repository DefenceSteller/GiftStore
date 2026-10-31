-- Migration: 001_profiles
-- Profiles table with role (customer/admin)

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('customer', 'admin')),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Public read own profile" on profiles for select using (auth.uid() = id);
create policy "Admin full access" on profiles for all using (auth.role() = 'admin');