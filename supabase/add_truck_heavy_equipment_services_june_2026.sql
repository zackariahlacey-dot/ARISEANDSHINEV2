-- ============================================================
-- Semi Truck + Heavy Equipment Services
-- Arise And Shine Detailing (June 2026)
--
-- Adds 11 new services (semi truck exterior x5, interior x2,
-- full detail x2, heavy equipment cab interior x1, hourly x1)
-- and tags each with category so booking flow filtering can
-- separate them from auto / boat / RV categories.
--
-- Idempotent — safe to run multiple times. Uses ON CONFLICT
-- on the unique service name index. Soft-deactivates any prior
-- placeholder rows with the same name before inserting.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ── 1. Semi Truck — Exterior tier ─────────────────────────────
INSERT INTO public.services (name, description, price_small, price_medium, price_large, price_extra_large, category, is_subscription, is_active)
VALUES
  (
    'Truck Yard Wash',
    'Quick day-cab maintenance wash — soap, rinse, dry, wheel wells. Between-load fast turn for owner-operators and yard prep. From $99.',
    99, 99, 99, 99, 'Truck', false, true
  ),
  (
    'Truck Exterior Refresh — Day Cab',
    'Full day-cab exterior wash with detailed wheel + chrome + fuel-tank polish. Bug splatter and brake-dust removed. From $149.',
    149, 149, 149, 149, 'Truck', false, true
  ),
  (
    'Truck Exterior Refresh — Sleeper',
    'Full sleeper-cab exterior wash with detailed wheel + chrome + fuel-tank polish + sleeper-roof rinse. From $199.',
    199, 199, 199, 199, 'Truck', false, true
  ),
  (
    'Premium Exterior Detail — Day Cab',
    'Day-cab full exterior detail — decon wash, clay-bar where applicable, hand wax/sealant, chrome and aluminum polish, headlight restoration option. From $299.',
    299, 299, 299, 299, 'Truck', false, true
  ),
  (
    'Premium Exterior Detail — Sleeper',
    'Sleeper-cab full exterior detail — decon wash, clay-bar where applicable, hand wax/sealant, chrome and aluminum polish across cab and sleeper, fairings and exhaust polished. From $379.',
    379, 379, 379, 379, 'Truck', false, true
  ),

  -- ── 2. Semi Truck — Interior tier ──────────────────────────
  (
    'Day Cab Interior Reset',
    'Full day-cab interior — vacuum, wipe-down of every surface, dash/console/gauges treated, floor mats steam shampoo, glass inside-out. From $199.',
    199, 199, 199, 199, 'Truck', false, true
  ),
  (
    'Sleeper Cab Interior Reset',
    'Full sleeper-cab interior reset — every surface in the cab and sleeper, bunk area deep clean, storage spaces, fridge wipe, full upholstery treatment. From $299.',
    299, 299, 299, 299, 'Truck', false, true
  ),

  -- ── 3. Semi Truck — Full Detail (Int + Ext) ────────────────
  (
    'Day Cab Complete',
    'Best-value day-cab package — Premium Exterior Detail + Day Cab Interior Reset bundled. Saves vs booking separately. From $449.',
    449, 449, 449, 449, 'Truck', false, true
  ),
  (
    'Sleeper Cab Complete',
    'Best-value sleeper-cab package — Premium Exterior Detail + Sleeper Cab Interior Reset bundled. Saves vs booking separately. From $649.',
    649, 649, 649, 649, 'Truck', false, true
  ),

  -- ── 4. Heavy Equipment — Cab Interior ──────────────────────
  (
    'Equipment Cab Reset',
    'Heavy equipment cab interior — excavator, dozer, loader, skid steer, tractor, log truck, dump truck. Full interior reset, glass clarity, dash and switch panels treated. From $175.',
    175, 175, 175, 175, 'Heavy Equipment', false, true
  ),
  (
    'Equipment Hourly Service',
    'On-site hourly service for heavy equipment — $95/hr, 2-hour minimum. Best for biohazard cleanup, extreme grime, multi-cab fleet days, or jobs where scope is hard to predict.',
    190, 190, 190, 190, 'Heavy Equipment', false, true
  )
ON CONFLICT (name) DO UPDATE SET
  description       = EXCLUDED.description,
  price_small       = EXCLUDED.price_small,
  price_medium      = EXCLUDED.price_medium,
  price_large       = EXCLUDED.price_large,
  price_extra_large = EXCLUDED.price_extra_large,
  category          = EXCLUDED.category,
  is_active         = true,
  updated_at        = NOW();

-- ── Sanity check (uncomment to confirm after running) ──
-- SELECT name, category, price_small, is_active
--   FROM public.services
--  WHERE category IN ('Truck', 'Heavy Equipment')
--  ORDER BY category, name;
