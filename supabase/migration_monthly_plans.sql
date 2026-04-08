-- ============================================================
-- Monthly Maintenance Plans
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.monthly_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL,          -- 'interior_refresh' | 'interior_elite' | 'full_maintenance' | 'full_elite'
  plan_name TEXT NOT NULL,
  plan_price NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'stripe',  -- 'stripe' | 'cash'
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  -- Snapshot from onboarding
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_size TEXT,
  service_address TEXT,
  -- Scheduling anchor: day of month the monthly email fires
  signup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.monthly_schedule_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.monthly_subscriptions(id) ON DELETE CASCADE,
  month TEXT NOT NULL,            -- 'YYYY-MM'
  chosen_date DATE,
  chosen_time TEXT,               -- '09:00 AM' etc.
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'skipped'
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, month)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_monthly_subs_email    ON public.monthly_subscriptions (customer_email);
CREATE INDEX IF NOT EXISTS idx_monthly_subs_profile  ON public.monthly_subscriptions (profile_id);
CREATE INDEX IF NOT EXISTS idx_monthly_subs_status   ON public.monthly_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_monthly_picks_sub     ON public.monthly_schedule_picks (subscription_id);
CREATE INDEX IF NOT EXISTS idx_monthly_picks_month   ON public.monthly_schedule_picks (month);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monthly_subs_updated_at   ON public.monthly_subscriptions;
DROP TRIGGER IF EXISTS trg_monthly_picks_updated_at  ON public.monthly_schedule_picks;

CREATE TRIGGER trg_monthly_subs_updated_at
  BEFORE UPDATE ON public.monthly_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_monthly_picks_updated_at
  BEFORE UPDATE ON public.monthly_schedule_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
