-- ============================================================
-- Paint Correction Rebrand — 4-tier pricing (May 2026)
-- Renames the existing two paint correction services and updates
-- their pricing to match the new 4-size tier (small / mid / large / work van).
-- Old bookings keep their snapshotted service_name field, no data loss.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1-Step Paint Correction (was "Single-Stage Paint Enhancement")
UPDATE services
SET name              = 'Ultimate Exterior + 1-Step Paint Correction',
    description       = 'Ultimate Exterior detail + single-pass machine polish that removes 60–75% of light swirl marks, oxidation and water spots. Includes hand wash & dry, clay bar treatment, glass/windows, wheel wells & tires, plastic trim restoration, and a 6-month ceramic spray sealant. Optional 2-year professional ceramic sealant add-on available.',
    price_small       = 350,
    price_medium      = 425,
    price_large       = 500,
    price_extra_large = 675
WHERE name IN (
  'Single-Stage Paint Enhancement',
  'Ultimate Exterior + 1-Step Paint Correction'
);

-- 2-Step Paint Correction (was "Two-Stage Paint Correction")
UPDATE services
SET name              = 'Ultimate Exterior + 2-Step Paint Correction',
    description       = 'Ultimate Exterior detail + two-stage compound and finishing polish that removes 85–95% of correctable defects — deeper scratches, heavy swirls, and oxidation. Includes hand wash & dry, clay bar treatment, glass/windows, wheel wells & tires, plastic trim restoration, and a 6-month ceramic spray sealant. Optional 2-year professional ceramic sealant add-on available.',
    price_small       = 550,
    price_medium      = 650,
    price_large       = 800,
    price_extra_large = 950
WHERE name IN (
  'Two-Stage Paint Correction',
  'Ultimate Exterior + 2-Step Paint Correction'
);
