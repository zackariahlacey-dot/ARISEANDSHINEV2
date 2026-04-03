-- RV Detailing services
-- Pricing stored as per-foot rates (same value across all size columns)
-- Min 20 ft for RVs; rates: Exterior $22/ft, Interior $20/ft, Full $38/ft

INSERT INTO services (name, description, price_small, price_medium, price_large, price_extra_large, is_subscription)
VALUES
  (
    'RV Interior Detail',
    'Full interior detail for motorhomes and travel trailers. Deep clean of all surfaces, upholstery, carpets, and fixtures throughout the living quarters.',
    20, 20, 20, 20, false
  ),
  (
    'RV Exterior Detail',
    'Hand wash, clay bar treatment, and wax for the full exterior of your RV or motorhome. Includes awning tracks and wheel wells.',
    22, 22, 22, 22, false
  ),
  (
    'RV Full Detail',
    'Complete interior + exterior detail package for RVs and motorhomes. Everything in both packages combined for a showroom-ready finish.',
    38, 38, 38, 38, false
  )
ON CONFLICT (name) DO NOTHING;
