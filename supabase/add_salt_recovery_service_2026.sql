-- ============================================================
-- Salt Season Recovery — Vermont Detailing (May 2026)
-- New standalone service for winter salt removal & protection.
-- Vermont-specific service positioned to capture Nov–Apr repeat bookings.
-- Run this in the Supabase SQL editor.
-- ============================================================

INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES (
  'Salt Season Recovery',
  'Vermont winter survival package. Undercarriage rinse to flush road salt, door jamb deep clean, calcium & salt neutralization treatment, tire dressing, and a 3-month ceramic spray sealant for paint protection. Quick 1.5 hr service — book monthly Nov–Apr to protect your investment.',
  135, 135, 135, 135,
  'Vehicle',
  false,
  true
)
ON CONFLICT DO NOTHING;
