-- ============================================================
-- Foundation Pricing Update — May 2026
--
-- New per-size pricing for the four customer-facing detail services.
-- Bold values were specified by the owner; compact and a few mid-tier
-- values are interpolations using the +10/+15/+20 ladder that already
-- existed. Adjust either via this file or by re-running individual
-- UPDATE statements.
-- ============================================================

-- Interior Detail — owner spec: XL (3-row) = $175
UPDATE services
SET price_small       = 145,
    price_medium      = 155,
    price_large       = 165,
    price_extra_large = 175
WHERE name = 'Interior Detail';

-- Full Detail — owner spec: sedan = $240, XL = $280
UPDATE services
SET price_small       = 220,
    price_medium      = 240,
    price_large       = 260,
    price_extra_large = 280
WHERE name = 'Full Detail';

-- Ultimate Interior Reset — owner spec: sedan $240, SUV $250, 3-row $265
UPDATE services
SET price_small       = 230,
    price_medium      = 240,
    price_large       = 250,
    price_extra_large = 265
WHERE name = 'Ultimate Interior Reset';

-- Ultimate Interior + Exterior Reset — owner spec: sedan $335, XL/Yukon $375
UPDATE services
SET price_small       = 320,
    price_medium      = 335,
    price_large       = 355,
    price_extra_large = 375
WHERE name = 'Ultimate Interior + Exterior Reset';
