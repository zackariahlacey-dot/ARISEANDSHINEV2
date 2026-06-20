-- ============================================================
-- Ultimate Interior + Exterior Reset — Price Update
-- Vermont Detailing (June 2026)
--
-- Aligns the DB pricing with the homepage display ($335 sedan to
-- $375 3-row/work van). Old size tiers were $350-$400 which left
-- a $15-$25 gap between what customers saw and what they were
-- charged at booking. Run this in the Supabase SQL Editor.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

UPDATE public.services
SET
  price_small       = 335,
  price_medium      = 335,
  price_large       = 355,
  price_extra_large = 375,
  updated_at        = NOW()
WHERE name = 'Ultimate Interior + Exterior Reset';

-- Sanity check (uncomment to confirm):
-- SELECT name, price_small, price_medium, price_large, price_extra_large, is_active
-- FROM public.services WHERE name = 'Ultimate Interior + Exterior Reset';
