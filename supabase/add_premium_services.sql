-- ============================================================
-- Premium Services: Ultimate Series & Paint Correction
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times — skips rows that already exist
-- ============================================================

INSERT INTO services (name, description, price_small, price_medium, price_large, price_extra_large, is_subscription)
SELECT name, description, price_small, price_medium, price_large, price_extra_large, is_subscription
FROM (VALUES
  (
    'Ultimate Interior Reset + Wash',
    'Full deep-clean with hot water extraction, steam sanitation, Vermont road salt neutralization, and a 6-month ceramic sealant upgrade.',
    375, 375, 425, 425,
    false
  ),
  (
    'Ultimate Showroom Restoration',
    'Our flagship service — everything in the Ultimate Interior Reset plus mechanical clay bar, 1-step machine paint correction, IPA paint prep, and a premium 12-month ceramic coating lite.',
    525, 525, 650, 650,
    false
  ),
  (
    'Single-Stage Paint Enhancement',
    'Massive gloss improvement for well-maintained vehicles. Full decontamination, clay bar, single-pass machine polish removing 50–70% of light swirl marks. Includes 6-month ceramic sealant.',
    350, 350, 450, 450,
    false
  ),
  (
    'Two-Stage Paint Correction',
    'The ultimate restoration for deep scratches and heavy swirls. Two-pass machine correction removing 85–95% of correctable defects. Includes 12-month premium ceramic coating lite.',
    650, 650, 800, 800,
    false
  )
) AS v(name, description, price_small, price_medium, price_large, price_extra_large, is_subscription)
WHERE NOT EXISTS (
  SELECT 1 FROM services s WHERE s.name = v.name
);
