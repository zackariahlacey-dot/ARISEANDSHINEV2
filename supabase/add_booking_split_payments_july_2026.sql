-- ============================================================
-- Booking Split Payments — split-tender across multiple emails
-- Run this in the Supabase SQL Editor
--
-- Admin can carve a booking's total into N portions, each assigned
-- to a different email (a friend paying part, per-vehicle billing
-- across a multi-vehicle job, etc.). Each split row has its own
-- unique pay_token → maps to /pay/split/[token], its own Stripe
-- session, and its own paid/pending status. Booking's aggregate
-- paid_at is set once every split is paid.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_split_payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  -- Non-guessable public identifier used in the /pay/split/[token] URL.
  -- Kept separate from the row's UUID so we can rotate a link if needed
  -- without leaking primary-key info.
  pay_token                 TEXT NOT NULL UNIQUE,
  -- Position of the split within the booking (0-indexed). Also used as
  -- vehicle_position when the admin splits by vehicle.
  position                  INTEGER NOT NULL DEFAULT 0,
  recipient_email           TEXT NOT NULL,
  recipient_name            TEXT,
  -- Amount owed by THIS recipient, in whole USD dollars for parity with
  -- bookings.total_price. cents column mirrors it for future precision.
  amount                    NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  amount_cents              INTEGER GENERATED ALWAYS AS ((amount * 100)::int) STORED,
  -- Optional link to a specific booking_vehicles row when the admin
  -- assigned a vehicle to this recipient. Nullable so free-form
  -- "amount by email" splits still work.
  vehicle_position          INTEGER,
  status                    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','sent','paid','cancelled','refunded')),
  stripe_session_id         TEXT UNIQUE,
  stripe_payment_intent_id  TEXT,
  sent_at                   TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_split_booking       ON public.booking_split_payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_split_status        ON public.booking_split_payments (status);
CREATE INDEX IF NOT EXISTS idx_booking_split_token         ON public.booking_split_payments (pay_token);
CREATE INDEX IF NOT EXISTS idx_booking_split_stripe_session ON public.booking_split_payments (stripe_session_id);

-- updated_at auto-touch trigger. Uses the same pattern as booking_vehicles.
CREATE OR REPLACE FUNCTION public.touch_booking_split_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_booking_split_payments_updated_at ON public.booking_split_payments;
CREATE TRIGGER trg_booking_split_payments_updated_at
  BEFORE UPDATE ON public.booking_split_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_booking_split_payments_updated_at();

-- RLS: service-role client only (all admin actions go through admin client).
-- Customers hitting /pay/split/[token] don't need SELECT because the
-- server action fetches by pay_token via the service role.
ALTER TABLE public.booking_split_payments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.booking_split_payments IS
  'Admin split-tender: N payment recipients per booking. Each row → one payment page + emailed link. Booking marked paid when every row is paid.';
