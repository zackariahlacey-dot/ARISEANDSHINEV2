-- ============================================================
-- ARISE & SHINE VT — Interior Detail SUV/XL nudge
-- July 2026 · post-Ultimate-nudge market alignment
--
-- Rationale: VT market comps put Interior Detail on SUV at
-- $160-210 and on 3-row/full-size at $180-260. Sedan stays
-- at $150 (already market-aligned). Bumping SUV +$10 and
-- XL +$10 to move off the bottom of the band.
--
-- Idempotent — safe to re-run.
-- ============================================================

UPDATE public.services SET
  price_small = 150, price_medium = 150,
  price_large = 175, price_extra_large = 190,
  updated_at = NOW()
WHERE name = 'Interior Detail';

-- SANITY CHECK
-- SELECT name, price_medium AS sedan, price_large AS suv, price_extra_large AS xl
-- FROM public.services
-- WHERE name = 'Interior Detail';
--
-- Expected: sedan=150, suv=175, xl=190
