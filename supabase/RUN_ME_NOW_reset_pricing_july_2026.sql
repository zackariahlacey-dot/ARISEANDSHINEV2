-- ============================================================
-- ⚠️  RUN THIS IN SUPABASE — brings your DB in sync with the current
--     "Basic + Reset" 2-tier lineup shown on the site.
--
-- Combines these previously-unrun migrations into one file:
--   refresh_reset_reprice_july_2026_v2.sql
--   reset_full_bump_and_hours_july_2026.sql
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── The Reset — Interior (DB name still "The Refresh — Interior") ──
-- Was $265/$295/$325, now $235/$250/$265. Drops heavy salt from bundle.
UPDATE public.services SET
  description = 'A deeper interior clean than a Basic pass. Everything in a Basic Interior Detail PLUS bundled Carpet & Upholstery Shampoo and Heavy Pet Hair Extraction. Saves vs à la carte. For cars that need more than a wipe-down but not the seats-out full reset. Heavy salt removal is a separate add-on if needed.',
  price_small = 235, price_medium = 235,
  price_large = 250, price_extra_large = 265,
  is_active = true, updated_at = NOW()
WHERE name = 'The Refresh — Interior';

-- ── The Reset — Full (DB name still "The Refresh — Full") ──
-- Was $445/$495/$545, now $325/$350/$375. Drops headlight from bundle.
UPDATE public.services SET
  description = 'Interior + Exterior reset in one visit. Everything in a Basic Full Detail PLUS bundled Carpet & Upholstery Shampoo, Pet Hair Extraction, Clay Bar, and Engine Bay Detail. Best-value tier for cars that need more than a wipe-down but not seats-out. Heavy salt removal and Headlight Restoration are separate add-ons if needed.',
  price_small = 325, price_medium = 325,
  price_large = 350, price_extra_large = 375,
  is_active = true, updated_at = NOW()
WHERE name = 'The Refresh — Full';

-- ── The Reset — Exterior (unchanged, but making sure it's active) ──
UPDATE public.services SET
  is_active = true, updated_at = NOW()
WHERE name = 'The Refresh — Exterior';

-- ── Retired top tier — deactivate if not already ──
UPDATE public.services SET is_active = false, updated_at = NOW()
WHERE name IN ('Ultimate Interior Reset', 'The Reset — Full');


-- ── SANITY CHECK — run this SELECT after to confirm ──
SELECT name, price_small AS sedan, price_large AS suv, price_extra_large AS xl, is_active
FROM public.services
WHERE category = 'Detail'
ORDER BY is_active DESC, price_small;

-- Expected ACTIVE (sedan / suv / xl):
--   Basic Exterior Detail    120 / 145 / 170
--   Basic Interior Detail    150 / 175 / 190  (or 200 if you also ran the earlier reprice)
--   Basic Full Detail        235 / 260 / 285
--   The Refresh — Interior   235 / 250 / 265   → displays as "The Reset — Interior"
--   The Refresh — Exterior   245 / 275 / 305   → displays as "The Reset — Exterior"
--   The Refresh — Full       325 / 350 / 375   → displays as "The Reset — Full"
--
-- Expected INACTIVE (kept for booking history):
--   Ultimate Interior Reset
--   The Reset — Full (the OLD one — the new one lives under the "The Refresh — Full" row)
