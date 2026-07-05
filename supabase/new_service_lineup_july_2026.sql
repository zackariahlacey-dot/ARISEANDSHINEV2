-- ============================================================
-- ARISE & SHINE VT — MASTER MIGRATION (July 2026)
-- Vermont Detailing / Arise & Shine VT
--
-- SCOPE: Passenger vehicle detail lineup redesign. Simplifies to
-- 3 base packages + 1 Ultimate + 2 Paint Correction SKUs. Marine,
-- RV, Truck, Heavy Equipment, Fleet, Membership flows UNTOUCHED.
--
-- ROLLBACK: run new_service_lineup_july_2026_rollback.sql
-- OR re-run in order: update_service_prices_2026.sql,
--                     update_ult_int_ext_price_june_2026.sql,
--                     simplify_services_june_2026.sql,
--                     update_paint_correction_2026.sql
-- All are idempotent — no data loss.
--
-- SAFETY:
-- - Uses soft delete (is_active = false). No DELETE on services.
-- - Historical bookings preserve their snapshotted service_name.
-- - All emails, crons, gift cards, coupons, loyalty untouched.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. BASE PACKAGES ──
UPDATE public.services SET
  price_small = 150, price_medium = 150,
  price_large = 165, price_extra_large = 180,
  is_active = true, updated_at = NOW()
WHERE name = 'Interior Detail';

UPDATE public.services SET
  description = 'Full exterior hand wash + dry, wheels + tires cleaned and dressed, plastic trim restoration, exterior glass, and INCLUDED 1–3 month ceramic spray sealant. Bug and light streak removal included.',
  price_small = 120, price_medium = 120,
  price_large = 135, price_extra_large = 150,
  is_active = true, updated_at = NOW()
WHERE name = 'Exterior Detail';

UPDATE public.services SET
  description = 'Complete interior + exterior detail — full interior clean plus full exterior wash, wheels/tires, trim, and INCLUDED 1–3 month ceramic spray sealant. Combo saves ~$35–$45 vs. buying separately.',
  price_small = 235, price_medium = 235,
  price_large = 260, price_extra_large = 285,
  is_active = true, updated_at = NOW()
WHERE name = 'Full Detail';

-- ── 2. ULTIMATE INTERIOR RESET ──
UPDATE public.services SET
  description = 'The full interior reset — front seats REMOVED from vehicle for deep steam clean and shampoo of seats + carpet. Includes: steam clean all surfaces, vacuum every crack and crevice, disinfect and protect all surfaces, interior glass, rubber and/or carpet mats cleaned and protected, leather conditioning (if applicable), trunk included. Note: We cannot guarantee 100% removal of set-in stains, embedded debris, or permanent damage — but we will do everything we can.',
  price_small = 300, price_medium = 300,
  price_large = 335, price_extra_large = 370,
  is_active = true, updated_at = NOW()
WHERE name = 'Ultimate Interior Reset';

-- ── 3. DEACTIVATE RETIRED SKUs ──
UPDATE public.services SET is_active = false, updated_at = NOW()
WHERE name IN (
  'Ultimate Interior + Exterior Reset',
  'Ultimate Interior Reset + Wash',
  'Ultimate Exterior',
  'Salt Season Recovery',
  'Boat Showroom Package',
  'RV Showroom 1-Step',
  'RV Showroom 2-Step',
  'RV Oxidation Restoration',
  'Single-Stage Paint Enhancement',
  'Two-Stage Paint Correction'
);

-- ── 4. PAINT CORRECTION (rename + reprice) ──
UPDATE public.services SET
  name = 'Paint Correction — 1 Step',
  description = 'Single-pass machine polish that removes 60–75% of light swirl marks, oxidation, and water spots. Includes hand wash, clay bar decontamination, wheel wells, tires, plastic trim, and INCLUDED 1–3 month ceramic spray sealant. Optional Premium Ceramic add-ons available (section-by-section or full body bundle).',
  price_small = 449, price_medium = 449,
  price_large = 525, price_extra_large = 599,
  is_active = true, updated_at = NOW()
WHERE name IN (
  'Ultimate Exterior + 1-Step Paint Correction',
  'Paint Correction — 1 Step'
);

UPDATE public.services SET
  name = 'Paint Correction — 2 Step',
  description = 'Two-stage compound + finishing polish that removes 85–95% of correctable defects — deeper scratches, heavy swirls, and oxidation. Includes hand wash, clay bar decontamination, wheel wells, tires, plastic trim, and INCLUDED 1–3 month ceramic spray sealant. Optional Premium Ceramic add-ons available (section-by-section or full body bundle).',
  price_small = 675, price_medium = 675,
  price_large = 775, price_extra_large = 875,
  is_active = true, updated_at = NOW()
WHERE name IN (
  'Ultimate Exterior + 2-Step Paint Correction',
  'Paint Correction — 2 Step'
);

-- ── 5. CATEGORIES ──
UPDATE public.services SET category = 'Detail'
WHERE name IN ('Interior Detail', 'Exterior Detail', 'Full Detail', 'Ultimate Interior Reset');

UPDATE public.services SET category = 'Paint Correction'
WHERE name IN ('Paint Correction — 1 Step', 'Paint Correction — 2 Step');

-- ── 6. CLEAN UP RETIRED ADD-ON OVERRIDES ──
-- These add-ons were retired for the July 2026 lineup. Their base prices
-- lived in code (lib/adminAddons.ts, lib/addonMeta.ts) and have been deleted
-- there. Removing any leftover override rows keeps the admin pricing UI clean.
DELETE FROM public.addon_pricing_overrides
WHERE addon_id IN (
  'uv_interior',
  'headliner_clean',
  'tar_bug',
  'mech_chem_decon',
  'salt_recovery_addon',
  'floor_1',
  'floor_2',
  'floor_all',
  'ultimate_interior',
  'polish_ceramic',
  'seat_removal_driver',
  'seat_removal_passenger',
  'seat_removal_rear',
  'seat_removal_3rd_row',
  'seat_removal_all_2row',
  'seat_removal_all_3row',
  'wheel_ceramic',
  'window_coat_windshield',
  'window_coat_front',
  'window_coat_all',
  'ceramic_3yr',
  'steam_sanitation',
  'trim_dressing',
  'odor_bomb'
);

-- ── SANITY CHECKS (uncomment to run after) ──
-- SELECT name, price_small AS sedan, price_large AS suv, price_extra_large AS xl, is_active, category
-- FROM public.services
-- WHERE category IN ('Detail', 'Paint Correction')
-- ORDER BY category, price_small;

-- Should return exactly 6 active rows:
--   Detail: Exterior $120, Interior $150, Full $235, Ultimate $300
--   Paint Correction: 1 Step $449, 2 Step $675
