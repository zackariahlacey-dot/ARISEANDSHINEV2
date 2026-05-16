-- ============================================================
-- Build Your Package — Foundation Pricing (May 2026)
-- Updates Interior/Exterior/Full Detail to the new builder foundation
-- prices. These act as the "base" customers start from before stacking
-- add-ons in the Build Your Package flow.
-- ============================================================

-- Interior Foundation
UPDATE services
SET price_small       = 150,
    price_medium      = 160,
    price_large       = 170,
    price_extra_large = 180
WHERE name = 'Interior Detail';

-- Exterior Foundation (lowered to give room for add-on stacking)
UPDATE services
SET price_small       = 120,
    price_medium      = 130,
    price_large       = 145,
    price_extra_large = 160
WHERE name = 'Exterior Detail';

-- Full Foundation (lowered to position as a base + add-on combo)
UPDATE services
SET price_small       = 215,
    price_medium      = 235,
    price_large       = 255,
    price_extra_large = 275
WHERE name = 'Full Detail';
