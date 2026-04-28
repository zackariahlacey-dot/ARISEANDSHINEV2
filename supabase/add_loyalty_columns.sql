-- Add loyalty tier columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS completed_detail_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount_pct   INTEGER NOT NULL DEFAULT 0;

-- Retroactive backfill: count completed car detail bookings per profile
-- Only counts the qualifying services (vehicle detailing, not boat/RV)
WITH counts AS (
  SELECT
    user_id,
    COUNT(*) AS detail_count
  FROM bookings
  WHERE status = 'completed'
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
