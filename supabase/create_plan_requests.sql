-- Monthly Plan Requests
-- Replaces Stripe-based maintenance_club with a lightweight request/approval flow

create table if not exists plan_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text,
  plan_type           text not null check (plan_type in ('interior_only','exterior_only','full_detail')),
  ultimate_upgrade    boolean not null default false,
  vehicle_make        text,
  vehicle_model       text,
  vehicle_year        text,
  vehicle_size        text not null default 'medium',
  service_address     text,
  preferred_frequency text not null default 'monthly' check (preferred_frequency in ('weekly','biweekly','monthly')),
  notes               text,
  status              text not null default 'pending' check (status in ('pending','approved','declined')),
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Only one active request per user
create unique index if not exists plan_requests_user_active
  on plan_requests (user_id)
  where status = 'pending';

-- RLS
alter table plan_requests enable row level security;

create policy "users can read own requests"
  on plan_requests for select
  using (auth.uid() = user_id);

create policy "users can insert own requests"
  on plan_requests for insert
  with check (auth.uid() = user_id);

create policy "users can update own pending requests"
  on plan_requests for update
  using (auth.uid() = user_id and status = 'pending');

create policy "service role can do anything"
  on plan_requests for all
  using (auth.role() = 'service_role');
