-- Price update — standard services
-- Interior Detail:  normal $150 · large/3-row $175  (no change, confirming)
-- Exterior Detail:  normal $125 · large/3-row $150  (no change, confirming)
-- Full Detail:      normal $240 · large/3-row $260  (large was $275 → $260)
-- Ultimate Interior Reset + Wash: normal $340 · large/3-row $375

UPDATE services
SET price_small = 150, price_medium = 150,
    price_large = 175, price_extra_large = 175
WHERE name = 'Interior Detail';

UPDATE services
SET price_small = 125, price_medium = 125,
    price_large = 150, price_extra_large = 150
WHERE name = 'Exterior Detail';

UPDATE services
SET price_small = 240, price_medium = 240,
    price_large = 260, price_extra_large = 260
WHERE name = 'Full Detail';

UPDATE services
SET price_small = 340, price_medium = 340,
    price_large = 375, price_extra_large = 375
WHERE name = 'Ultimate Interior Reset + Wash';

