-- Contractor availability — days a contractor has marked themselves
-- unavailable. The auto-assign engine treats them as ineligible on these
-- dates. Admin can also view + override.
--
-- One row per (contractor, date). Soft delete via removing the row.

create table if not exists contractor_unavailable_days (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references profiles(id) on delete cascade,
  unavailable_date date not null,
  reason        text,                                    -- optional, contractor-supplied
  created_at    timestamptz not null default now(),
  unique (contractor_id, unavailable_date)
);

create index if not exists idx_contractor_unavailable_lookup
  on contractor_unavailable_days (contractor_id, unavailable_date);
