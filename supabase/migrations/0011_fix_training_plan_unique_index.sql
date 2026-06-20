-- Bug found in a full audit: uq_one_active_plan (from 0001_init.sql) is a
-- partial unique index on training_plans (is_active) WHERE is_active, with
-- no user_id in it. It predates multi-tenancy (0004_multi_tenant_foundation)
-- and was never updated when user_id was added, so it still enforces "at
-- most one active plan in the ENTIRE table" rather than per user.
--
-- Effect: the first account to ever generate a training plan works fine;
-- every other account's plan.actions.ts#generatePlan insert then fails with
-- a duplicate-key violation on this index, because Postgres only sees "a row
-- with is_active = true already exists somewhere," not who owns it.
--
-- Written to be safely re-runnable, same as 0004-0010.

drop index if exists uq_one_active_plan;
create unique index if not exists uq_one_active_plan_per_user
  on training_plans (user_id, is_active) where is_active;
