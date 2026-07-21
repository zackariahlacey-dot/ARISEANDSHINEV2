-- ============================================================
-- ARISE & SHINE VT — REFRESH / RESET REPRICE + SCOPE CHANGES
-- July 2026 · Second-pass pricing after market feedback
--
-- CHANGES:
--   Refresh — Interior: $265/$295/$325 → $235/$250/$265
--     Also DROP heavy salt from bundle (salt now à-la-carte only for Refresh)
--   Reset — Interior:   $395/$445/$495 → $335/$350/$365
--   Refresh — Full:     $445/$495/$545 → $300/$325/$350
--     Also DROP headlight restoration from bundle (headlight à-la-carte only)
--   Reset — Full:       $595/$655/$715 → $465/$485/$505
--
-- Refresh — Exterior unchanged (already $245/$275/$305).
-- Basic tier prices unchanged.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── Refresh — Interior ──
UPDATE public.services SET
  description = 'A deeper interior clean than a Basic pass. Everything in a Basic Interior Detail PLUS bundled Carpet & Upholstery Shampoo and Heavy Pet Hair Extraction. Saves vs à la carte. For cars that need more than a wipe-down but not the seats-out full reset. Heavy salt removal is a separate add-on if needed.',
  price_small = 235, price_medium = 235,
  price_large = 250, price_extra_large = 265,
  is_active = true, updated_at = NOW()
WHERE name = 'The Refresh — Interior';

-- ── Reset — Interior (DB name still "Ultimate Interior Reset") ──
UPDATE public.services SET
  price_small = 335, price_medium = 335,
  price_large = 350, price_extra_large = 365,
  is_active = true, updated_at = NOW()
WHERE name = 'Ultimate Interior Reset';

-- ── Refresh — Full ──
UPDATE public.services SET
  description = 'Interior + Exterior refresh in one visit. Everything in a Basic Full Detail PLUS bundled Carpet & Upholstery Shampoo, Pet Hair Extraction, Clay Bar, and Engine Bay Detail. Best-value mid-tier for cars that need more than a wipe-down but not seats-out. Heavy salt removal and Headlight Restoration are separate add-ons if needed.',
  price_small = 300, price_medium = 300,
  price_large = 325, price_extra_large = 350,
  is_active = true, updated_at = NOW()
WHERE name = 'The Refresh — Full';

-- ── Reset — Full ──
UPDATE public.services SET
  price_small = 465, price_medium = 465,
  price_large = 485, price_extra_large = 505,
  is_active = true, updated_at = NOW()
WHERE name = 'The Reset — Full';


-- ── SANITY CHECK ──
-- SELECT name, price_small AS sedan, price_large AS suv, price_extra_large AS xl
-- FROM public.services
-- WHERE name IN (
--   'The Refresh — Interior', 'Ultimate Interior Reset',
--   'The Refresh — Full',     'The Reset — Full'
-- )
-- ORDER BY price_small;
--
-- Expected:
--   The Refresh — Interior     235 / 250 / 265
--   Refresh — Full             300 / 325 / 350
--   Ultimate Interior Reset    335 / 350 / 365   (displays as "The Reset — Interior")
--   The Reset — Full           465 / 485 / 505
