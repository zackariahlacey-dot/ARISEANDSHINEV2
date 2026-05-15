-- ============================================================
-- Membership credit tracking on bookings (May 2026)
-- Lets us identify which bookings consumed membership credit and how much,
-- so we can restore credit on cancellation and audit usage.
-- Run this in the Supabase SQL editor.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS membership_credit_applied_cents INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_membership_id ON public.bookings(membership_id);
