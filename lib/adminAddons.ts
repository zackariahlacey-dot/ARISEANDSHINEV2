// Canonical add-on catalogue for admin (Quick Book + BookingVehiclesPanel).
// Mirrors the customer-facing list in lib/addonMeta.ts so prices stay in sync.
// July 2026 lineup — 8 basics + special + Gentech 5-yr coatings.
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
  // (ceramic_6_10_upgrade retired July 2026 v4)
  // (Premium Ceramic 2-year sections retired July 2026 v5 — see Gentech below)
  { id: "ultimate_ext_addon",   label: "+ Exterior Detail (Ultimate bundle, sedan)", price: 65 },

  // ── 5-Year Gentech Graphene Ceramic — the 3 clean options (July 2026 v5) ──
  { id: "gentech_5yr_body",          label: "5-Yr Gentech — Body Coating (sedan)",                       price: 295 },
  { id: "gentech_5yr_body_wheels",   label: "5-Yr Gentech — Body + Wheels (sedan)",                      price: 395 },
  { id: "gentech_5yr_full_vehicle",  label: "5-Yr Gentech — Full Vehicle (Body + Wheels + Windows) (sedan)", price: 495 },

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
/** 5-Year Gentech — size-tiered pricing for the 3 clean options. */
const GENTECH_5YR_BODY_PRICES: Record<string, number> = {
  sedan: 295, medium: 295,
  suv: 375, large: 375,
  xl: 450, extra_large: 450,
};
const GENTECH_5YR_BODY_WHEELS_PRICES: Record<string, number> = {
  sedan: 395, medium: 395,
  suv: 475, large: 475,
  xl: 550, extra_large: 550,
};
const GENTECH_5YR_FULL_VEHICLE_PRICES: Record<string, number> = {
  sedan: 495, medium: 495,
  suv: 575, large: 575,
  xl: 650, extra_large: 650,
};

/** Returns the effective price for an add-on given the vehicle size. */
export function getAddonPrice(id: string, vehicleSize: string): number {
  const a = ADMIN_ADDONS.find(x => x.id === id);
  if (!a) return 0;
  if (id === "ultimate_ext_addon")        return ULTIMATE_EXT_ADDON_PRICES[vehicleSize] ?? a.price;
  if (id === "gentech_5yr_body")          return GENTECH_5YR_BODY_PRICES[vehicleSize] ?? a.price;
  if (id === "gentech_5yr_body_wheels")   return GENTECH_5YR_BODY_WHEELS_PRICES[vehicleSize] ?? a.price;
  if (id === "gentech_5yr_full_vehicle")  return GENTECH_5YR_FULL_VEHICLE_PRICES[vehicleSize] ?? a.price;
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
