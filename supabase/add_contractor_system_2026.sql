-- =============================================================================
-- Contractor system — roles, agreements, documents, ratings, audit, photos
-- =============================================================================
--
-- This migration lays the database foundation for the contractor portal:
--   1.  user_role enum + profile columns for contractor-specific data
--   2.  contractor_agreements        — signed copies of the contractor agreement
--   3.  contractor_documents         — W-9 / insurance / license / etc. uploads
--   4.  customer_ratings             — post-job rating with one-time URL token
--   5.  commission_adjustments       — admin +/- adjustments with mandatory reason
--   6.  admin_audit_log              — paper trail for every protective action
--   7.  contractor_job_photos        — pre-existing damage + before/after photos
--   8.  bookings columns             — assignment + job-lifecycle + payment hooks
--
-- Storage bucket: a private bucket named `contractor-docs` must exist for the
-- onboarding doc uploads. Create it once in the Supabase dashboard or via:
--   insert into storage.buckets (id, name, public) values ('contractor-docs', 'contractor-docs', false);

-- ── 1. Roles + contractor profile columns ────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('customer', 'contractor', 'admin');
  end if;
end $$;

alter table profiles
  add column if not exists role user_role not null default 'customer',
  add column if not exists employment_status text default 'pending',     -- pending | active | paused | terminated
  add column if not exists commission_tier int default 1,                 -- 1..5
  add column if not exists commission_pct numeric(5,2) default 35.00,
  add column if not exists daily_job_cap int default 3,
  add column if not exists hire_date date,
  add column if not exists terminated_at timestamptz,
  add column if not exists terminated_reason text,
  add column if not exists headshot_url text,
  add column if not exists admin_notes text,
  -- Aggregate rating cache (recomputed via trigger on customer_ratings insert/update)
  add column if not exists rating_count int default 0,
  add column if not exists rating_overall_avg numeric(3,2),
  add column if not exists rating_attitude_avg numeric(3,2),
  add column if not exists completed_jobs_count int default 0;

create index if not exists idx_profiles_role on profiles (role);
create index if not exists idx_profiles_employment_status on profiles (employment_status) where role = 'contractor';

