-- ============================================================
-- Premium Annual Membership — Vermont Detailing (May 2026)
-- $999/year prepaid plan: customer receives $1,250 in service credit
-- that can be applied to ANY service + add-on combination for 12 months.
-- Requires a signed-in profile to purchase; managed in customer dashboard.
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'premium_annual',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  -- Credit model (stored in cents to avoid float math)
  credit_balance_cents INT NOT NULL DEFAULT 125000,  -- $1,250
  credit_total_cents   INT NOT NULL DEFAULT 125000,  -- $1,250
  amount_paid_cents    INT NOT NULL DEFAULT 99900,   -- $999
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT credit_balance_non_negative CHECK (credit_balance_cents >= 0),
  CONSTRAINT credit_balance_under_total  CHECK (credit_balance_cents <= credit_total_cents)
);

CREATE INDEX IF NOT EXISTS idx_memberships_profile_id ON public.memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status     ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_expires_at ON public.memberships(expires_at);

-- RLS: customers can only see their own memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.memberships;
CREATE POLICY "Users can view own memberships"
  ON public.memberships
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Membership table is written via service-role admin client (Stripe webhook
-- + booking actions). No INSERT/UPDATE/DELETE policies for regular users.

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_memberships_updated_at ON public.memberships;
CREATE TRIGGER touch_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_memberships_updated_at();

-- Atomic credit consumption helper. Returns the new balance, or raises
-- if there isn't enough credit. Used by the booking action via RPC.
CREATE OR REPLACE FUNCTION public.consume_membership_credit(
  p_membership_id UUID,
  p_amount_cents  INT
) RETURNS INT AS $$
DECLARE
  new_balance INT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be positive';
  END IF;

  UPDATE public.memberships
     SET credit_balance_cents = credit_balance_cents - p_amount_cents
   WHERE id = p_membership_id
     AND status = 'active'
     AND expires_at > NOW()
     AND credit_balance_cents >= p_amount_cents
  RETURNING credit_balance_cents INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient membership credit or inactive membership';
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore credit (used on cancellations). Caps at credit_total_cents to
-- prevent over-restoration from data drift.
CREATE OR REPLACE FUNCTION public.restore_membership_credit(
  p_membership_id UUID,
  p_amount_cents  INT
) RETURNS INT AS $$
DECLARE
  new_balance INT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be positive';
  END IF;

  UPDATE public.memberships
     SET credit_balance_cents = LEAST(credit_balance_cents + p_amount_cents, credit_total_cents)
   WHERE id = p_membership_id
  RETURNING credit_balance_cents INTO new_balance;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
