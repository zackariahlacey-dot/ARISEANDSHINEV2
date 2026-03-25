-- Update service prices
-- Interior: normal (2-row) $150, large (3-row+) $175
-- Exterior: normal $125, large $150
-- Full Detail: normal $240, large $275

UPDATE services
SET
  price_small       = 150,
  price_medium      = 150,
  price_large       = 175,
  price_extra_large = 175
WHERE name = 'Interior Detail';

UPDATE services
SET
  price_small       = 125,
  price_medium      = 125,
  price_large       = 150,
  price_extra_large = 150
WHERE name = 'Exterior Detail';

UPDATE services
SET
  price_small       = 240,
  price_medium      = 240,
  price_large       = 275,
  price_extra_large = 275
WHERE name = 'Full Detail';
