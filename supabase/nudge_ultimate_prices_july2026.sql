-- ============================================================
-- ARISE & SHINE VT — Ultimate Interior Reset price nudge
-- July 2026 · post-lineup-launch adjustment
--
-- Rationale: market comps in Burlington-area put "seats-out
-- interior reset" pricing at $325+ starting, $375+ SUV, $425+ XL.
-- Small +$25 bump per tier keeps us at the bottom of that band
-- without shocking existing customers.
--
-- Idempotent — safe to re-run.
-- ============================================================

UPDATE public.services SET
  price_small = 325, price_medium = 325,
  price_large = 360, price_extra_large = 395,
  updated_at = NOW()
WHERE name = 'Ultimate Interior Reset';

-- SANITY CHECK
-- SELECT name, price_medium AS sedan, price_large AS suv, price_extra_large AS xl
-- FROM public.services
-- WHERE name = 'Ultimate Interior Reset';
--
-- Expected: sedan=325, suv=360, xl=395
