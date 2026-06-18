-- Fixes "permission denied for table X" errors: RLS policies alone don't
-- grant SQL-level table privileges to service_role - Postgres requires both.
-- This was missing from 0001_init.sql originally; if you already applied
-- that migration, run this one too. New projects get this from 0001 directly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
