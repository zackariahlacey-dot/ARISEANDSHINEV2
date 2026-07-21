-- ============================================================
-- ARISE & SHINE VT — RESET FULL +$25 · durations tuned
-- July 2026
--
-- CHANGES:
--   The Refresh — Full (displays as "The Reset — Full"):
--     $300 / $325 / $350 → $325 / $350 / $375  (+$25 per size)
--
-- SERVICE_DURATIONS in code updated separately (not stored in DB).
--
-- Idempotent — safe to re-run.
-- ============================================================

UPDATE public.services SET
  price_small = 325, price_medium = 325,
  price_large = 350, price_extra_large = 375,
  is_active = true, updated_at = NOW()
WHERE name = 'The Refresh — Full';


-- ── SANITY CHECK ──
-- SELECT name, price_small AS sedan, price_large AS suv, price_extra_large AS xl
-- FROM public.services
-- WHERE is_active = true AND category = 'Detail'
-- ORDER BY price_small;
--
-- Expected:
--   Basic Exterior Detail       120 / 145 / 170
--   Basic Interior Detail       150 / 175 / 200
--   Basic Full Detail           235 / 265 / 300
--   The Refresh — Interior      235 / 250 / 265   (displays as "The Reset — Interior")
--   The Refresh — Exterior      245 / 275 / 305   (displays as "The Reset — Exterior")
--   The Refresh — Full          325 / 350 / 375   (displays as "The Reset — Full")
