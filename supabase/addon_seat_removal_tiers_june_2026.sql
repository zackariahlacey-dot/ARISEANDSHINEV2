-- ============================================================
-- Add-on Update — Seat Removal Tiered + Price Updates
-- Vermont Detailing (June 2026)
--
-- 1. Removes any stale override row for the deprecated `seat_removal`
--    SKU (it's been split into 6 tiered SKUs below).
-- 2. Removes stale overrides for engine_bay / headlight_restore / pet_hair
--    so the new hard-coded base prices ($85 / $65 / $75) take effect
--    without manual override removal in the admin UI. If an admin had
--    customized any of these, they can re-add the override post-deploy.
--
-- The new seat removal SKUs:
--   seat_removal_driver      $60
--   seat_removal_passenger   $60
--   seat_removal_rear        $85
--   seat_removal_3rd_row     $95
--   seat_removal_all_2row   $150  (saves $55 vs individual)
--   seat_removal_all_3row   $225  (saves $75 vs individual)
--
-- All seat-removal SKUs are EXCLUDED from the basic bundle discount math
-- (specialty face-value pricing — savings baked into the bundle prices).
--
-- New basic bundle discount: 2 add-ons → 10%, 3+ add-ons → 15%.
-- ============================================================

-- ── Clean up stale overrides for SKUs whose base prices changed ──
DELETE FROM public.addon_pricing_overrides
WHERE addon_id IN (
  'seat_removal',         -- old flat $125 SKU — split into 6 tiered SKUs
  'engine_bay',           -- $50 → $85
  'headlight_restore',    -- $60 → $65
  'pet_hair'              -- $50 → $75
);

-- ── No INSERTs needed: the new SKUs use hard-coded base values from
--    lib/addonMeta.ts. The override table layers ON TOP of those defaults;
--    when no row exists, the source default applies. Admin can add
--    overrides post-deploy if needed via /admin/pricing.

-- Sanity check (uncomment to run after migration):
-- SELECT addon_id, size, price_cents, duration_mins
-- FROM public.addon_pricing_overrides
-- ORDER BY addon_id, size;
