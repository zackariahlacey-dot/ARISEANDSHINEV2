-- ============================================================
-- ROLLBACK: New Service Lineup July 2026
-- Vermont Detailing / Arise & Shine VT
--
-- Undoes new_service_lineup_july_2026.sql:
--  - Restores the June 2026 lineup (previous "current" state)
--  - Reactivates the Ultimate Interior + Exterior Reset combo SKU
--  - Restores Paint Correction "Ultimate Exterior + N-Step" naming/pricing
--  - Reactivates retired add-on override rows are NOT restored — the
--    override table doesn't hold retired ones anyway (base prices in
--    lib/addonMeta.ts apply when no override exists).
--
-- HOW TO USE:
--   1. Take a Supabase snapshot first (Settings → Database → Backups → Snapshot).
--   2. Run this file in the Supabase SQL Editor.
--   3. Redeploy the codebase from the git commit BEFORE the migration was applied
--      (git revert <commit-hash> or git checkout <old-hash> — code needs to
--      match the old lineup for the UI to render correctly).
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Restore BASE PACKAGES to June 2026 prices ──
-- Interior Detail (May 2026 pricing)
UPDATE public.services
SET
  price_small       = 150,
  price_medium      = 160,
  price_large       = 175,
  price_extra_large = 185,
  updated_at        = NOW()
WHERE name = 'Interior Detail';

-- Exterior Detail (May 2026 pricing — no included ceramic)
UPDATE public.services
SET
  description       = 'Exterior hand wash + dry, wheels + tires cleaned, plastic trim restoration, exterior glass.',
  price_small       = 130,
  price_medium      = 140,
  price_large       = 155,
  price_extra_large = 170,
  updated_at        = NOW()
WHERE name = 'Exterior Detail';

-- Full Detail (May 2026 pricing — no included ceramic)
UPDATE public.services
SET
  description       = 'Complete interior + exterior detail — full interior clean plus full exterior wash, wheels/tires, and trim.',
  price_small       = 240,
  price_medium      = 255,
  price_large       = 270,
  price_extra_large = 280,
  updated_at        = NOW()
WHERE name = 'Full Detail';

-- Ultimate Interior Reset (May 2026 pricing)
UPDATE public.services
SET
  description       = 'Premium interior reset — deep steam clean, full vacuum, disinfect and protect all surfaces, leather conditioning, trunk.',
  price_small       = 240,
  price_medium      = 250,
  price_large       = 260,
  price_extra_large = 270,
  updated_at        = NOW()
WHERE name = 'Ultimate Interior Reset';

-- ── 2. REACTIVATE the old Ultimate combo SKU ──
UPDATE public.services
SET
  is_active         = true,
  price_small       = 335,
  price_medium      = 335,
  price_large       = 355,
  price_extra_large = 375,
  updated_at        = NOW()
WHERE name = 'Ultimate Interior + Exterior Reset';

-- ── 3. Restore Paint Correction naming + pricing ──
UPDATE public.services
SET
  name              = 'Ultimate Exterior + 1-Step Paint Correction',
  description       = 'Ultimate Exterior detail + single-pass machine polish that removes 60–75% of light swirl marks, oxidation and water spots.',
  price_small       = 350,
  price_medium      = 425,
  price_large       = 500,
  price_extra_large = 675,
  is_active         = true,
  updated_at        = NOW()
WHERE name = 'Paint Correction — 1 Step';

UPDATE public.services
SET
  name              = 'Ultimate Exterior + 2-Step Paint Correction',
  description       = 'Ultimate Exterior detail + two-stage compound and finishing polish that removes 85–95% of correctable defects.',
  price_small       = 550,
  price_medium      = 650,
  price_large       = 800,
  price_extra_large = 950,
  is_active         = true,
  updated_at        = NOW()
WHERE name = 'Paint Correction — 2 Step';

-- ── 4. Category cleanup ──
UPDATE public.services
SET category = NULL
WHERE name IN (
  'Ultimate Exterior + 1-Step Paint Correction',
  'Ultimate Exterior + 2-Step Paint Correction'
);

-- ── 5. Sanity check (uncomment to verify) ──
-- SELECT name, price_small, price_medium, price_large, price_extra_large, is_active
-- FROM public.services
-- WHERE is_active = true
-- ORDER BY name;

-- NOTE: Retired add-ons (seat removal, ceramic tiers, window coatings, etc.)
-- will reappear automatically once code is reverted — their base prices live
-- in lib/addonMeta.ts, not the DB.
