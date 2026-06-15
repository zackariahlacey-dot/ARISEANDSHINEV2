// Canonical add-on catalogue used by admin Quick Book + BookingVehiclesPanel.
// Mirrors BookingModal's customer-facing list so prices stay in sync.
export type AdminAddon = { id: string; label: string; price: number };

export const ADMIN_ADDONS: AdminAddon[] = [
  // Vehicle — standard
  { id: "engine_bay",        label: "Engine Bay Detail",                     price: 50  },
  { id: "headlight_restore", label: "Headlight Restoration",                 price: 60  },
  { id: "odor_bomb",         label: "Strong Odor Elimination",               price: 75  },
  { id: "upholstery_shampoo",label: "Carpet & Upholstery Shampoo",           price: 75  },
  { id: "uv_interior",       label: "UV Protection & Interior Restoration",  price: 35  },
  { id: "leather_condition", label: "Leather Conditioning",                  price: 45  },
  { id: "clay_bar",          label: "Clay Bar Treatment",                    price: 50  },
  { id: "pet_hair",          label: "Heavy Pet Hair Removal",                price: 50  },
  { id: "tar_bug",           label: "Tar, Bug & Sap Removal",                price: 35  },
  // Build Your Package add-ons
  { id: "headliner_clean",   label: "Headliner Cleaning",                    price: 40  },
  { id: "salt_stain_removal",label: "Salt Stain Removal & Prevention",       price: 50  },
  { id: "steam_sanitation",  label: "Steam Sanitation (free at 3+ addons)",  price: 45  },
  { id: "seat_removal",      label: "Seat Removal — Deepest Clean",          price: 125 },
  { id: "trim_dressing",     label: "Rubber, Plastics & Vinyl Dressing",     price: 30  },
  { id: "mech_chem_decon",   label: "Mechanical & Chemical Decontamination", price: 85  },
  { id: "salt_recovery_addon", label: "Salt Recovery — Undercarriage Add-on", price: 85  },
  { id: "floor_1",           label: "Floorboard Shampoo – 1 Section",        price: 30  },
  { id: "floor_2",           label: "Floorboard Shampoo – 2 Sections",       price: 45  },
  { id: "floor_all",         label: "Floorboard Shampoo – All",              price: 60  },
  // Vehicle — ultimate upgrades
  { id: "polish_ceramic",    label: "1-Step Polish + 2-Year Ceramic",        price: 350 },
  { id: "ozone_treatment",   label: "Ozone Odor Elimination",                price: 75  },
  // 2-Year Graphene Window Coating (flat-priced, 3-tier)
  { id: "window_coat_windshield", label: "2-Year Graphene Window — Windshield",      price: 100 },
  { id: "window_coat_front",      label: "2-Year Graphene Window — Front 3 Windows", price: 150 },
  { id: "window_coat_all",        label: "2-Year Graphene Window — All Windows",     price: 250 },
  // 2-Year Pro Ceramic Sealant (size-tier priced; defaults to small tier)
  { id: "ceramic_3yr",            label: "2-Year Pro Ceramic Sealant",               price: 250 },
  // Wheel & Caliper Ceramic Coating (flat price)
  { id: "wheel_ceramic",          label: "Wheel & Caliper Ceramic Coating",          price: 125 },
  // Ultimate Interior add-on (flat — adds 3 hrs)
  { id: "ultimate_interior",      label: "Ultimate Interior Add-on (+3 hrs)",        price: 175 },
  // Marine
  { id: "marine_isinglass",  label: "Isinglass & Vinyl Windows",             price: 100 },
  { id: "marine_engine_bay", label: "Marine Engine Bay",                     price: 150 },
  // RV
  { id: "rv_awning",         label: "Awning Deep Clean",                     price: 60  },
  { id: "rv_slide_seal",     label: "Slide-Out Seal Conditioning",           price: 50  },
  { id: "rv_roof_coat",      label: "Rubber Roof Sealant Coat",              price: 80  },
  { id: "rv_generator",      label: "Generator Bay Detail",                  price: 75  },
  { id: "rv_step",           label: "Entry Step & Threshold",                price: 30  },
];

const CERAMIC_3YR_PRICES: Record<string, number> = { sedan: 300, suv: 350, xl: 400, medium: 300, large: 350, extra_large: 400 };

/** Returns the effective price for an add-on given the vehicle size. Handles
 *  the size-tier and flat-price special cases that customer-facing UI applies. */
export function getAddonPrice(id: string, vehicleSize: string): number {
  const a = ADMIN_ADDONS.find(x => x.id === id);
  if (!a) return 0;
  if (id === "window_coat_windshield") return 100;
  if (id === "window_coat_front")      return 150;
  if (id === "window_coat_all")        return 250;
  if (id === "ceramic_3yr")            return CERAMIC_3YR_PRICES[vehicleSize] ?? a.price;
  if (id === "upholstery_shampoo" && (vehicleSize === "xl" || vehicleSize === "extra_large")) return a.price + 20;
  return a.price;
}

/** Returns the base service price for a given service + DB size key. */
export function getServiceBasePrice(
  service: { price_small?: number | null; price_medium?: number | null; price_large?: number | null; price_extra_large?: number | null } | null | undefined,
  dbSize: "small" | "medium" | "large" | "extra_large",
): number {
  if (!service) return 0;
  const key = dbSize === "small" ? "price_small" : dbSize === "medium" ? "price_medium" : dbSize === "large" ? "price_large" : "price_extra_large";
  return Number((service as any)[key] ?? service.price_medium ?? 0) || 0;
}
