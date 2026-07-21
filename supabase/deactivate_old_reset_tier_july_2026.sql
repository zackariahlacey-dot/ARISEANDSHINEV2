-- ============================================================
-- ARISE & SHINE VT — DEACTIVATE OLD RESET TIER
-- July 2026 · Simplify to 2 tiers per foundation
--
-- CHANGES:
--   Deactivate "Ultimate Interior Reset" (was displayed as "The Reset — Interior")
--   Deactivate "The Reset — Full"
--
--   The Refresh — Interior/Exterior/Full services keep their DB names but are
--   now DISPLAYED as "The Reset — Interior/Exterior/Full" via
--   lib/serviceDisplay.ts. They become the top (and only non-Basic) tier per
--   foundation. Prices unchanged.
--
-- Deactivating (not deleting) preserves booking history + loyalty + email
-- references to these services.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- Deactivate "Ultimate Interior Reset" (top interior tier — being retired)
UPDATE public.services
SET is_active = false, updated_at = NOW()
WHERE name = 'Ultimate Interior Reset';

-- Deactivate "The Reset — Full" (top full tier — being retired)
UPDATE public.services
SET is_active = false, updated_at = NOW()
WHERE name = 'The Reset — Full';


-- ── SANITY CHECK ──
-- SELECT name, price_small AS sedan, is_active FROM public.services
-- WHERE category = 'Detail' ORDER BY price_small;
--
-- Expected active services (sedan price):
--   Basic Exterior Detail       120
--   Basic Interior Detail       150
--   Basic Full Detail           235
--   The Refresh — Interior      235   (displays as "The Reset — Interior")
--   The Refresh — Exterior      245   (displays as "The Reset — Exterior")
--   The Refresh — Full          300   (displays as "The Reset — Full")
--
-- Inactive (kept for history):
--   Ultimate Interior Reset
--   The Reset — Full             (the OLD Reset — Full, not to be confused
--                                 with the new one which will render from
--                                 "The Refresh — Full")
