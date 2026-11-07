-- Migration: 022_contact_messages
-- Store contact form submissions from the /contact page.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Only service-role inserts (from the API route); no public reads.
create policy "contact_messages_service_only"
  on public.contact_messages
  for all
  using (false)
  with check (false);