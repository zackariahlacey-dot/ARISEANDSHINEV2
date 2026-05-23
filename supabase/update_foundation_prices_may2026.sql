-- ============================================================
-- Foundation Pricing Update — May 2026
--
-- Three customer-facing sizes only (Sedan / SUV / 3-row–Yukon). The
-- legacy "compact" slug + price_small column are no longer surfaced in
-- the UI; we still write price_small = price_medium so any old code or
-- saved booking that queries price_small returns a sane value.
-- ============================================================

-- Interior Detail — owner spec: XL (3-row) = $175
UPDATE services
SET price_small       = 155,
    price_medium      = 155,
    price_large       = 165,
    price_extra_large = 175
WHERE name = 'Interior Detail';

-- Full Detail — owner spec: sedan = $240, XL = $280
UPDATE services
SET price_small       = 240,
    price_medium      = 240,
    price_large       = 260,
    price_extra_large = 280
WHERE name = 'Full Detail';

-- Ultimate Interior Reset — owner spec: sedan $240, SUV $250, 3-row $265
UPDATE services
SET price_small       = 240,
    price_medium      = 240,
    price_large       = 250,
    price_extra_large = 265
WHERE name = 'Ultimate Interior Reset';

-- Ultimate Interior + Exterior Reset — owner spec: sedan $335, XL/Yukon $375
UPDATE services
SET price_small       = 335,
    price_medium      = 335,
    price_large       = 355,
    price_extra_large = 375
WHERE name = 'Ultimate Interior + Exterior Reset';
