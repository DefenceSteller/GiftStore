-- Migration: 019_fix_signup_orphan_profile
--
-- Root cause of "Database error saving new user":
--   checkout's ensureProfile() creates a profiles row with a RANDOM id when no
--   profile exists for the contact email (guest / first-time checkout), so
--   profiles.id differs from auth.users.id for that email. When the same email
--   later signs up, handle_new_user() INSERTed a second profiles row and hit
--   the profiles_email_key unique constraint -> GoTrue aborted the auth user
--   insert and surfaced "Database error saving new user".
--
-- Fix:
--   1. Allow profiles.id to be reassigned: add ON UPDATE CASCADE to the two
--      foreign keys that reference profiles(id), so linked orders/customers
--      follow the profile when it is reclaimed for the auth user.
--   2. handle_new_user() now reclaims an existing profile row for this email
--      by reassigning its id to the new auth user id before inserting, so the
--      customer's order history stays attached to their account.

-- 1. FKs: let the profile id change while keeping references intact
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'f'
      and confrelid = 'public.profiles'::regclass
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on update cascade;

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.customers'::regclass
      and contype = 'f'
      and confrelid = 'public.profiles'::regclass
  loop
    execute format('alter table public.customers drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.customers
  add constraint customers_profiles_id_fkey
  foreign key (profiles_id) references public.profiles(id) on update cascade on delete cascade;

-- 2. Reclaim orphaned profile rows on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  orphan_id uuid;
begin
  -- A profile may already exist for this email under a different id (created
  -- by guest checkout). Reassign it to this auth user so signup never fails
  -- on profiles_email_key and the customer's orders/history follow along.
  select id into orphan_id
  from public.profiles
  where email = new.email and id <> new.id
  limit 1;

  if orphan_id is not null then
    if exists (select 1 from public.profiles where id = new.id) then
      -- Pathological: this auth user id is already taken by another profile.
      -- Free the email instead of failing the signup.
      delete from public.profiles where id = orphan_id;
    else
      update public.profiles set id = new.id where id = orphan_id;
    end if;
  end if;

  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'admin@confetticlub.shop' then 'admin' else 'customer' end
  )
  on conflict (id) do update set
    email = excluded.email,
    role  = case
              when excluded.email = 'admin@confetticlub.shop' then 'admin'
              else excluded.role
            end;
  return new;
end;
$$;
