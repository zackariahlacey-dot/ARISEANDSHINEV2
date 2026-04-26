-- Raise Ultimate Interior + Exterior Reset to $350 flat rate (all sizes)
UPDATE services
SET price_small       = 350,
    price_medium      = 350,
    price_large       = 350,
    price_extra_large = 350
WHERE name = 'Ultimate Interior + Exterior Reset';
