-- ============================================================
-- Fleet Quote Inquiries
-- Vermont Detailing (June 2026)
--
-- Captures fleet quote requests from /fleet page so admin can
-- review, accept, and schedule multi-vehicle bookings.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fleet_inquiries (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact
  business_name            TEXT,
  contact_name             TEXT NOT NULL,
  contact_email            TEXT NOT NULL,
  contact_phone            TEXT NOT NULL,
  service_address          TEXT,

  -- Quote inputs
  vehicle_count            INT  NOT NULL,
  -- {"sedan": 3, "suv": 2, "xl": 1} — per-size count totaling vehicle_count
  vehicle_mix_json         JSONB NOT NULL,
  service_tier             TEXT NOT NULL,            -- e.g. "Full Detail", "Ultimate Interior Reset"
  estimated_total_cents    INT  NOT NULL,            -- after fleet discount
  fleet_discount_pct       INT  NOT NULL DEFAULT 0,  -- 5 / 10 / 15 / 20

  -- Customer's flexible preferences
  preferred_window         TEXT,                     -- "Within 2 weeks", "Next month", etc.
  notes                    TEXT,

  -- Admin state machine
  status                   TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','accepted','scheduled','declined')),
  -- Admin-chosen days for the multi-day fleet: ["2026-07-15","2026-07-16"]
  scheduled_dates_json     JSONB,
  admin_notes              TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin sorting (most recent first)
CREATE INDEX IF NOT EXISTS idx_fleet_inquiries_created_at
  ON public.fleet_inquiries (created_at DESC);

-- Index for status filtering in the admin view
CREATE INDEX IF NOT EXISTS idx_fleet_inquiries_status
  ON public.fleet_inquiries (status, created_at DESC);

-- RLS — service role can read/write, anon can only INSERT (for the public form)
ALTER TABLE public.fleet_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet inquiry public insert" ON public.fleet_inquiries;
CREATE POLICY "fleet inquiry public insert" ON public.fleet_inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "fleet inquiry service role full" ON public.fleet_inquiries;
CREATE POLICY "fleet inquiry service role full" ON public.fleet_inquiries
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
