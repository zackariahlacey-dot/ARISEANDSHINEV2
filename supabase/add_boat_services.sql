-- Boat detailing services (price columns store $/ft rate, all sizes same)
INSERT INTO services (name, description, price_small, price_medium, price_large, price_extra_large, is_subscription)
VALUES
  (
    'Boat Interior Detail',
    'Deep clean of interior surfaces — vinyl seats, carpet/flooring, dashboard wipe, cup holders, storage compartments, and odor treatment. Priced per foot of boat length.',
    18, 18, 18, 18, false
  ),
  (
    'Boat Exterior Detail',
    'Full hull wash, light oxidation removal, paste wax or ceramic spray sealant, and deck rinse & dry. Priced per foot of boat length.',
    20, 20, 20, 20, false
  ),
  (
    'Full Boat Detail',
    'Everything in Boat Interior + Exterior Detail — hull wash, oxidation removal, wax/sealant, interior vacuum, vinyl/upholstery clean & protect, metal polish, and bilge wipe. Priced per foot of boat length.',
    32, 32, 32, 32, false
  )
ON CONFLICT (name) DO NOTHING;
