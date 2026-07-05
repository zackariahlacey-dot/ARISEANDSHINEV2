// Canonical add-on catalogue for admin (Quick Book + BookingVehiclesPanel).
// Mirrors the customer-facing list in lib/addonMeta.ts so prices stay in sync.
// July 2026 lineup — 8 basics + special + Premium Ceramic sections.
export type AdminAddon = { id: string; label: string; price: number };

export const ADMIN_ADDONS: AdminAddon[] = [
  // ── The 8 basics ──────────────────────────────────────────────────────
  { id: "engine_bay",         label: "Engine Bay Detail",              price: 65 },
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo",    price: 75 },
  { id: "salt_stain_removal", label: "Mild–Medium Salt Removal",       price: 65 },
  { id: "leather_condition",  label: "Leather Conditioning",           price: 40 },
  { id: "ozone_treatment",    label: "Ozone Treatment",                price: 60 },
  { id: "clay_bar",           label: "Clay Bar Treatment",             price: 50 },
  { id: "pet_hair",           label: "Heavy Pet Hair Removal",         price: 50 },
  { id: "headlight_restore",  label: "Headlight Restoration (pair)",   price: 75 },

  // ── Special add-ons ───────────────────────────────────────────────────
  { id: "ceramic_6_10_upgrade", label: "6–10 Month Ceramic Spray Upgrade", price: 45 },
  { id: "ultimate_ext_addon",   label: "+ Exterior Detail (Ultimate bundle, sedan)", price: 65 },

  // ── Premium Ceramic — section-by-section ──────────────────────────────
  { id: "premium_ceramic_hood",            label: "Premium Ceramic — Hood",              price: 85  },
  { id: "premium_ceramic_roof",            label: "Premium Ceramic — Roof",              price: 75  },
  { id: "premium_ceramic_trunk",           label: "Premium Ceramic — Trunk / Rear Hatch", price: 60 },
  { id: "premium_ceramic_front_bumper",    label: "Premium Ceramic — Front Bumper",      price: 65  },
  { id: "premium_ceramic_rear_bumper",     label: "Premium Ceramic — Rear Bumper",       price: 65  },
  { id: "premium_ceramic_doors",           label: "Premium Ceramic — All Doors",         price: 110 },
  { id: "premium_ceramic_fenders",         label: "Premium Ceramic — All Fenders",       price: 75  },
  { id: "premium_ceramic_mirrors",         label: "Premium Ceramic — Mirrors (pair)",    price: 30  },
  { id: "premium_ceramic_wheels",          label: "Premium Ceramic — Wheels + Calipers", price: 150 },
  { id: "premium_ceramic_windshield",      label: "Premium Ceramic — Windshield",        price: 95  },
  { id: "premium_ceramic_side_rear_glass", label: "Premium Ceramic — Side + Rear Glass", price: 175 },
  { id: "premium_ceramic_full_glass",      label: "Premium Ceramic — Full Glass",        price: 250 },
  { id: "premium_ceramic_full_body",       label: "Premium Ceramic — Full Body (sedan)", price: 650 },

  // ── Marine (unchanged — separate flow) ────────────────────────────────
  { id: "marine_isinglass",  label: "Isinglass & Vinyl Windows", price: 100 },
  { id: "marine_engine_bay", label: "Marine Engine Bay",         price: 150 },

  // ── RV (unchanged — separate flow) ────────────────────────────────────
  { id: "rv_awning",     label: "Awning Deep Clean",              price: 60 },
  { id: "rv_slide_seal", label: "Slide-Out Seal Conditioning",    price: 50 },
  { id: "rv_roof_coat",  label: "Rubber Roof Sealant Coat",       price: 80 },
  { id: "rv_generator",  label: "Generator Bay Detail",           price: 75 },
  { id: "rv_step",       label: "Entry Step & Threshold",         price: 30 },
];

/** Size-tiered base prices for add-ons where size matters. */
const ULTIMATE_EXT_ADDON_PRICES: Record<string, number> = {
  sedan: 65, medium: 65,
  suv: 80, large: 80,
  xl: 95, extra_large: 95,
};
const PREMIUM_CERAMIC_FULL_BODY_PRICES: Record<string, number> = {
  sedan: 650, medium: 650,
  suv: 775, large: 775,
  xl: 895, extra_large: 895,
};

/** Returns the effective price for an add-on given the vehicle size. */
export function getAddonPrice(id: string, vehicleSize: string): number {
  const a = ADMIN_ADDONS.find(x => x.id === id);
  if (!a) return 0;
  if (id === "ultimate_ext_addon")        return ULTIMATE_EXT_ADDON_PRICES[vehicleSize] ?? a.price;
  if (id === "premium_ceramic_full_body") return PREMIUM_CERAMIC_FULL_BODY_PRICES[vehicleSize] ?? a.price;
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
