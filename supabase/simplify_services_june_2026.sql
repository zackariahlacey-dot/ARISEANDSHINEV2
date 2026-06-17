-- ============================================================
-- Service Simplification — Drop Paint Correction + Salt Recovery
-- Unify Boat/RV naming + Update pricing
-- Vermont Detailing (June 2026)
--
-- Run this in the Supabase SQL Editor.
-- Idempotent — safe to run multiple times.
-- Historical bookings keep their service_name (snapshotted at booking time).
-- ============================================================

-- ── 1. Deactivate dropped services (soft delete preserves history) ──
UPDATE public.services SET is_active = false
WHERE name IN (
  -- Paint Correction (auto)
  'Ultimate Exterior + 1-Step Paint Correction',
  'Ultimate Exterior + 2-Step Paint Correction',
  'Single-Stage Paint Enhancement',
  'Two-Stage Paint Correction',
  -- Salt Season Recovery
  'Salt Season Recovery',
  -- Boat / RV Paint Correction equivalents
  'Boat Showroom Package',
  'RV Showroom 1-Step',
  'RV Showroom 2-Step',
  'RV Oxidation Restoration',
  -- Legacy long-form RV names (consolidating to short form)
  'RV Exterior Refresh',
  'RV Living Space Reset',
  'RV Ultimate Transformation'
);

-- ── 2. Upsert canonical Boat services with new pricing ──
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES
  ('Boat Interior',
   'Deep clean of all interior surfaces — vinyl seats, carpets, dashboard, cup holders, storage compartments, glass clarity, and odor treatment. Per-foot pricing, 15ft minimum. No buffing or polishing.',
   15, 15, 15, 15, 'Boat', false, true),
  ('Boat Exterior',
   'Hand wash, hand-applied light oxidation removal, paste wax or ceramic spray sealant, and full deck rinse with metal/chrome polish. Per-foot pricing, 15ft minimum. No machine polishing.',
   16, 16, 16, 16, 'Boat', false, true),
  ('Boat Full Detail',
   'Complete interior + exterior detail — hull wash, hand-applied oxidation removal, wax/sealant, full interior vacuum, vinyl & upholstery clean and protect, metal/chrome polish, and bilge wipe. Per-foot pricing, 15ft minimum. No machine polishing.',
   28, 28, 28, 28, 'Boat', false, true)
ON CONFLICT (name) DO UPDATE SET
  description       = EXCLUDED.description,
  price_small       = EXCLUDED.price_small,
  price_medium      = EXCLUDED.price_medium,
  price_large       = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category          = EXCLUDED.category,
  is_active         = true,
  updated_at        = NOW();

-- ── 3. Upsert canonical RV services with new pricing ──
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES
  ('RV Exterior',
   'Full RV/motorhome exterior — foam bath and hand wash, roof rinse with seal inspection, bug removal, wheel & tire dressing, streak-free glass, and 6-month ceramic spray sealant. Per-foot pricing, 20ft minimum. No machine polishing.',
   15, 15, 15, 15, 'RV', false, true),
  ('RV Interior',
   'Full RV/motorhome interior reset — kitchen and bathroom deep clean, dinette upholstery steam clean, full living-space vacuum, UV protection on dash and trim, cabinet wipe-down, AC vents, and full debris removal. Per-foot pricing, 20ft minimum.',
   25, 25, 25, 25, 'RV', false, true),
  ('RV Full Detail',
   'Complete interior + exterior RV detail — full exterior wash and seal plus full interior reset, awning service (clean underside & top), storage bay degrease and vacuum, and metal polishing on ladders, handles, and trim. Per-foot pricing, 20ft minimum.',
   38, 38, 38, 38, 'RV', false, true)
ON CONFLICT (name) DO UPDATE SET
  description       = EXCLUDED.description,
  price_small       = EXCLUDED.price_small,
  price_medium      = EXCLUDED.price_medium,
  price_large       = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category          = EXCLUDED.category,
  is_active         = true,
  updated_at        = NOW();

-- ── 4. Sanity check: list active services ──
-- SELECT name, price_small, is_active FROM public.services WHERE is_active = true ORDER BY category, name;
