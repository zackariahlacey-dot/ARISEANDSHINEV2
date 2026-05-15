-- ============================================================
-- Service Price Restructure — Vermont Detailing (May 2026)
-- Adds size-tier pricing where Ultimate services were previously flat,
-- and bumps XL/work van pricing across the basics to reflect actual labor.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Interior Detail
UPDATE services
SET price_small       = 150,
    price_medium      = 160,
    price_large       = 175,
    price_extra_large = 185
WHERE name = 'Interior Detail';

-- Exterior Detail
UPDATE services
SET price_small       = 130,
    price_medium      = 140,
    price_large       = 155,
    price_extra_large = 170
WHERE name = 'Exterior Detail';

-- Full Detail
UPDATE services
SET price_small       = 240,
    price_medium      = 255,
    price_large       = 270,
    price_extra_large = 280
WHERE name = 'Full Detail';

-- Ultimate Interior Reset (flat $250 → size-tiered $240–$270)
UPDATE services
SET price_small       = 240,
    price_medium      = 250,
    price_large       = 260,
    price_extra_large = 270
WHERE name = 'Ultimate Interior Reset';

-- Ultimate Interior + Exterior Reset (flat $350 → size-tiered $350–$400)
UPDATE services
SET price_small       = 350,
    price_medium      = 365,
    price_large       = 385,
    price_extra_large = 400
WHERE name = 'Ultimate Interior + Exterior Reset';
