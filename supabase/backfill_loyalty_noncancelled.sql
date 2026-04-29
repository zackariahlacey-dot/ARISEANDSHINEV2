-- Backfill loyalty tiers based on ALL non-cancelled qualifying bookings
-- (not just completed ones). Run once in Supabase SQL editor.
-- This retroactively gives past customers their correct tier.

WITH counts AS (
  SELECT
    user_id,
    COUNT(*) AS detail_count
  FROM bookings
  WHERE status != 'cancelled'
    AND service_name IN (
      'Interior Detail',
      'Exterior Detail',
      'Full Detail',
      'Ultimate Interior Reset',
      'Ultimate Interior + Exterior Reset'
    )
    AND user_id IS NOT NULL
  GROUP BY user_id
)
UPDATE profiles p
SET
  completed_detail_count = c.detail_count,
  loyalty_discount_pct = CASE
    WHEN c.detail_count >= 10 THEN 20
    WHEN c.detail_count >= 5  THEN 15
    WHEN c.detail_count >= 3  THEN 10
    WHEN c.detail_count >= 1  THEN 5
    ELSE 0
  END
FROM counts c
WHERE p.id = c.user_id;

-- Reset anyone whose only bookings are now cancelled (count drops to 0)
UPDATE profiles p
SET
  completed_detail_count = 0,
  loyalty_discount_pct   = 0
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.user_id = p.id
    AND b.status != 'cancelled'
    AND b.service_name IN (
      'Interior Detail', 'Exterior Detail', 'Full Detail',
      'Ultimate Interior Reset', 'Ultimate Interior + Exterior Reset'
    )
)
AND p.completed_detail_count > 0;
