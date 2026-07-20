-- ============================================================
-- ARISE & SHINE VT — LIGHT DETAILING SERVICE + RECURRING BOOKINGS
-- July 2026
--
-- SCOPE:
-- 1. Add "Light Detailing" service (maintenance-only, per-item pricing)
-- 2. Add recurring_bookings table for monthly repeat scheduling
--
-- POSITIONING:
-- Strictly maintenance for cars in maintained shape. Not a deep clean.
-- Customer picks 2+ items from a checkbox list; total = sum of items or
-- minimum, whichever is higher. Duration always 1 hour regardless of items.
-- Item prices live in code (lib/lightDetailItems.ts) so they can be tuned
-- without a migration — the DB row stores the MINIMUM as price_* columns
-- so any accidental empty booking has a sensible floor.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. LIGHT DETAILING SERVICE ──
-- Price columns store the MINIMUM per size ($65 sedan / $75 SUV / $85 XL).
-- Actual booking price = MAX(sum of selected items, minimum).
INSERT INTO public.services (
  name, description,
  price_small, price_medium, price_large, price_extra_large,
  category, is_subscription, is_active
)
VALUES (
  'Light Detailing',
  'Quick maintenance freshen-up — pick exactly what you need. Perfect for cars already in maintained shape or when you just need a few specific things done. Not a deep clean. Minimum 2 items required. Scheduled for 1 hour; anything over 1 hour or additional on-site work will incur extra charges at standard rates.',
  65, 65, 75, 85,
  'Detail', false, true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_small = EXCLUDED.price_small,
  price_medium = EXCLUDED.price_medium,
  price_large = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category = EXCLUDED.category,
  is_subscription = EXCLUDED.is_subscription,
  is_active = true,
  updated_at = NOW();


-- ── 2. RECURRING BOOKINGS TABLE ──
-- One row per active recurring enrollment. A nightly cron scans this table
-- and auto-creates bookings when next_run_date <= today + 30 (booking is
-- created 30 days ahead so customer has time to reschedule).
--
-- selected_items JSONB shape: ["vacuum", "wipe_down", "windows"]
--   (matches item IDs in lib/lightDetailItems.ts)
--
-- Only used for Light Detailing today, but service_id is generic so we can
-- extend to other services later (e.g. monthly Basic Interior for VIPs).
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,

  -- Customer contact snapshot (in case profile is missing / vehicle deleted)
  customer_name  TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  service_address TEXT,

  -- Vehicle snapshot (denormalized so cron can create bookings even if
  -- the vehicles row was deleted)
  vehicle_year  INTEGER,
  vehicle_make  TEXT,
  vehicle_model TEXT,
  vehicle_size  TEXT,   -- "sedan" | "suv" | "xl"

  -- Light-Detailing-specific config
  selected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_prices JSONB,   -- snapshot of prices at enrollment: {"vacuum": 30, ...}

  -- Scheduling preferences
  interval_days INTEGER NOT NULL DEFAULT 30,   -- 30 = monthly
  preferred_day_of_week INTEGER CHECK (preferred_day_of_week BETWEEN 0 AND 6),
  preferred_time TIME,

  -- Recurrence state
  next_run_date DATE NOT NULL,
  last_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_created_at TIMESTAMPTZ,

  -- Pricing
  discount_pct NUMERIC(5, 2) DEFAULT 10.00,   -- 10% off recurring bookings

  -- Status
  active BOOLEAN DEFAULT TRUE,
  paused_until DATE,     -- pause without deleting (e.g. customer traveling)
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  -- Notification tracking so we don't double-send reminders
  last_reminder_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active_next
  ON public.recurring_bookings (active, next_run_date)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_user
  ON public.recurring_bookings (user_id);


-- ── 3. LINK RECURRING → BOOKINGS ──
-- Add optional column to bookings so a created booking can point back to
-- its recurring parent (useful for admin UI + skipping duplicate creation).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS recurring_booking_id UUID
    REFERENCES public.recurring_bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_recurring
  ON public.bookings (recurring_booking_id)
  WHERE recurring_booking_id IS NOT NULL;


-- ── SANITY CHECK ──
-- SELECT name, price_small AS sedan_min, price_large AS suv_min, price_extra_large AS xl_min
-- FROM public.services WHERE name = 'Light Detailing';
--
-- SELECT COUNT(*) FROM public.recurring_bookings;
