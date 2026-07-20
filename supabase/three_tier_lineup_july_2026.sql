-- ============================================================
-- ARISE & SHINE VT — 3-TIER LINEUP RESTRUCTURE
-- July 2026 · Basic / Refresh / Reset per foundation
--
-- SCOPE:
-- - Rename Ultimate Interior Reset → The Reset — Interior (+ reprice)
-- - Add "The Refresh — Interior" (basic + shampoo + salt + pet hair bundle)
-- - Add "The Refresh — Exterior" (basic + clay + headlight + engine bay)
-- - Add "The Refresh — Full" (Full + all interior + exterior refresh add-ons)
-- - Add "The Reset — Full" (Reset Interior + exterior wash + headlight + engine bay)
--
-- BASIC prices unchanged (Interior $150, Exterior $120, Full $235 sedan).
-- Display layer prepends "Basic" prefix — DB names stay stable so history,
-- loyalty, gift cards, coupons, and 132 code references keep working.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. REPRICE the flagship interior tier ──
-- Was $325/$360/$395 (per nudge_ultimate_prices). Now $395/$445/$495 to hit
-- market position for seats-out full-reset service.
--
-- DB name stays "Ultimate Interior Reset" — customer-facing display maps to
-- "The Reset — Interior" via lib/serviceDisplay.ts so booking history,
-- loyalty tables, gift cards, coupons, and 132+ code references keep working
-- untouched. Only the display label changed.
UPDATE public.services SET
  description = 'The full interior reset — front seats REMOVED for deep steam clean and shampoo of seats + carpet. Bundled: heavy pet hair extraction, salt stain removal + neutralization, leather conditioning (if applicable), clay bar paint decontamination. Steam clean every surface, vacuum every crack and crevice, disinfect and protect all surfaces, interior glass streak-free, rubber/carpet mats cleaned and protected, trunk fully included. Note: 100% removal of set-in stains, embedded debris, or permanent damage not guaranteed — but we do everything we can.',
  price_small = 395, price_medium = 395,
  price_large = 445, price_extra_large = 495,
  is_active = true, updated_at = NOW()
WHERE name = 'Ultimate Interior Reset';

-- ── 2. THE REFRESH — INTERIOR ──
-- Basic Interior ($150) + Shampoo ($95) + Salt ($65) + Pet Hair ($50) = $360 à la carte.
-- Refresh at $265 sedan = 26% savings. Sized-tier prices follow the ~$30 step.
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES (
  'The Refresh — Interior',
  'A deep interior clean that goes beyond basic. Everything in a Basic Interior Detail PLUS bundled Carpet & Upholstery Shampoo, Mild–Medium Salt Removal, and Heavy Pet Hair Extraction. Saves ~$95 vs à la carte. For cars that need more than a wipe-down but aren''t ready for the seats-out full reset.',
  265, 265, 295, 325,
  'Detail', false, true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_small = EXCLUDED.price_small,
  price_medium = EXCLUDED.price_medium,
  price_large = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category = EXCLUDED.category,
  is_subscription = EXCLUDED.is_subscription,
  is_active = true,
  updated_at = NOW();

-- ── 3. THE REFRESH — EXTERIOR ──
-- Basic Exterior ($120) + Clay ($50) + Headlight ($75) + Engine Bay ($65) = $310 à la carte.
-- Refresh Exterior at $245 sedan = 21% savings.
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES (
  'The Refresh — Exterior',
  'A deeper exterior detail with paint prep + headlight clarity + engine bay work bundled in. Everything in a Basic Exterior Detail PLUS Clay Bar paint decontamination, Headlight Restoration (pair), and Engine Bay Detail. Saves ~$65 vs à la carte. 1–3 month ceramic spray sealant still included.',
  245, 245, 275, 305,
  'Detail', false, true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_small = EXCLUDED.price_small,
  price_medium = EXCLUDED.price_medium,
  price_large = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category = EXCLUDED.category,
  is_subscription = EXCLUDED.is_subscription,
  is_active = true,
  updated_at = NOW();

-- ── 4. THE REFRESH — FULL ──
-- Basic Full ($235) + all interior refresh add-ons ($210) + all exterior refresh add-ons ($190) = $635 à la carte.
-- Refresh Full at $445 sedan = 30% savings.
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES (
  'The Refresh — Full',
  'Interior + Exterior refresh in one visit. Everything in a Basic Full Detail PLUS bundled Carpet & Upholstery Shampoo, Salt Removal, Pet Hair Extraction, Clay Bar, Headlight Restoration, and Engine Bay Detail. Saves ~$190 vs à la carte. Best-value tier for cars that need more than a wipe-down but not seats-out.',
  445, 445, 495, 545,
  'Detail', false, true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_small = EXCLUDED.price_small,
  price_medium = EXCLUDED.price_medium,
  price_large = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category = EXCLUDED.category,
  is_subscription = EXCLUDED.is_subscription,
  is_active = true,
  updated_at = NOW();

-- ── 5. THE RESET — FULL ──
-- Reset Interior ($395) + Basic Exterior ($120) + Headlight ($75) + Engine Bay ($65) = $655 à la carte.
-- Reset Full at $595 sedan = 9% savings vs à la carte, but avoids the double-charge of buying
-- separately. Sized to sit meaningfully above Refresh Full ($445 sedan → $595 = $150 gap).
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES (
  'The Reset — Full',
  'The flagship — everything in The Reset — Interior (seats REMOVED, shampoo, salt, pet hair, leather, clay bar, full disinfect) PLUS full exterior hand wash + wheels + tires + trim, 1–3 month ceramic sealant, Headlight Restoration, and Engine Bay Detail. Save ~$60 vs à la carte and avoid the double-visit hassle. 6–8 hours, one visit.',
  595, 595, 655, 715,
  'Detail', false, true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_small = EXCLUDED.price_small,
  price_medium = EXCLUDED.price_medium,
  price_large = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category = EXCLUDED.category,
  is_subscription = EXCLUDED.is_subscription,
  is_active = true,
  updated_at = NOW();

-- ── SANITY CHECK ──
-- SELECT name, price_small AS sedan, price_large AS suv, price_extra_large AS xl, is_active
-- FROM public.services
-- WHERE category = 'Detail'
-- ORDER BY price_small;
--
-- Expected result (sedan / suv / xl):
--  Basic Exterior Detail          120 / 135 / 150   (name still "Exterior Detail" in DB)
--  Basic Interior Detail          150 / 165 / 180   (name still "Interior Detail" in DB)
--  Basic Full Detail              235 / 260 / 285   (name still "Full Detail" in DB)
--  The Refresh — Exterior         245 / 275 / 305
--  The Refresh — Interior         265 / 295 / 325
--  The Reset — Interior           395 / 445 / 495
--  The Refresh — Full             445 / 495 / 545
--  The Reset — Full               595 / 655 / 715
