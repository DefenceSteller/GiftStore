-- Migration: 012_fix_grants
-- The tables were created without the standard Supabase API-role grants,
-- so anon/authenticated/service_role all fail with:
--   42501 permission denied for schema public
-- This restores USAGE on the schema and full DML grants on existing + future objects.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
