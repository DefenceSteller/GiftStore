-- Migration: 009_audit_log
-- Audit trail

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  message text,
  meta jsonb,
  actor text,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "Admin full access" on audit_log for all using (auth.role() = 'admin');