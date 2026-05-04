-- ============================================================
-- Coupons: add max_uses limit
-- Run this in the Supabase SQL Editor.
-- After adding the column, application code is responsible for:
--   1. Rejecting validation when current usage >= max_uses (validateCoupon)
--   2. Auto-flipping is_active = false when the limit is hit (bookDetailing)
-- A NULL max_uses means unlimited uses (existing default behaviour).
-- ============================================================

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_uses INTEGER;

COMMENT ON COLUMN public.coupons.max_uses IS
  'Maximum number of bookings that can redeem this code. NULL = unlimited.';
