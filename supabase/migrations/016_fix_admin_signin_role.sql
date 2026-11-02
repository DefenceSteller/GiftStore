-- Migration: 016_fix_admin_signin_role
-- The trigger from 015 only fires on INSERT (signup).
-- Users who already have an auth account but no profile row won't get one until they sign up again.
-- This adds an AFTER UPDATE trigger so the profile is also created/updated when auth.users.email_confirmed_at changes
-- (which happens at first sign-in after signup, or when email is confirmed).

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

-- Drop old triggers (from 015) and recreate with both insert + update
drop trigger if exists on_auth_user_created on auth.users;

-- Fire on insert (new signup)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fire on update (email confirmed / first sign-in sync)
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.email_confirmed_at is distinct from new.email_confirmed_at)
  execute procedure public.handle_new_user();