-- ── 2. Contractor agreements ─────────────────────────────────────────────────
-- One row per signing event. agreement_html is a snapshot of the EXACT text
-- the contractor signed, so future template edits never alter past signatures.
create table if not exists contractor_agreements (
  id                 uuid primary key default gen_random_uuid(),
  contractor_id      uuid not null references profiles(id) on delete cascade,
  agreement_version  text not null,
  agreement_html     text not null,
  signed_name        text not null,
  signed_at          timestamptz not null default now(),
  signed_ip          text,
  signed_user_agent  text,
  status             text not null default 'signed',  -- signed | voided | superseded
  voided_at          timestamptz,
  voided_reason      text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_contractor_agreements_contractor on contractor_agreements (contractor_id, status);

-- ── 3. Contractor onboarding documents ───────────────────────────────────────
-- One row per (contractor, doc_type). file_url is the Storage path
-- (e.g. "contractor-docs/<uuid>/w9.pdf").
create table if not exists contractor_documents (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references profiles(id) on delete cascade,
  doc_type      text not null,                                 -- 'w9' | 'insurance' | 'drivers_license' | 'background_check_consent' | 'headshot' | 'other'
  file_url      text,
  status        text not null default 'not_uploaded',          -- not_uploaded | uploaded | approved | rejected
  uploaded_at   timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid references profiles(id) on delete set null,
  review_notes  text,
  expires_at    date,                                          -- insurance renewals etc.
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists ux_contractor_documents_unique on contractor_documents (contractor_id, doc_type);
create index if not exists idx_contractor_documents_status on contractor_documents (contractor_id, status);

-- ── 4. Customer ratings (one-time token per booking) ─────────────────────────
create table if not exists customer_ratings (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  contractor_id   uuid references profiles(id) on delete set null,
  token           text not null unique,           -- 32-char random; URL slug
  email_sent_at   timestamptz,
  token_used_at   timestamptz,                    -- non-null once submitted (locks the link)
  overall_stars   int,                            -- 1..5
  attitude_stars  int,                            -- 1..5
  comments        text,
  recommend       boolean,
  submitted_ip    text,
  coupon_code     text,                           -- the $15-off code we hand back on submit
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create unique index if not exists ux_customer_ratings_booking on customer_ratings (booking_id);
create index if not exists idx_customer_ratings_contractor on customer_ratings (contractor_id, token_used_at);

-- ── 5. Commission adjustments (mandatory reason for the paper trail) ─────────
create table if not exists commission_adjustments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references bookings(id) on delete cascade,
  contractor_id    uuid not null references profiles(id) on delete cascade,
  adjustment_cents int not null,                  -- negative = reduction, positive = bonus
  reason           text not null,
  admin_id         uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

create index if not exists idx_commission_adjustments_booking on commission_adjustments (booking_id);
create index if not exists idx_commission_adjustments_contractor on commission_adjustments (contractor_id, created_at desc);

-- ── 6. Admin audit log (paper trail) ─────────────────────────────────────────
create table if not exists admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references profiles(id),
  action       text not null,                    -- 'promote_contractor' | 'adjust_commission' | 'deactivate' | etc.
  target_table text,
  target_id    uuid,
  payload      jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_admin on admin_audit_log (admin_id, created_at desc);
create index if not exists idx_admin_audit_log_target on admin_audit_log (target_table, target_id);

-- ── 7. Contractor job photos (pre-existing damage + before/after) ────────────
create table if not exists contractor_job_photos (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  contractor_id uuid not null references profiles(id) on delete cascade,
  photo_type    text not null,                  -- 'pre_existing_damage' | 'before_<area>' | 'after_<area>'
  file_url      text not null,
  gps_lat       numeric(9,6),
  gps_lng       numeric(9,6),
  device_taken_at timestamptz,                  -- EXIF timestamp if available
  uploaded_at   timestamptz not null default now()
);

create index if not exists idx_contractor_job_photos_booking on contractor_job_photos (booking_id);
create index if not exists idx_contractor_job_photos_type on contractor_job_photos (booking_id, photo_type);

-- ── 8. Bookings columns: assignment + lifecycle + payment + photo review ─────
alter table bookings
  add column if not exists assigned_to            uuid references profiles(id) on delete set null,
  add column if not exists assigned_at            timestamptz,
  add column if not exists assigned_by            uuid references profiles(id) on delete set null,   -- null = auto-assigned
  add column if not exists accepted_at            timestamptz,
  add column if not exists on_my_way_at           timestamptz,
  add column if not exists arrived_at             timestamptz,
  add column if not exists started_at             timestamptz,
  add column if not exists job_completed_at       timestamptz,
  add column if not exists photo_review_status    text default 'pending',                          -- pending | approved | rejected
  add column if not exists photo_reviewed_by      uuid references profiles(id) on delete set null,
  add column if not exists photo_reviewed_at      timestamptz,
  add column if not exists base_commission_cents  int,                                              -- computed at completion (tier % × total)
  add column if not exists final_commission_cents int,                                              -- locked after admin approves photos + adjustments
  add column if not exists tip_cents              int default 0,                                    -- 100% to contractor
  add column if not exists payment_link_url       text,
  add column if not exists payment_link_sent_at   timestamptz,
  add column if not exists payment_link_method    text;                                             -- 'email' | 'sms' | 'both'

create index if not exists idx_bookings_assigned         on bookings (assigned_to, booking_date);
create index if not exists idx_bookings_photo_review     on bookings (photo_review_status) where photo_review_status = 'pending';
create index if not exists idx_bookings_lifecycle        on bookings (job_completed_at) where job_completed_at is not null;

-- =============================================================================
-- Post-install steps you must run once manually:
--
--  1. Create the Storage bucket 'contractor-docs' (private) in the Supabase UI.
--  2. Set your own profile's role to 'admin':
--       update profiles set role = 'admin' where email = 'zackariahlacey@gmail.com';
--  3. Verify the admin auth gate in app/admin/layout.tsx now reads from the
--     new role column (it already does — graceful fallback existed in case of
--     missing column).
-- =============================================================================
