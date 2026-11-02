-- Migration: 015_fix_admin_role
-- Root cause: seed had hardcoded UUID '0000...0001' for admin profile, but
-- Supabase Auth generates a random UUID at signup. So profiles.id != auth.users.id,
-- and getSessionUser() can never find the admin profile → role defaults to 'customer'.
--
-- Fix:
--   1. Delete the orphaned seed row for admin@confetticlub.shop.
--   2. Add a trigger on auth.users that auto-creates/updates the profile row on
--      every signup, setting role='admin' for the known admin email.

-- Step 1: Remove the orphaned seed row (wrong UUID)
delete from public.profiles where email = 'admin@confetticlub.shop';

-- Step 2: Create the profile-sync function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'admin@confetticlub.shop' then 'admin' else 'customer' end
  )
  on conflict (id) do update set
    email       = excluded.email,
    role        = case
                    when excluded.email = 'admin@confetticlub.shop'
                    then 'admin'
                    else excluded.role
                  end;
  return new;
end;
$$;

-- Step 3: Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
