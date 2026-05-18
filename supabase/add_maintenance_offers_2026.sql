-- Maintenance offers — one redemption window per qualifying past booking.
--
-- After a customer completes a car detail (Interior / Exterior / Full /
-- Ultimate) we open a 3-month window during which they can rebook a
-- shorter, discounted "Maintenance Detail" on the same vehicle.
--
-- The dashboard shows active offers as one-tap rebook cards. Redemption is
-- one-time — once redeemed_booking_id is set, the offer is consumed.

create table if not exists maintenance_offers (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  -- Vehicle pointer (nullable so deletes don't cascade-kill the offer history).
  vehicle_id             uuid references vehicles(id) on delete set null,
  -- The booking that created this offer; unique = at most one offer per source.
  source_booking_id      uuid not null references bookings(id) on delete cascade,
  source_service_name    text not null,
  source_vehicle_year    text,
  source_vehicle_make    text,
  source_vehicle_model   text,
  source_vehicle_size    text,
  -- Pre-tax, pre-discount card price of the source service (so we can scale
  -- the maintenance percentage off a stable anchor even if menu prices move
  -- after the offer was created).
  base_price             numeric(10,2) not null,
  -- Window close — 3 months from source booking_date.
  eligible_until         date not null,
  -- One-time redemption.
  redeemed_booking_id    uuid references bookings(id) on delete set null,
  redeemed_at            timestamptz,
  created_at             timestamptz not null default now(),
  unique (source_booking_id)
);

-- Hot-path lookup: "what active offers does this user have?"
create index if not exists idx_maintenance_offers_user_active
  on maintenance_offers (user_id, eligible_until)
  where redeemed_booking_id is null;

-- Reverse lookup: which offer was redeemed by a given booking?
create index if not exists idx_maintenance_offers_redeemed_booking
  on maintenance_offers (redeemed_booking_id)
  where redeemed_booking_id is not null;

-- Mark the redeeming booking itself so emails + admin can label it cleanly.
alter table bookings
  add column if not exists maintenance_offer_id uuid references maintenance_offers(id) on delete set null,
  add column if not exists maintenance_condition text;       -- "showroom" | "lived_in" | "rough"
