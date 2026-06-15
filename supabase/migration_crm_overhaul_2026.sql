-- ==========================================================================
-- CRM + Multi-Vehicle Overhaul (2026)
-- Run once in the Supabase SQL editor. Idempotent — safe to re-run.
-- ==========================================================================

-- ── 1. profiles: CRM columns ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tags             TEXT[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS do_not_contact   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lifecycle_stage  TEXT    DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS address          TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle ON public.profiles(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_profiles_tags      ON public.profiles USING GIN (tags);

-- ── 2. client_tasks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  notes        TEXT,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_tasks_profile ON public.client_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_pending ON public.client_tasks(due_date)
  WHERE completed_at IS NULL;

-- ── 3. booking_vehicles (first-class multi-vehicle) ────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  vehicle_id    UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  position      INTEGER NOT NULL DEFAULT 0,

  -- Snapshot fields preserve history even if a vehicles row is deleted
  make          TEXT,
  model         TEXT,
  year          INTEGER,
  size          TEXT CHECK (size IN ('small','medium','large','extra_large')),

  -- Per-vehicle service
  service_id    UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name  TEXT,

  -- Per-vehicle line pricing
  base_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  addons_json   JSONB DEFAULT '[]'::jsonb,
  line_total    NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_mins INTEGER,

  -- Per-vehicle status
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending / in_progress / complete
  completed_at  TIMESTAMPTZ,

  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_vehicles_booking ON public.booking_vehicles(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_vehicles_vehicle ON public.booking_vehicles(vehicle_id);

-- ── 4. Backfill PRIMARY vehicle for every existing booking ─────────────────
-- Safe casts: vehicle_year is TEXT and may contain "?" or other junk from old
-- admin entries — using a regex guard so the whole backfill doesn't abort.
-- Skip Personal Block calendar entries (they're not real vehicle jobs) and
-- coerce any out-of-enum size to 'medium' to satisfy the CHECK constraint.
INSERT INTO public.booking_vehicles
  (booking_id, vehicle_id, position, make, model, year, size,
   service_id, service_name, base_price, addons_json, line_total, status, completed_at)
SELECT
  b.id,
  b.vehicle_id,
  0,
  COALESCE(b.vehicle_make, v.make),
  COALESCE(b.vehicle_model, v.model),
  COALESCE(
    CASE WHEN b.vehicle_year ~ '^[0-9]+$' THEN b.vehicle_year::int ELSE NULL END,
    v.year
  ),
  CASE
    WHEN b.vehicle_size  IN ('small','medium','large','extra_large') THEN b.vehicle_size
    WHEN v.size          IN ('small','medium','large','extra_large') THEN v.size
    ELSE 'medium'
  END,
  b.service_id,
  b.service_name,
  COALESCE(b.total_price, 0),
  COALESCE(b.addons_json, '[]'::jsonb),
  COALESCE(b.total_price, 0),
  CASE WHEN b.status IN ('completed','complete') THEN 'complete' ELSE 'pending' END,
  CASE WHEN b.status IN ('completed','complete') THEN b.updated_at ELSE NULL END
FROM public.bookings b
LEFT JOIN public.vehicles v ON v.id = b.vehicle_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_vehicles bv WHERE bv.booking_id = b.id
)
  -- Skip calendar blocks / non-vehicle entries
  AND COALESCE(b.service_name, '') NOT ILIKE '%Personal Block%'
  AND COALESCE(b.service_name, '') NOT ILIKE '%Day Blocked%'
  AND COALESCE(b.service_name, '') NOT ILIKE '%Admin Block%';

-- ── 5. Backfill ADDITIONAL vehicles from bookings.additional_vehicles_json ─
-- Same defensive casting on every field that could be junk.
INSERT INTO public.booking_vehicles
  (booking_id, vehicle_id, position, make, model, year, size,
   service_name, base_price, addons_json, line_total, status)
SELECT
  b.id,
  CASE
    WHEN (av.value->>'vehicleDbId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (av.value->>'vehicleDbId')::uuid
    ELSE NULL
  END,
  (av.ordinality)::int,
  av.value->>'vehicleMake',
  av.value->>'vehicleModel',
  CASE WHEN (av.value->>'vehicleYear') ~ '^[0-9]+$' THEN (av.value->>'vehicleYear')::int ELSE NULL END,
  CASE av.value->>'vehicleSize'
    WHEN 'compact' THEN 'medium'
    WHEN 'sedan'   THEN 'medium'
    WHEN 'suv'     THEN 'large'
    WHEN 'xl'      THEN 'extra_large'
    WHEN 'small'        THEN 'small'
    WHEN 'medium'       THEN 'medium'
    WHEN 'large'        THEN 'large'
    WHEN 'extra_large'  THEN 'extra_large'
    ELSE 'medium'
  END,
  av.value->>'serviceName',
  CASE WHEN (av.value->>'servicePrice') ~ '^[0-9]+(\.[0-9]+)?$' THEN (av.value->>'servicePrice')::numeric ELSE 0 END,
  COALESCE(av.value->'selectedAddons', '[]'::jsonb),
  CASE WHEN (av.value->>'servicePrice') ~ '^[0-9]+(\.[0-9]+)?$' THEN (av.value->>'servicePrice')::numeric ELSE 0 END,
  CASE WHEN b.status IN ('completed','complete') THEN 'complete' ELSE 'pending' END
FROM public.bookings b,
     LATERAL jsonb_array_elements(b.additional_vehicles_json)
       WITH ORDINALITY av(value, ordinality)
WHERE b.additional_vehicles_json IS NOT NULL
  AND jsonb_typeof(b.additional_vehicles_json) = 'array'
  AND jsonb_array_length(b.additional_vehicles_json) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_vehicles bv
    WHERE bv.booking_id = b.id AND bv.position >= 1
  );

-- ==========================================================================
-- Vehicle Dedup
-- ==========================================================================

-- Trim whitespace so the dedup match works
UPDATE public.vehicles
SET make = TRIM(make), model = TRIM(model)
WHERE make IS DISTINCT FROM TRIM(make) OR model IS DISTINCT FROM TRIM(model);

-- Build the dupe map + repoint bookings + repoint booking_vehicles + DELETE
-- duplicate vehicles, all in a single chained CTE statement. This avoids the
-- temp-table-disappears-between-statements problem in autocommit SQL editors
-- (Supabase Studio runs each statement in its own transaction).
WITH dupe_map AS (
  SELECT dupe_id, keeper_id FROM (
    SELECT
      id AS dupe_id,
      FIRST_VALUE(id) OVER (
        PARTITION BY user_id, LOWER(make), LOWER(model), year
        ORDER BY created_at ASC, id ASC
      ) AS keeper_id
    FROM public.vehicles
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE dupe_id <> keeper_id
),
repoint_bookings AS (
  UPDATE public.bookings b
  SET vehicle_id = m.keeper_id
  FROM dupe_map m
  WHERE b.vehicle_id = m.dupe_id
  RETURNING 1
),
repoint_booking_vehicles AS (
  UPDATE public.booking_vehicles bv
  SET vehicle_id = m.keeper_id
  FROM dupe_map m
  WHERE bv.vehicle_id = m.dupe_id
  RETURNING 1
)
DELETE FROM public.vehicles
WHERE id IN (SELECT dupe_id FROM dupe_map);

-- Prevent future dupes — case-insensitive unique index on the natural key.
-- Expressions wrapped in parens per PG convention.
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_user_make_model_year_norm
ON public.vehicles (user_id, (LOWER(make)), (LOWER(model)), year);

-- ==========================================================================
-- Idempotency helper for payment-link → auto-complete
-- ==========================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS paid_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_source         TEXT,  -- 'stripe' | 'cash' | 'gift_card'
  ADD COLUMN IF NOT EXISTS payment_link_sent_at   TIMESTAMPTZ;
