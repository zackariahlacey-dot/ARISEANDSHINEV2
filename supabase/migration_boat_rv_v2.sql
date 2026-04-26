-- ============================================================
-- Boat & RV Service Pricing V2
-- Run in Supabase SQL editor
-- ============================================================

-- Rename boat services to simpler names + update prices
UPDATE services SET
  name        = 'Boat Interior',
  description = 'Deep clean of all interior surfaces — vinyl seats, carpet/flooring, dashboard, cup holders, storage compartments, and odor treatment. Priced per foot of boat length. No buffing or polishing.',
  price_small = 15, price_medium = 15, price_large = 15, price_extra_large = 15
WHERE name = 'Boat Interior Detail';

UPDATE services SET
  name        = 'Boat Exterior',
  description = 'Full hull wash, light oxidation removal, paste wax or ceramic spray sealant, and deck rinse & dry. Priced per foot. No buffing or polishing.',
  price_small = 20, price_medium = 20, price_large = 20, price_extra_large = 20
WHERE name = 'Boat Exterior Detail';

UPDATE services SET
  name        = 'Boat Full Detail',
  description = 'Complete interior + exterior detail — hull wash, oxidation removal, wax/sealant, interior vacuum, vinyl/upholstery clean & protect, metal polish, and bilge wipe. Priced per foot. No buffing or polishing.',
  price_small = 32, price_medium = 32, price_large = 32, price_extra_large = 32
WHERE name = 'Full Boat Detail';

-- Rename RV services + update prices
UPDATE services SET
  name        = 'RV Interior',
  description = 'Full interior detail for motorhomes and travel trailers — deep clean of all surfaces, upholstery, carpets, kitchen, bath, and fixtures. Priced per foot. No buffing or polishing.',
  price_small = 15, price_medium = 15, price_large = 15, price_extra_large = 15
WHERE name = 'RV Interior Detail';

UPDATE services SET
  name        = 'RV Exterior',
  description = 'Full exterior wash, clay bar treatment, and wax for the full exterior of your RV or motorhome. Includes awning tracks and wheel wells. Priced per foot. No buffing or polishing.',
  price_small = 12, price_medium = 12, price_large = 12, price_extra_large = 12
WHERE name = 'RV Exterior Detail';

UPDATE services SET
  description = 'Complete interior + exterior detail for RVs and motorhomes — full clean inside and out for a road-ready finish. Priced per foot. No buffing or polishing.',
  price_small = 25, price_medium = 25, price_large = 25, price_extra_large = 25
WHERE name = 'RV Full Detail';

-- Add new Showroom Package services
INSERT INTO services (name, description, price_small, price_medium, price_large, price_extra_large, is_subscription)
VALUES
  (
    'Boat Showroom Package',
    'Exterior detail + machine polish — full hull wash, heavy oxidation removal, and machine polishing for a showroom-quality finish. Includes ceramic or carnauba wax topcoat. Priced per foot.',
    55, 55, 55, 55, false
  ),
  (
    'RV Showroom 1-Step',
    'RV exterior + single-stage machine polish. Full exterior wash, clay bar, and 1-step paint enhancement for improved gloss and clarity. Priced per foot.',
    25, 25, 25, 25, false
  ),
  (
    'RV Showroom 2-Step',
    'RV exterior + two-stage machine polish. Full exterior wash, clay bar, cut stage for paint correction, and finish polish for maximum gloss. Priced per foot.',
    40, 40, 40, 40, false
  )
ON CONFLICT (name) DO NOTHING;

-- Add water_power column to bookings (if not already present)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS water_power TEXT;
